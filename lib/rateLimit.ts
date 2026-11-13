import { connectMongo } from "@/lib/mongodb";
import { RateLimit } from "@/models/RateLimit";

/** Fixed-window limiter stored in MongoDB so it works across serverless instances. */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  await connectMongo();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  // Start a fresh window if the old one expired but the TTL monitor has not run yet.
  await RateLimit.deleteOne({ key, resetAt: { $lte: now } });
  const doc = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { resetAt } },
    { upsert: true, returnDocument: "after" },
  ).lean<{ count: number; resetAt: Date }>();
  if (!doc) return { ok: true, retryAfter: 1 };
  const retryAfter = Math.max(1, Math.ceil((doc.resetAt.getTime() - now.getTime()) / 1000));
  return { ok: doc.count <= limit, retryAfter };
}

export async function resetRateLimit(key: string) {
  await connectMongo();
  await RateLimit.deleteOne({ key });
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
