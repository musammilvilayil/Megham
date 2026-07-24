import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();
  const user = await User.findById(userId).select("name email").lean();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
