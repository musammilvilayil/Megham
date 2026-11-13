import { destroyAsset } from "@/lib/files";
import { CloudFile } from "@/models/CloudFile";
import { ShareLink } from "@/models/ShareLink";

type PurgeTarget = Parameters<typeof destroyAsset>[0] & { _id: unknown };

/** Removes the Cloudinary asset first; the database rows only go once that succeeds. */
export async function purgeFile(file: PurgeTarget) {
  await destroyAsset(file);
  await ShareLink.deleteMany({ file: file._id });
  await CloudFile.deleteOne({ _id: file._id });
}

/** Recomputes the `shared` flag from active links and recipients. */
export async function refreshShared(fileId: unknown) {
  const file = await CloudFile.findById(fileId).select("sharedWith");
  if (!file) return false;
  const now = new Date();
  const activeLinks = await ShareLink.countDocuments({
    file: fileId,
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });
  const shared = activeLinks > 0 || (file.sharedWith?.length ?? 0) > 0;
  await CloudFile.updateOne({ _id: fileId }, { shared });
  return shared;
}
