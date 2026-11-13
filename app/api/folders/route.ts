import { NextResponse } from "next/server";
import { isObjectId } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { Folder } from "@/models/Folder";

const MAX_FOLDERS = 500;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();
  const folders = await Folder.find({ owner: userId }).sort({ name: 1 }).lean();
  return NextResponse.json({
    folders: folders.map((f) => ({ id: String(f._id), name: f.name, parent: f.parent ? String(f.parent) : null })),
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 120) return NextResponse.json({ error: "Enter a folder name." }, { status: 400 });
  await connectMongo();
  let parent: string | null = null;
  if (body.parent && body.parent !== "root") {
    if (!isObjectId(body.parent) || !(await Folder.exists({ _id: body.parent, owner: userId }))) {
      return NextResponse.json({ error: "Parent folder not found." }, { status: 404 });
    }
    parent = body.parent;
  }
  if ((await Folder.countDocuments({ owner: userId })) >= MAX_FOLDERS) {
    return NextResponse.json({ error: "Folder limit reached." }, { status: 409 });
  }
  const folder = await Folder.create({ owner: userId, name, parent });
  return NextResponse.json({ folder: { id: String(folder._id), name: folder.name, parent } }, { status: 201 });
}
