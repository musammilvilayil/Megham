import { jar } from "./setup";

export const json = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

/** Registers a user and returns their id; the cookie jar then holds their session. */
export async function signUp(email = "ada@example.com", password = "correct horse battery") {
  const { POST } = await import("@/app/api/auth/register/route");
  const response = await POST(json("/api/auth/register", "POST", { name: "Ada", email, password }));
  const data = await response.json();
  return { id: data.user?.id as string, status: response.status, password };
}

export const cookieSnapshot = () => new Map(jar);
export const restoreCookies = (snapshot: Map<string, string>) => {
  jar.clear();
  for (const [key, value] of snapshot) jar.set(key, value);
};

export async function seedFile(ownerId: string, overrides: Record<string, unknown> = {}) {
  const { CloudFile } = await import("@/models/CloudFile");
  const { assets } = await import("./setup");
  const publicId = `megham/${ownerId}/${Math.random().toString(36).slice(2)}`;
  assets.set(publicId, { bytes: 1000, type: "authenticated" });
  return CloudFile.create({
    owner: ownerId,
    name: "notes.pdf",
    publicId,
    url: `https://res.cloudinary.com/x/${publicId}`,
    resourceType: "raw",
    deliveryType: "authenticated",
    bytes: 1000,
    ...overrides,
  });
}
