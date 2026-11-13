import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();
  const doc = await User.findById(userId).select("name email").lean<{ _id: unknown; name: string; email: string }>();
  if (!doc) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: { id: String(doc._id), name: doc.name, email: doc.email } });
}
