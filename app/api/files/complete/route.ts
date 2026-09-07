import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_RESOURCE_TYPES = new Set(["image", "video", "raw"]);

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const publicId = String(body.publicId ?? "");
    const url = String(body.url ?? "");
    const resourceType = String(body.resourceType ?? "");

    if (!name || name.length > 255 || !publicId || !url || !Number.isFinite(body.bytes)) {
      return NextResponse.json({ error: "Invalid upload metadata." }, { status: 400 });
    }
    if (body.bytes <= 0 || body.bytes > MAX_BYTES) {
      return NextResponse.json({ error: "Maximum upload size is 25 MB." }, { status: 413 });
    }
    if (!publicId.startsWith(`megham/${userId}/`)) {
      return NextResponse.json({ error: "Invalid upload owner." }, { status: 403 });
    }
    if (!url.startsWith("https://res.cloudinary.com/") || !ALLOWED_RESOURCE_TYPES.has(resourceType)) {
      return NextResponse.json({ error: "Invalid Cloudinary metadata." }, { status: 400 });
    }

    await connectMongo();
    const saved = await CloudFile.create({
      owner: userId,
      name,
      publicId,
      url,
      resourceType,
      format: body.format ? String(body.format) : undefined,
      bytes: body.bytes,
    });
    return NextResponse.json({ file: saved }, { status: 201 });
  } catch (error) {
    console.error("MEGHAM metadata save failed", error);
    return NextResponse.json({ error: "Could not save file details." }, { status: 500 });
  }
}
