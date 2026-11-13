import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { destroyAsset, TRASH_RETENTION_DAYS } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { purgeFile } from "@/lib/purge";
import { CloudFile } from "@/models/CloudFile";

const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Daily housekeeping (Vercel Cron): permanently deletes files trashed more than
 * 30 days ago and removes uploads that never got a database record.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectMongo();

  let purged = 0;
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000);
  const expired = await CloudFile.find({ deletedAt: { $ne: null, $lt: cutoff } }).limit(200);
  for (const file of expired) {
    try {
      await purgeFile(file);
      purged += 1;
    } catch (error) {
      console.error("MEGHAM cleanup: purge failed", file.publicId, error);
    }
  }

  let orphans = 0;
  for (const resourceType of ["image", "video", "raw"] as const) {
    try {
      const listing = await cloudinary.api.resources({
        type: "authenticated",
        resource_type: resourceType,
        prefix: "megham/",
        max_results: 200,
      });
      const resources: { public_id: string; created_at: string }[] = listing.resources ?? [];
      const old = resources.filter((r) => Date.now() - new Date(r.created_at).getTime() > ORPHAN_GRACE_MS);
      const known = new Set(
        (await CloudFile.find({ publicId: { $in: old.map((r) => r.public_id) } }).select("publicId").lean()).map(
          (f) => f.publicId as string,
        ),
      );
      for (const resource of old.filter((r) => !known.has(r.public_id))) {
        await destroyAsset({
          name: resource.public_id,
          publicId: resource.public_id,
          url: "",
          resourceType,
          deliveryType: "authenticated",
        });
        orphans += 1;
      }
    } catch (error) {
      console.error("MEGHAM cleanup: orphan sweep failed", resourceType, error);
    }
  }
  return NextResponse.json({ purged, orphans });
}
