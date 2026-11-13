import { NextResponse } from "next/server";
import { streamFile } from "@/lib/files";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { resolveShare } from "@/lib/shareLookup";
import { ShareLink } from "@/models/ShareLink";

type RouteContext = { params: Promise<{ token: string }> };

// Public download for a share link. `?inline=1` previews safe media types.
export async function GET(request: Request, context: RouteContext) {
  const limit = await rateLimit(`share:${clientIp(request)}`, 120, 60);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const { token } = await context.params;
  const resolved = await resolveShare(token);
  if (!resolved) return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  if (!inline) await ShareLink.updateOne({ _id: resolved.link._id }, { $inc: { downloads: 1 } });
  return streamFile(resolved.file, inline);
}
