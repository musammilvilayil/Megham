import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { usageSummary } from "@/lib/usage";
import { CloudFile } from "@/models/CloudFile";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();
  const owner = new Types.ObjectId(userId);
  const [usage, kinds, counts] = await Promise.all([
    usageSummary(userId),
    CloudFile.aggregate([
      { $match: { owner, deletedAt: null } },
      { $group: { _id: "$resourceType", bytes: { $sum: "$bytes" }, count: { $sum: 1 } } },
    ]),
    Promise.all([
      CloudFile.countDocuments({ owner, deletedAt: null }),
      CloudFile.countDocuments({ owner, deletedAt: null, starred: true }),
      CloudFile.countDocuments({ owner, deletedAt: null, shared: true }),
      CloudFile.countDocuments({ owner, deletedAt: { $ne: null } }),
      CloudFile.countDocuments({ sharedWith: owner, deletedAt: null }),
    ]),
  ]);
  const [active, starred, shared, trashed, sharedWithMe] = counts;
  return NextResponse.json({
    usage,
    kinds: kinds.map((row) => ({ type: row._id as string, bytes: row.bytes as number, count: row.count as number })),
    counts: { active, starred, shared, trashed, sharedWithMe },
  });
}
