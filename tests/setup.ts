import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// In-memory cookie jar standing in for next/headers during route tests.
export const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

// Fake Cloudinary: tracks "stored" assets so routes can verify and destroy them.
export const assets = new Map<string, { bytes: number; type: string }>();
vi.mock("@/lib/cloudinary", () => ({
  default: {
    config: () => undefined,
    url: (publicId: string) => `https://res.cloudinary.test/signed/${publicId}`,
    utils: { api_sign_request: () => "signature" },
    api: {
      resource: async (publicId: string) => {
        const asset = assets.get(publicId);
        if (!asset) throw new Error("not found");
        return { bytes: asset.bytes, secure_url: `https://res.cloudinary.com/x/${publicId}`, format: "png" };
      },
      resources: async () => ({ resources: [] }),
    },
    uploader: {
      destroy: async (publicId: string) => {
        assets.delete(publicId);
        return { result: "ok" };
      },
    },
  },
}));

let server: MongoMemoryServer;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = "megham-test";
  process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
});

beforeEach(async () => {
  jar.clear();
  assets.clear();
  if (mongoose.connection.readyState === 1) {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await server.stop();
});
