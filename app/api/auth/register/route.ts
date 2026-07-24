import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { createSession } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!String(name ?? "").trim() || !normalizedEmail || String(password ?? "").length < 8) {
      return NextResponse.json(
        { error: "Name, valid email and an 8-character password are required." },
        { status: 400 },
      );
    }
    await connectMongo();
    if (await User.exists({ email: normalizedEmail })) {
      return NextResponse.json({ error: "An account already exists." }, { status: 409 });
    }
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(String(password), 12),
    });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
