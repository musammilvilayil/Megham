import { NextResponse } from "next/server";
import { isObjectId, streamFile } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";

type RouteContext = { params: Promise<{ id: string }> };

// Owners and invited recipients can read a file; `?inline=1` renders safe media types in the browser.
export async function GET(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!isObjectId(id)) return NextResponse.json({ error: "File not found." }, { status: 404 });
  await connectMongo();
  const file = await CloudFile.findOne({
    _id: id,
    $or: [{ owner: userId }, { sharedWith: userId, deletedAt: null }],
  });
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const params = new URL(request.url).searchParams;
  return streamFile(file, params.get("inline") === "1", params.get("thumb") === "1");
}
