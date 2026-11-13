import { describe, expect, it, vi } from "vitest";
import { ctx, json, seedFile, signUp } from "./helpers";
import { jar } from "./setup";

const okFetch = () =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("hello", { status: 200, headers: { "content-length": "5" } }),
  );

describe("sharing", () => {
  it("creates a public link that downloads, expires and can be revoked", async () => {
    const { id } = await signUp();
    const file = await seedFile(id, { name: "page.html" });
    const { POST, DELETE } = await import("@/app/api/files/[id]/share/route");
    const created = await (
      await POST(json("", "POST", { type: "link" }), ctx({ id: file.id }))
    ).json();
    expect(created.links).toHaveLength(1);
    const { token, id: linkId } = created.links[0];

    const spy = okFetch();
    const { GET } = await import("@/app/api/s/[token]/route");
    jar.clear(); // anonymous visitor
    const res = await GET(json(`/api/s/${token}`, "GET"), ctx({ token }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    // HTML must never render inline from our origin, even when requested.
    const inline = await GET(json(`/api/s/${token}?inline=1`, "GET"), ctx({ token }));
    expect(inline.headers.get("content-disposition")).toContain("attachment");
    spy.mockRestore();

    const { CloudFile } = await import("@/models/CloudFile");
    expect((await CloudFile.findById(file.id))?.shared).toBe(true);

    // Revoke (log back in as the owner first).
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(json("", "POST", { email: "ada@example.com", password: "correct horse battery" }));
    const after = await DELETE(json(`?link=${linkId}`, "DELETE"), ctx({ id: file.id }));
    expect(after.status).toBe(200);
    expect((await CloudFile.findById(file.id))?.shared).toBe(false);
    jar.clear();
    const gone = await GET(json(`/api/s/${token}`, "GET"), ctx({ token }));
    expect(gone.status).toBe(404);
  });

  it("does not resolve expired links or trashed files", async () => {
    const { id } = await signUp();
    const file = await seedFile(id);
    const { ShareLink } = await import("@/models/ShareLink");
    await ShareLink.create({ file: file._id, owner: id, token: "expired-token", expiresAt: new Date(Date.now() - 1000) });
    await ShareLink.create({ file: file._id, owner: id, token: "live-token" });
    const { resolveShare } = await import("@/lib/shareLookup");
    expect(await resolveShare("expired-token")).toBeNull();
    expect(await resolveShare("live-token")).not.toBeNull();
    const { CloudFile } = await import("@/models/CloudFile");
    await CloudFile.updateOne({ _id: file._id }, { deletedAt: new Date() });
    expect(await resolveShare("live-token")).toBeNull();
  });

  it("shares with another account, which can list and read but not modify", async () => {
    const ada = await signUp("ada@example.com");
    const file = await seedFile(ada.id);
    const { POST } = await import("@/app/api/files/[id]/share/route");
    expect((await POST(json("", "POST", { type: "user", email: "bob@example.com" }), ctx({ id: file.id }))).status).toBe(404);

    jar.clear();
    await signUp("bob@example.com");
    jar.clear();
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(json("", "POST", { email: "ada@example.com", password: "correct horse battery" }));
    expect((await POST(json("", "POST", { type: "user", email: "bob@example.com" }), ctx({ id: file.id }))).status).toBe(201);

    jar.clear();
    await login(json("", "POST", { email: "bob@example.com", password: "correct horse battery" }));
    const { GET } = await import("@/app/api/files/route");
    const list = await (await GET(json("/api/files?view=shared-with-me", "GET"))).json();
    expect(list.files).toHaveLength(1);
    expect(list.files[0].mine).toBe(false);

    const spy = okFetch();
    const { GET: download } = await import("@/app/api/files/[id]/download/route");
    expect((await download(json("", "GET"), ctx({ id: file.id }))).status).toBe(200);
    spy.mockRestore();
    const { PATCH } = await import("@/app/api/files/[id]/route");
    expect((await PATCH(json("", "PATCH", { action: "trash" }), ctx({ id: file.id }))).status).toBe(404);
  });

  it("serves safe media inline from the signed-in download route", async () => {
    const { id } = await signUp();
    const file = await seedFile(id, { name: "photo.png" });
    const spy = okFetch();
    const { GET } = await import("@/app/api/files/[id]/download/route");
    const res = await GET(json("?inline=1", "GET"), ctx({ id: file.id }));
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("content-disposition")).toContain("inline");
    spy.mockRestore();
  });
});

describe("cleanup cron", () => {
  it("requires the secret and purges files trashed over 30 days ago", async () => {
    const { id } = await signUp();
    const old = await seedFile(id, { deletedAt: new Date(Date.now() - 31 * 86_400_000) });
    const recent = await seedFile(id, { deletedAt: new Date() });
    const { GET } = await import("@/app/api/cron/cleanup/route");
    process.env.CRON_SECRET = "cron-secret";
    expect((await GET(json("", "GET"))).status).toBe(401);
    const res = await GET(json("", "GET", undefined, { authorization: "Bearer cron-secret" }));
    expect((await res.json()).purged).toBe(1);
    const { CloudFile } = await import("@/models/CloudFile");
    expect(await CloudFile.findById(old._id)).toBeNull();
    expect(await CloudFile.findById(recent._id)).not.toBeNull();
  });
});
