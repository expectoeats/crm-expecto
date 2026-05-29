import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing");
}

declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri as string, {
      dbName: "expectocrm",
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
