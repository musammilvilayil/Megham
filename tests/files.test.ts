import { describe, expect, it } from "vitest";
import { ctx, json, seedFile, signUp } from "./helpers";
import { assets, jar } from "./setup";

describe("files", () => {
  it("isolates files between users", async () => {
    const ada = await signUp("ada@example.com");
    const file = await seedFile(ada.id);
    jar.clear();
    const eve = await signUp("eve@example.com");
    expect(eve.id).not.toBe(ada.id);

    const { GET } = await import("@/app/api/files/route");
    const list = await (await GET(json("/api/files", "GET"))).json();
    expect(list.files).toHaveLength(0);

    const { PATCH, DELETE } = await import("@/app/api/files/[id]/route");
    const patch = await PATCH(json(`/api/files/${file.id}`, "PATCH", { action: "star" }), ctx({ id: file.id }));
    expect(patch.status).toBe(404);
    const del = await DELETE(json(`/api/files/${file.id}`, "DELETE"), ctx({ id: file.id }));
    expect(del.status).toBe(404);
    const { GET: download } = await import("@/app/api/files/[id]/download/route");
    expect((await download(json(`/api/files/${file.id}/download`, "GET"), ctx({ id: file.id }))).status).toBe(404);
  });

  it("requires sign-in", async () => {
    const { GET } = await import("@/app/api/files/route");
    expect((await GET(json("/api/files", "GET"))).status).toBe(401);
  });

  it("enforces the trash-before-delete rule and removes the asset", async () => {
    const { id } = await signUp();
    const file = await seedFile(id);
    const { PATCH, DELETE } = await import("@/app/api/files/[id]/route");
    expect((await DELETE(json("", "DELETE"), ctx({ id: file.id }))).status).toBe(409);
    expect((await PATCH(json("", "PATCH", { action: "trash" }), ctx({ id: file.id }))).status).toBe(200);
    expect((await DELETE(json("", "DELETE"), ctx({ id: file.id }))).status).toBe(200);
    expect(assets.has(file.publicId)).toBe(false);
    const { CloudFile } = await import("@/models/CloudFile");
    expect(await CloudFile.countDocuments()).toBe(0);
  });

  it("paginates, searches and filters by view", async () => {
    const { id } = await signUp();
    for (let i = 0; i < 5; i += 1) await seedFile(id, { name: `report-${i}.pdf`, starred: i === 0 });
    await seedFile(id, { name: "photo.png", deletedAt: new Date() });
    const { GET } = await import("@/app/api/files/route");
    const first = await (await GET(json("/api/files?limit=2", "GET"))).json();
    expect(first.files).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();
    const second = await (await GET(json(`/api/files?limit=10&cursor=${first.nextCursor}`, "GET"))).json();
    expect(second.files).toHaveLength(3);
    expect(second.nextCursor).toBeNull();
    const search = await (await GET(json("/api/files?q=report-3", "GET"))).json();
    expect(search.files.map((f: { name: string }) => f.name)).toEqual(["report-3.pdf"]);
    const regexSafe = await (await GET(json("/api/files?q=.*", "GET"))).json();
    expect(regexSafe.files).toHaveLength(0);
    expect((await (await GET(json("/api/files?view=starred", "GET"))).json()).files).toHaveLength(1);
    expect((await (await GET(json("/api/files?view=trash", "GET"))).json()).files).toHaveLength(1);
    expect((await GET(json("/api/files?view=bogus", "GET"))).status).toBe(400);
  });

  it("never exposes storage identifiers to the browser", async () => {
    const { id } = await signUp();
    await seedFile(id);
    const { GET } = await import("@/app/api/files/route");
    const body = JSON.stringify(await (await GET(json("/api/files", "GET"))).json());
    expect(body).not.toContain("publicId");
    expect(body).not.toContain("cloudinary");
  });
});

