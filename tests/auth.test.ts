import { describe, expect, it } from "vitest";
import { cookieSnapshot, ctx, json, restoreCookies, signUp } from "./helpers";
import { jar } from "./setup";

describe("auth", () => {
  it("registers, reads the session, and rejects duplicates and weak input", async () => {
    const first = await signUp();
    expect(first.status).toBe(201);
    const { GET } = await import("@/app/api/auth/me/route");
    expect((await GET()).status).toBe(200);
    expect((await signUp()).status).toBe(409);

    const { POST } = await import("@/app/api/auth/register/route");
    const weak = await POST(json("/api/auth/register", "POST", { name: "B", email: "b@example.com", password: "short" }));
    expect(weak.status).toBe(400);
    const badEmail = await POST(json("/api/auth/register", "POST", { name: "B", email: "nope", password: "long enough pw" }));
    expect(badEmail.status).toBe(400);
  });

  it("logs in and locks out after repeated failures", async () => {
    await signUp("lock@example.com");
    const { POST } = await import("@/app/api/auth/login/route");
    const ok = await POST(json("/api/auth/login", "POST", { email: "lock@example.com", password: "correct horse battery" }));
    expect(ok.status).toBe(200);
    let last = 0;
    for (let i = 0; i < 9; i += 1) {
      last = (await POST(json("/api/auth/login", "POST", { email: "lock@example.com", password: "wrong-password" }))).status;
    }
    expect(last).toBe(429);
    const blocked = await POST(json("/api/auth/login", "POST", { email: "lock@example.com", password: "correct horse battery" }));
    expect(blocked.status).toBe(429);
  });

  it("revokes old cookies when signing out everywhere", async () => {
    await signUp();
    const old = cookieSnapshot();
    const { DELETE } = await import("@/app/api/auth/sessions/route");
    expect((await DELETE()).status).toBe(200);
    restoreCookies(old);
    const { GET } = await import("@/app/api/auth/me/route");
    expect((await GET()).status).toBe(401);
  });

  it("changes password, keeps this device signed in, and revokes others", async () => {
    await signUp();
    const other = cookieSnapshot();
    const { POST } = await import("@/app/api/auth/password/route");
    const wrong = await POST(json("/api/auth/password", "POST", { currentPassword: "nope", newPassword: "brand new password" }));
    expect(wrong.status).toBe(403);
    const ok = await POST(json("/api/auth/password", "POST", { currentPassword: "correct horse battery", newPassword: "brand new password" }));
    expect(ok.status).toBe(200);
    const { GET } = await import("@/app/api/auth/me/route");
    expect((await GET()).status).toBe(200);
    restoreCookies(other);
    expect((await GET()).status).toBe(401);
  });

  it("resets a forgotten password with a single-use token", async () => {
    await signUp("reset@example.com");
    const logs: string[] = [];
    const spy = (await import("vitest")).vi.spyOn(console, "info").mockImplementation((m) => void logs.push(String(m)));
    const { POST: forgot } = await import("@/app/api/auth/forgot/route");
    expect((await forgot(json("/api/auth/forgot", "POST", { email: "reset@example.com" }))).status).toBe(200);
    expect((await forgot(json("/api/auth/forgot", "POST", { email: "ghost@example.com" }))).status).toBe(200);
    spy.mockRestore();
    const token = logs.join("\n").match(/token=([\w-]+)/)?.[1];
    expect(token).toBeTruthy();

    const { POST: reset } = await import("@/app/api/auth/reset/route");
    expect((await reset(json("/api/auth/reset", "POST", { token, password: "a fresh password" }))).status).toBe(200);
    expect((await reset(json("/api/auth/reset", "POST", { token, password: "another password" }))).status).toBe(400);

    jar.clear();
    const { POST: login } = await import("@/app/api/auth/login/route");
    expect((await login(json("/api/auth/login", "POST", { email: "reset@example.com", password: "a fresh password" }))).status).toBe(200);
  });

  it("deletes the account and its files", async () => {
    const { id, password } = await signUp();
    const { seedFile } = await import("./helpers");
    const file = await seedFile(id);
    const { assets } = await import("./setup");
    const { DELETE } = await import("@/app/api/auth/account/route");
    expect((await DELETE(json("/api/auth/account", "DELETE", { password: "wrong" }))).status).toBe(403);
    expect((await DELETE(json("/api/auth/account", "DELETE", { password }))).status).toBe(200);
    expect(assets.has(file.publicId)).toBe(false);
    const { User } = await import("@/models/User");
    expect(await User.countDocuments()).toBe(0);
    void ctx;
  });
});
