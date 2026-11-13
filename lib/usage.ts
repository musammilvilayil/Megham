import { Types } from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { quotaBytes } from "@/lib/files";
import { CloudFile } from "@/models/CloudFile";

/** Bytes stored by a user, including files still in the trash. */
export async function storageUsed(userId: string) {
  await connectMongo();
  const [row] = await CloudFile.aggregate([
    { $match: { owner: new Types.ObjectId(userId) } },
    { $group: { _id: null, bytes: { $sum: "$bytes" }, count: { $sum: 1 } } },
  ]);
  return { bytes: (row?.bytes as number) ?? 0, count: (row?.count as number) ?? 0 };
}

export async function usageSummary(userId: string) {
  const used = await storageUsed(userId);
  return { ...used, quota: quotaBytes() };
}
