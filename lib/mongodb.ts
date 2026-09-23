import { MongoClient, type Db } from "mongodb";
import type { UIMessage } from "ai";

export type ChatDoc = {
  _id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string | null;
};

export type MessageDoc = {
  _id: string;
  messages: UIMessage[];
  updatedAt: number;
};

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

let cachedClientPromise: Promise<MongoClient> | undefined;

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined. Add it to .env.local.");
  }
  return uri;
}

function connect(): Promise<MongoClient> {
  return new MongoClient(getUri()).connect();
}

/** Returns a cached, connected MongoClient. Throws lazily if MONGODB_URI is unset. */
export function getClient(): Promise<MongoClient> {
  if (cachedClientPromise) return cachedClientPromise;
  if (
    process.env.NODE_ENV === "development" &&
    globalWithMongo._mongoClientPromise
  ) {
    cachedClientPromise = globalWithMongo._mongoClientPromise;
    return cachedClientPromise;
  }
  cachedClientPromise = connect();
  if (process.env.NODE_ENV === "development") {
    globalWithMongo._mongoClientPromise = cachedClientPromise;
  }
  return cachedClientPromise;
}

let dbPromise: Promise<Db> | undefined;

/** Returns the app database, ensuring required indexes exist once per process. */
export function getDb(): Promise<Db> {
  dbPromise ??= getClient()
    .then((client) => client.db(process.env.MONGODB_DB ?? "chatgpt-clone"))
    .then(async (db) => {
      await db.collection("chats").createIndex({ updatedAt: -1 });
      return db;
    });
  return dbPromise;
}
