import { Types } from "mongoose";
import cloudinary from "@/lib/cloudinary";

export const MAX_BYTES = 25 * 1024 * 1024;
export const TRASH_RETENTION_DAYS = 30;
export const quotaBytes = () =>
  Math.max(1, Number(process.env.STORAGE_QUOTA_MB) || 1024) * 1024 * 1024;

export const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value;

type FileDoc = {
  _id: Types.ObjectId | string;
  name: string;
  bytes: number;
  resourceType: string;
  format?: string;
  folder?: Types.ObjectId | string | null;
  starred?: boolean;
  shared?: boolean;
  sharedWith?: unknown[];
  deletedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  owner?: Types.ObjectId | string;
};

/** Public shape sent to the browser: never exposes publicId or raw Cloudinary URLs. */
export function serializeFile(file: FileDoc, viewerId?: string) {
  return {
    id: String(file._id),
    name: file.name,
    bytes: file.bytes,
    resourceType: file.resourceType,
    format: file.format ?? null,
    folder: file.folder ? String(file.folder) : null,
    starred: Boolean(file.starred),
    shared: Boolean(file.shared),
    sharedWithCount: file.sharedWith?.length ?? 0,
    deletedAt: file.deletedAt ? new Date(file.deletedAt).toISOString() : null,
    createdAt: file.createdAt ? new Date(file.createdAt).toISOString() : null,
    updatedAt: file.updatedAt ? new Date(file.updatedAt).toISOString() : null,
    mine: viewerId ? String(file.owner) === viewerId : true,
  };
}

const INLINE_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  avif: "image/avif", pdf: "application/pdf", mp4: "video/mp4", webm: "video/webm",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
};

export function inlineTypeFor(name: string) {
  return INLINE_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

type DeliveryFile = {
  name: string;
  publicId: string;
  url: string;
  resourceType: string;
  deliveryType?: string;
};

export function deliveryUrl(file: DeliveryFile, thumb = false) {
  const authenticated = file.deliveryType === "authenticated";
  const wantsThumb = thumb && file.resourceType === "image";
  if (!authenticated && !wantsThumb) return file.url;
  const resource_type = ["image", "video", "raw"].includes(file.resourceType) ? file.resourceType : "image";
  return cloudinary.url(file.publicId, {
    resource_type,
    type: authenticated ? "authenticated" : "upload",
    sign_url: authenticated,
    secure: true,
    ...(wantsThumb
      ? { transformation: [{ width: 480, height: 320, crop: "fill", quality: "auto" }], format: "jpg" }
      : {}),
  });
}

/**
 * Streams a stored file through the app so the Cloudinary URL never reaches the
 * browser. Only a short allow-list of media types may render inline; everything
 * else downloads, and every response is sandboxed against script execution.
 */
export async function streamFile(file: DeliveryFile, wantInline: boolean, thumb = false) {
  const isThumb = thumb && file.resourceType === "image";
  const upstream = await fetch(deliveryUrl(file, thumb), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new Response("File unavailable.", { status: 502 });
  const inlineType = isThumb ? "image/jpeg" : wantInline ? inlineTypeFor(file.name) : null;
  const headers = new Headers({
    "Content-Type": inlineType ?? "application/octet-stream",
    "Content-Disposition": `${inlineType ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'",
    "Cache-Control": isThumb ? "private, max-age=3600" : "private, no-store",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}

export async function destroyAsset(file: DeliveryFile) {
  const resource_type = (["image", "video", "raw"].includes(file.resourceType) ? file.resourceType : "image") as
    "image" | "video" | "raw";
  await cloudinary.uploader.destroy(file.publicId, {
    resource_type,
    type: file.deliveryType === "authenticated" ? "authenticated" : "upload",
    invalidate: true,
  });
}
