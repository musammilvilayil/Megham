import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

export const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

export const validPassword = (value: unknown) =>
  typeof value === "string" && value.length >= MIN_PASSWORD && value.length <= MAX_PASSWORD;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Used to keep login timing similar when the account does not exist.
export const DUMMY_HASH = "$2b$12$5lLfQw0xm1Qa9P4GefRsfOE5z4IYbtmbs9vsBt3VCDt47h1f3.3sy";

export const tooMany = (retryAfter: number) =>
  Response.json(
    { error: "Too many attempts. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
