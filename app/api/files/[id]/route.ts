import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await request.json();
    await connectMongo();

    const file = await CloudFile.findOne({ _id: id, owner: userId });
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

    switch (body.action) {
      case "star":
        file.starred = typeof body.value === "boolean" ? body.value : !file.starred;
        break;
      case "trash":
        file.deletedAt = new Date();
        break;
      case "restore":
        file.deletedAt = null;
        break;
      case "rename": {
        const name = String(body.name ?? "").trim();
        if (!name || name.length > 255) {
          return NextResponse.json({ error: "Enter a valid file name." }, { status: 400 });
        }
        file.name = name;
        break;
      }
      case "share":
        file.shared = typeof body.value === "boolean" ? body.value : !file.shared;
        break;
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    await file.save();
    return NextResponse.json({ file });
  } catch {
    return NextResponse.json({ error: "Could not update file." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    await connectMongo();
    const file = await CloudFile.findOne({ _id: id, owner: userId });
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
    if (!file.deletedAt) {
      return NextResponse.json(
        { error: "Move the file to trash before deleting it permanently." },
        { status: 409 },
      );
    }

    await cloudinary.uploader.destroy(file.publicId, {
      resource_type: file.resourceType === "video" ? "video" : "image",
      invalidate: true,
    });
    await file.deleteOne();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not permanently delete file." }, { status: 500 });
  }
}
