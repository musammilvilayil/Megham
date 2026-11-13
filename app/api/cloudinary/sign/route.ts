import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { MAX_BYTES, quotaBytes } from "@/lib/files";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionUserId } from "@/lib/session";
import { storageUsed } from "@/lib/usage";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim().toLowerCase();
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  }

  const limit = await rateLimit(`sign:${userId}`, 120, 60 * 60);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const declared = Number(body?.bytes);
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return NextResponse.json({ error: "Maximum upload size is 25 MB." }, { status: 413 });
  }
  const used = await storageUsed(userId);
  if (used.bytes + (Number.isFinite(declared) ? declared : 0) > quotaBytes()) {
    return NextResponse.json({ error: "Storage quota exceeded." }, { status: 413 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `megham/${userId}`;
  // "authenticated" assets cannot be fetched without a signed URL.
  const type = "authenticated";
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp, type }, apiSecret);

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, type, signature });
}
