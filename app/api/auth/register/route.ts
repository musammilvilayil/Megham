import { NextResponse } from "next/server";
import { EMAIL_PATTERN, hashPassword, MAX_PASSWORD, MIN_PASSWORD, normalizeEmail, tooMany, validPassword } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { createSession } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`register:${clientIp(request)}`, 10, 60 * 60);
    if (!limit.ok) return tooMany(limit.retryAfter);

    const { name, email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const cleanName = String(name ?? "").trim();
    if (!cleanName || cleanName.length > 80 || !EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter your name and a valid email address." }, { status: 400 });
    }
    if (!validPassword(password)) {
      return NextResponse.json(
        { error: `Password must be ${MIN_PASSWORD}–${MAX_PASSWORD} characters.` },
        { status: 400 },
      );
    }
    await connectMongo();
    if (await User.exists({ email: normalizedEmail })) {
      return NextResponse.json({ error: "An account already exists." }, { status: 409 });
    }
    const user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
    });
    await createSession(user.id, 0);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "An account already exists." }, { status: 409 });
    }
    console.error("MEGHAM register failed", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
