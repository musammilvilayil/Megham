import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { isObjectId, serializeFile } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VIEWS = ["all", "recent", "starred", "shared", "shared-with-me", "trash"] as const;

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const view = params.get("view") ?? "all";
  if (!VIEWS.includes(view as (typeof VIEWS)[number])) {
    return NextResponse.json({ error: "Unknown view." }, { status: 400 });
  }
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 50));
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const cursor = params.get("cursor");
  const folderParam = params.get("folder");

  await connectMongo();
  const owner = new Types.ObjectId(userId);
  const filter: Record<string, unknown> =
    view === "shared-with-me"
      ? { sharedWith: owner, deletedAt: null }
      : view === "trash"
        ? { owner, deletedAt: { $ne: null } }
        : { owner, deletedAt: null };
  if (view === "starred") filter.starred = true;
  if (view === "shared") filter.shared = true;
  if (query) filter.name = { $regex: escapeRegex(query), $options: "i" };
  if (view === "all" && !query) {
    if (folderParam && folderParam !== "root") {
      if (!isObjectId(folderParam)) return NextResponse.json({ error: "Invalid folder." }, { status: 400 });
      filter.folder = new Types.ObjectId(folderParam);
    } else {
      filter.folder = null;
    }
  }
  if (cursor) {
    if (!isObjectId(cursor)) return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
    filter._id = { $lt: new Types.ObjectId(cursor) };
  }

  const docs = await CloudFile.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  return NextResponse.json({
    files: page.map((doc) => serializeFile(doc, userId)),
    nextCursor: hasMore ? String(page[page.length - 1]._id) : null,
  });
}

