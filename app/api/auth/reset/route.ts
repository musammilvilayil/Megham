import { NextResponse } from "next/server";
import { hashPassword, hashToken, MAX_PASSWORD, MIN_PASSWORD, tooMany, validPassword } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`reset:${clientIp(request)}`, 10, 60 * 60);
    if (!limit.ok) return tooMany(limit.retryAfter);
    const { token, password } = await request.json();
    if (!validPassword(password)) {
      return NextResponse.json({ error: `Password must be ${MIN_PASSWORD}–${MAX_PASSWORD} characters.` }, { status: 400 });
    }
    await connectMongo();
    const user = await User.findOneAndUpdate(
      { resetTokenHash: hashToken(String(token ?? "")), resetExpires: { $gt: new Date() } },
      {
        passwordHash: await hashPassword(password),
        $unset: { resetTokenHash: 1, resetExpires: 1 },
        $inc: { sessionVersion: 1 },
      },
    );
    if (!user) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MEGHAM reset failed", error);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
