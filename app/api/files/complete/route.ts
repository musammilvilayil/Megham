import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (
      !body.name ||
      !body.publicId ||
      !body.url ||
      !body.resourceType ||
      !Number.isFinite(body.bytes)
    ) {
      return NextResponse.json({ error: "Invalid upload metadata." }, { status: 400 });
    }
    if (!String(body.publicId).startsWith(`megham/${userId}/`)) {
      return NextResponse.json({ error: "Invalid upload owner." }, { status: 403 });
    }

    await connectMongo();
    const saved = await CloudFile.create({
      owner: userId,
      name: String(body.name).slice(0, 255),
      publicId: body.publicId,
      url: body.url,
      resourceType: body.resourceType,
      format: body.format,
      bytes: body.bytes,
    });
    return NextResponse.json({ file: saved }, { status: 201 });
  } catch (error) {
    console.error("MEGHAM metadata save failed", error);
    return NextResponse.json({ error: "Could not save file details." }, { status: 500 });
  }
}
