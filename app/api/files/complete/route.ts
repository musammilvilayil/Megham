import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { destroyAsset, isObjectId, MAX_BYTES, quotaBytes, serializeFile } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { storageUsed } from "@/lib/usage";
import { CloudFile } from "@/models/CloudFile";
import { Folder } from "@/models/Folder";

const ALLOWED_RESOURCE_TYPES = ["image", "video", "raw"] as const;
type ResourceType = (typeof ALLOWED_RESOURCE_TYPES)[number];

/**
 * Registers a file the browser uploaded straight to Cloudinary. The size, URL and
 * type are read back from Cloudinary rather than trusted from the client, so an
 * oversized or foreign asset is rejected and removed.
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const publicId = String(body.publicId ?? "");
    const resourceType = String(body.resourceType ?? "") as ResourceType;

    if (!name || name.length > 255 || !publicId) {
      return NextResponse.json({ error: "Invalid upload metadata." }, { status: 400 });
    }
    if (!publicId.startsWith(`megham/${userId}/`) || publicId.includes("..")) {
      return NextResponse.json({ error: "Invalid upload owner." }, { status: 403 });
    }
    if (!ALLOWED_RESOURCE_TYPES.includes(resourceType)) {
      return NextResponse.json({ error: "Invalid Cloudinary metadata." }, { status: 400 });
    }

    await connectMongo();
    if (await CloudFile.exists({ publicId })) {
      return NextResponse.json({ error: "This upload was already saved." }, { status: 409 });
    }

    let asset: { bytes: number; secure_url: string; format?: string };
    try {
      asset = await cloudinary.api.resource(publicId, { resource_type: resourceType, type: "authenticated" });
    } catch {
      return NextResponse.json({ error: "Upload not found in storage." }, { status: 400 });
    }
    const stored = { name, publicId, url: asset.secure_url, resourceType, deliveryType: "authenticated" as const };

    if (asset.bytes <= 0 || asset.bytes > MAX_BYTES) {
      await destroyAsset(stored).catch(() => undefined);
      return NextResponse.json({ error: "Maximum upload size is 25 MB." }, { status: 413 });
    }
    const used = await storageUsed(userId);
    if (used.bytes + asset.bytes > quotaBytes()) {
      await destroyAsset(stored).catch(() => undefined);
      return NextResponse.json({ error: "Storage quota exceeded." }, { status: 413 });
    }

    let folder: string | null = null;
    if (body.folder) {
      if (!isObjectId(body.folder) || !(await Folder.exists({ _id: body.folder, owner: userId }))) {
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      }
      folder = body.folder;
    }

    const saved = await CloudFile.create({
      owner: userId,
      name,
      publicId,
      url: asset.secure_url,
      resourceType,
      deliveryType: "authenticated",
      format: asset.format,
      bytes: asset.bytes,
      folder,
    });
    return NextResponse.json({ file: serializeFile(saved.toObject(), userId) }, { status: 201 });
  } catch (error) {
    console.error("MEGHAM metadata save failed", error);
    return NextResponse.json({ error: "Could not save file details." }, { status: 500 });
  }
}
