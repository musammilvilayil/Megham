import { NextResponse } from "next/server";
import { isObjectId, serializeFile } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { purgeFile } from "@/lib/purge";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";
import { Folder } from "@/models/Folder";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!isObjectId(id)) return NextResponse.json({ error: "File not found." }, { status: 404 });
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
      case "move": {
        if (body.folder === null || body.folder === "root") {
          file.folder = null;
        } else if (isObjectId(body.folder) && (await Folder.exists({ _id: body.folder, owner: userId }))) {
          file.folder = body.folder;
        } else {
          return NextResponse.json({ error: "Folder not found." }, { status: 404 });
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    await file.save();
    return NextResponse.json({ file: serializeFile(file.toObject(), userId) });
  } catch {
    return NextResponse.json({ error: "Could not update file." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!isObjectId(id)) return NextResponse.json({ error: "File not found." }, { status: 404 });
    await connectMongo();
    const file = await CloudFile.findOne({ _id: id, owner: userId });
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
    if (!file.deletedAt) {
      return NextResponse.json(
        { error: "Move the file to trash before deleting it permanently." },
        { status: 409 },
      );
    }
    await purgeFile(file);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not permanently delete file." }, { status: 500 });
  }
}
