import { NextResponse } from "next/server";
import { hashPassword, MAX_PASSWORD, MIN_PASSWORD, tooMany, validPassword, verifyPassword } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rateLimit";
import { createSession, getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limit = await rateLimit(`password:${userId}`, 10, 15 * 60);
    if (!limit.ok) return tooMany(limit.retryAfter);
    const { currentPassword, newPassword } = await request.json();
    if (!validPassword(newPassword)) {
      return NextResponse.json({ error: `Password must be ${MIN_PASSWORD}–${MAX_PASSWORD} characters.` }, { status: 400 });
    }
    await connectMongo();
    const user = await User.findById(userId).select("+passwordHash");
    if (!user || !(await verifyPassword(String(currentPassword ?? ""), user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }
    user.passwordHash = await hashPassword(newPassword);
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();
    // Every other device is signed out; this one stays signed in.
    await createSession(user.id, user.sessionVersion);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MEGHAM password change failed", error);
    return NextResponse.json({ error: "Could not change password." }, { status: 500 });
  }
}
