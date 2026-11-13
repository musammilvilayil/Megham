import { NextResponse } from "next/server";
import { newToken, normalizeEmail } from "@/lib/auth";
import { isObjectId } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { refreshShared } from "@/lib/purge";
import { getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";
import { ShareLink } from "@/models/ShareLink";
import { User } from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedFile(context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await context.params;
  if (!isObjectId(id)) return { error: NextResponse.json({ error: "File not found." }, { status: 404 }) };
  await connectMongo();
  const file = await CloudFile.findOne({ _id: id, owner: userId, deletedAt: null });
  if (!file) return { error: NextResponse.json({ error: "File not found." }, { status: 404 }) };
  return { file, userId };
}

async function summary(file: { _id: unknown; sharedWith?: unknown[] }) {
  const now = new Date();
  const [links, people] = await Promise.all([
    ShareLink.find({
      file: file._id,
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ _id: -1 })
      .lean(),
    User.find({ _id: { $in: file.sharedWith ?? [] } }).select("name email").lean(),
  ]);
  return {
    links: links.map((link) => ({
      id: String(link._id),
      token: link.token,
      expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString() : null,
      downloads: link.downloads,
      createdAt: new Date(link.createdAt).toISOString(),
    })),
    people: people.map((person) => ({ id: String(person._id), name: person.name, email: person.email })),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const result = await ownedFile(context);
  if (result.error) return result.error;
  return NextResponse.json(await summary(result.file));
}

// Body: { type: "link", expiresInDays?: number } or { type: "user", email: string }
export async function POST(request: Request, context: RouteContext) {
  const result = await ownedFile(context);
  if (result.error) return result.error;
  const { file, userId } = result;
  const body = await request.json().catch(() => ({}));

  if (body.type === "link") {
    const days = body.expiresInDays == null ? null : Number(body.expiresInDays);
    if (days !== null && (!Number.isFinite(days) || days < 1 || days > 365)) {
      return NextResponse.json({ error: "Expiry must be between 1 and 365 days." }, { status: 400 });
    }
    await ShareLink.create({
      file: file._id,
      owner: userId,
      token: newToken(),
      expiresAt: days === null ? null : new Date(Date.now() + days * 86_400_000),
    });
  } else if (body.type === "user") {
    const email = normalizeEmail(body.email);
    const person = await User.findOne({ email }).select("_id");
    if (!person) {
      return NextResponse.json({ error: "No MEGHAM account uses that email." }, { status: 404 });
    }
    if (String(person._id) === userId) {
      return NextResponse.json({ error: "You already own this file." }, { status: 400 });
    }
    await CloudFile.updateOne({ _id: file._id }, { $addToSet: { sharedWith: person._id } });
  } else {
    return NextResponse.json({ error: "Unsupported share type." }, { status: 400 });
  }

  await refreshShared(file._id);
  const fresh = await CloudFile.findById(file._id);
  return NextResponse.json(await summary(fresh), { status: 201 });
}

// ?link=<id> revokes a link, ?user=<id> removes a recipient.
export async function DELETE(request: Request, context: RouteContext) {
  const result = await ownedFile(context);
  if (result.error) return result.error;
  const { file } = result;
  const params = new URL(request.url).searchParams;
  const link = params.get("link");
  const user = params.get("user");

  if (link && isObjectId(link)) {
    await ShareLink.updateOne({ _id: link, file: file._id, revokedAt: null }, { revokedAt: new Date() });
  } else if (user && isObjectId(user)) {
    await CloudFile.updateOne({ _id: file._id }, { $pull: { sharedWith: user } });
  } else {
    return NextResponse.json({ error: "Specify a link or user to remove." }, { status: 400 });
  }
  await refreshShared(file._id);
  const fresh = await CloudFile.findById(file._id);
  return NextResponse.json(await summary(fresh));
}
