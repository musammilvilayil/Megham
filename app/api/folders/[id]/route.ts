import { NextResponse } from "next/server";
import { isObjectId } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";
import { Folder } from "@/models/Folder";

type RouteContext = { params: Promise<{ id: string }> };

async function load(context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await context.params;
  if (!isObjectId(id)) return { error: NextResponse.json({ error: "Folder not found." }, { status: 404 }) };
  await connectMongo();
  const folder = await Folder.findOne({ _id: id, owner: userId });
  if (!folder) return { error: NextResponse.json({ error: "Folder not found." }, { status: 404 }) };
  return { folder, userId };
}

// Rename and/or move a folder. Moving into itself or a descendant is rejected.
export async function PATCH(request: Request, context: RouteContext) {
  const result = await load(context);
  if (result.error) return result.error;
  const { folder, userId } = result;
  const body = await request.json().catch(() => ({}));

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 120) return NextResponse.json({ error: "Enter a folder name." }, { status: 400 });
    folder.name = name;
  }
  if (body.parent !== undefined) {
    if (body.parent === null || body.parent === "root") {
      folder.parent = null;
    } else {
      if (!isObjectId(body.parent) || !(await Folder.exists({ _id: body.parent, owner: userId }))) {
        return NextResponse.json({ error: "Parent folder not found." }, { status: 404 });
      }
      let cursor: string | null = body.parent;
      for (let depth = 0; cursor && depth < 100; depth += 1) {
        if (cursor === String(folder._id)) {
          return NextResponse.json({ error: "A folder cannot be moved inside itself." }, { status: 400 });
        }
        const next: { parent?: unknown } | null = await Folder.findById(cursor).select("parent").lean();
        cursor = next?.parent ? String(next.parent) : null;
      }
      folder.parent = body.parent;
    }
  }
  await folder.save();
  return NextResponse.json({
    folder: { id: String(folder._id), name: folder.name, parent: folder.parent ? String(folder.parent) : null },
  });
}

// Deleting a folder keeps its contents: files and subfolders move up one level.
export async function DELETE(_request: Request, context: RouteContext) {
  const result = await load(context);
  if (result.error) return result.error;
  const { folder } = result;
  await Promise.all([
    CloudFile.updateMany({ folder: folder._id }, { folder: folder.parent ?? null }),
    Folder.updateMany({ parent: folder._id }, { parent: folder.parent ?? null }),
  ]);
  await folder.deleteOne();
  return NextResponse.json({ ok: true });
}
