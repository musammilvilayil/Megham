import { NextResponse } from "next/server";
import { DUMMY_HASH, normalizeEmail, tooMany, verifyPassword } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { createSession } from "@/lib/session";
import { User } from "@/models/User";

const WINDOW = 15 * 60;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const normalized = normalizeEmail(email);
    const byIp = await rateLimit(`login-ip:${clientIp(request)}`, 40, WINDOW);
    const byEmail = await rateLimit(`login-email:${normalized}`, 8, WINDOW);
    if (!byIp.ok || !byEmail.ok) return tooMany(Math.max(byIp.retryAfter, byEmail.retryAfter));

    await connectMongo();
    const user = await User.findOne({ email: normalized }).select("+passwordHash");
    const valid = await verifyPassword(String(password ?? ""), user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    await resetRateLimit(`login-email:${normalized}`);
    await createSession(user.id, user.sessionVersion ?? 0);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("MEGHAM login failed", error);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
