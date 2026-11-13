import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/models/User";

export const SESSION_COOKIE = "megham_session";
const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }
  return new TextEncoder().encode(value ?? "development-only-change-this-secret");
};

export async function createSession(userId: string, version = 0) {
  const token = await new SignJWT({ userId, v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Returns the signed-in user's id, or null. The cookie's session version must
 * match the user's current version, so "sign out everywhere" and password
 * changes revoke previously issued cookies.
 */
export async function getSessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string") return null;
    await connectMongo();
    const user = await User.findById(payload.userId).select("sessionVersion").lean<{ sessionVersion?: number }>();
    if (!user) return null;
    if ((user.sessionVersion ?? 0) !== (typeof payload.v === "number" ? payload.v : 0)) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
