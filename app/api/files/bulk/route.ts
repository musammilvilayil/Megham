import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { isObjectId } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { purgeFile } from "@/lib/purge";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";
import { Folder } from "@/models/Folder";

const MAX_IDS = 100;

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0 || ids.length > MAX_IDS || !ids.every(isObjectId)) {
      return NextResponse.json({ error: `Select between 1 and ${MAX_IDS} files.` }, { status: 400 });
    }
    await connectMongo();
    const scope = { _id: { $in: ids.map((id) => new Types.ObjectId(id as string)) }, owner: userId };

    switch (body.action) {
      case "trash":
        await CloudFile.updateMany({ ...scope, deletedAt: null }, { deletedAt: new Date() });
        break;
      case "restore":
        await CloudFile.updateMany(scope, { deletedAt: null });
        break;
      case "star":
        await CloudFile.updateMany(scope, { starred: true });
        break;
      case "unstar":
        await CloudFile.updateMany(scope, { starred: false });
        break;
      case "move": {
        let folder: string | null = null;
        if (body.folder && body.folder !== "root") {
          if (!isObjectId(body.folder) || !(await Folder.exists({ _id: body.folder, owner: userId }))) {
            return NextResponse.json({ error: "Folder not found." }, { status: 404 });
          }
          folder = body.folder;
        }
        await CloudFile.updateMany(scope, { folder });
        break;
      }
      case "delete": {
        // Permanent deletion only applies to files already in the trash.
        const files = await CloudFile.find({ ...scope, deletedAt: { $ne: null } });
        let failed = 0;
        for (const file of files) {
          try {
            await purgeFile(file);
          } catch (error) {
            failed += 1;
            console.error("MEGHAM bulk delete failed", file.publicId, error);
          }
        }
        if (failed) return NextResponse.json({ error: `${failed} file(s) could not be deleted.` }, { status: 502 });
        break;
      }
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MEGHAM bulk action failed", error);
    return NextResponse.json({ error: "Could not update files." }, { status: 500 });
  }
}
