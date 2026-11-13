import { connectMongo } from "@/lib/mongodb";
import { CloudFile } from "@/models/CloudFile";
import { ShareLink } from "@/models/ShareLink";

/** Resolves an active public link to its file, or null when missing/revoked/expired/trashed. */
export async function resolveShare(token: string) {
  if (!token || token.length > 100) return null;
  await connectMongo();
  const link = await ShareLink.findOne({ token, revokedAt: null });
  if (!link) return null;
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return null;
  const file = await CloudFile.findOne({ _id: link.file, deletedAt: null });
  if (!file) return null;
  return { link, file };
}
