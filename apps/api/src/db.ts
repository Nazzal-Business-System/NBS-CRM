import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { env } from "./env.js";
let client: PrismaClient | undefined;
export function getDb(): PrismaClient {
  if (!env.DATABASE_URL) throw new Error("Database configuration required for authentication.");
  // Lazy initialization only. Health checks, build and imports never connect.
  return client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
}
export async function closeDb(): Promise<void> { await client?.$disconnect(); }
