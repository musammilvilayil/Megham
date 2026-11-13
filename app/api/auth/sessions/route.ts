import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { clearSession, getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";

// Sign out everywhere: invalidates every cookie issued so far.
export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();
  await User.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });
  await clearSession();
  return NextResponse.json({ ok: true });
}
