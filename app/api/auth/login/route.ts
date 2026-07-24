import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { createSession } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    await connectMongo();
    const user = await User.findOne({
      email: String(email ?? "").trim().toLowerCase(),
    }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(String(password ?? ""), user.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
