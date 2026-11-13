import { NextResponse } from "next/server";
import { hashToken, newToken, normalizeEmail, tooMany } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { connectMongo } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { User } from "@/models/User";

// Always answers the same way so the endpoint cannot be used to discover accounts.
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`forgot:${clientIp(request)}`, 5, 60 * 60);
    if (!limit.ok) return tooMany(limit.retryAfter);
    const { email } = await request.json();
    const normalized = normalizeEmail(email);
    await connectMongo();
    const user = await User.findOne({ email: normalized });
    if (user) {
      const token = newToken();
      await User.updateOne(
        { _id: user._id },
        { resetTokenHash: hashToken(token), resetExpires: new Date(Date.now() + 60 * 60 * 1000) },
      );
      const base = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
      await sendEmail(
        user.email,
        "Reset your MEGHAM password",
        `Use this link within one hour to choose a new password:\n\n${base}/reset?token=${token}\n\nIf you did not ask for this, you can ignore this email.`,
      );
    }
  } catch (error) {
    console.error("MEGHAM forgot-password failed", error);
  }
  return NextResponse.json({ ok: true });
}