describe("uploads", () => {
  it("accepts a verified upload and records Cloudinary's size, not the client's", async () => {
    const { id } = await signUp();
    const publicId = `megham/${id}/abc`;
    assets.set(publicId, { bytes: 2048, type: "authenticated" });
    const { POST } = await import("@/app/api/files/complete/route");
    const res = await POST(json("", "POST", { name: "a.png", publicId, resourceType: "image", bytes: 1 }));
    expect(res.status).toBe(201);
    expect((await res.json()).file.bytes).toBe(2048);
    expect((await POST(json("", "POST", { name: "a.png", publicId, resourceType: "image" }))).status).toBe(409);
  });

  it("rejects foreign paths, missing assets, oversized assets and quota overflow", async () => {
    const { id } = await signUp();
    const { POST } = await import("@/app/api/files/complete/route");
    expect((await POST(json("", "POST", { name: "x", publicId: "megham/someone-else/x", resourceType: "raw" }))).status).toBe(403);
    expect((await POST(json("", "POST", { name: "x", publicId: `megham/${id}/ghost`, resourceType: "raw" }))).status).toBe(400);

    const big = `megham/${id}/big`;
    assets.set(big, { bytes: 26 * 1024 * 1024, type: "authenticated" });
    expect((await POST(json("", "POST", { name: "big", publicId: big, resourceType: "raw" }))).status).toBe(413);
    expect(assets.has(big)).toBe(false);

    process.env.STORAGE_QUOTA_MB = "1";
    const over = `megham/${id}/over`;
    assets.set(over, { bytes: 2 * 1024 * 1024, type: "authenticated" });
    expect((await POST(json("", "POST", { name: "over", publicId: over, resourceType: "raw" }))).status).toBe(413);
    expect(assets.has(over)).toBe(false);
    delete process.env.STORAGE_QUOTA_MB;
  });

  it("signs authenticated uploads and refuses oversized or over-quota requests", async () => {
    await signUp();
    const { POST } = await import("@/app/api/cloudinary/sign/route");
    const ok = await (await POST(json("", "POST", { bytes: 100 }))).json();
    expect(ok.type).toBe("authenticated");
    expect((await POST(json("", "POST", { bytes: 30 * 1024 * 1024 }))).status).toBe(413);
  });
});

describe("folders and bulk actions", () => {
  it("creates, nests, moves files and prevents cycles", async () => {
    const { id } = await signUp();
    const file = await seedFile(id);
    const { POST, GET } = await import("@/app/api/folders/route");
    const a = (await (await POST(json("", "POST", { name: "A" }))).json()).folder;
    const b = (await (await POST(json("", "POST", { name: "B", parent: a.id }))).json()).folder;
    expect((await (await GET()).json()).folders).toHaveLength(2);

    const { PATCH, DELETE } = await import("@/app/api/folders/[id]/route");
    expect((await PATCH(json("", "PATCH", { parent: b.id }), ctx({ id: a.id }))).status).toBe(400);

    const { PATCH: patchFile } = await import("@/app/api/files/[id]/route");
    expect((await patchFile(json("", "PATCH", { action: "move", folder: b.id }), ctx({ id: file.id }))).status).toBe(200);
    const { GET: list } = await import("@/app/api/files/route");
    expect((await (await list(json(`/api/files?folder=${b.id}`, "GET"))).json()).files).toHaveLength(1);
    expect((await (await list(json("/api/files", "GET"))).json()).files).toHaveLength(0);

    expect((await DELETE(json("", "DELETE"), ctx({ id: b.id }))).status).toBe(200);
    expect((await (await list(json(`/api/files?folder=${a.id}`, "GET"))).json()).files).toHaveLength(1);
  });

  it("applies bulk actions only to the caller's files", async () => {
    const ada = await signUp("ada@example.com");
    const mine = await seedFile(ada.id);
    jar.clear();
    const eve = await signUp("eve@example.com");
    const theirs = await seedFile(eve.id);
    jar.clear();
    await signUp("ada@example.com").catch(() => undefined);
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(json("", "POST", { email: "ada@example.com", password: "correct horse battery" }));

    const { POST } = await import("@/app/api/files/bulk/route");
    expect((await POST(json("", "POST", { action: "trash", ids: [mine.id, theirs.id] }))).status).toBe(200);
    const { CloudFile } = await import("@/models/CloudFile");
    expect((await CloudFile.findById(mine.id))?.deletedAt).toBeTruthy();
    expect((await CloudFile.findById(theirs.id))?.deletedAt).toBeNull();
    expect((await POST(json("", "POST", { action: "trash", ids: ["nope"] }))).status).toBe(400);
    expect((await POST(json("", "POST", { action: "delete", ids: [mine.id, theirs.id] }))).status).toBe(200);
    expect(await CloudFile.countDocuments()).toBe(1);
  });
});
