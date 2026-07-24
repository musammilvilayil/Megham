import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();
  const files = await CloudFile.find({ owner: userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Maximum upload size is 25 MB." }, { status: 413 });
    }
    const dataUri = `data:${file.type || "application/octet-stream"};base64,${Buffer.from(
      await file.arrayBuffer(),
    ).toString("base64")}`;
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: `megham/${userId}`,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
    });
    await connectMongo();
    const saved = await CloudFile.create({
      owner: userId,
      name: file.name,
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      resourceType: uploaded.resource_type,
      format: uploaded.format,
      bytes: uploaded.bytes,
    });
    return NextResponse.json({ file: saved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
