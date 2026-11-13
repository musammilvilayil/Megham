import mongoose from "mongoose";

type Cache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: Cache;
};

const cache = globalWithMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cache;

export async function connectMongo() {
  // Local development falls back to a MongoDB running on the default port.
  const uri =
    process.env.MONGODB_URI ??
    (process.env.NODE_ENV === "production" ? undefined : "mongodb://127.0.0.1:27017");
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (cache.connection) return cache.connection;
  cache.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    dbName: process.env.MONGODB_DB ?? "megham",
  });
  cache.connection = await cache.promise;
  return cache.connection;
}
