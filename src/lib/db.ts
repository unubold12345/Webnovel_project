import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  
  // In production/Vercel, we MUST use the Neon adapter
  const isProduction = process.env.NODE_ENV === "production";
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
  
  console.log("[Prisma] Environment check:", { 
    NODE_ENV: process.env.NODE_ENV, 
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasDatabaseUrl: !!databaseUrl,
    databaseUrlPrefix: databaseUrl ? databaseUrl.substring(0, 30) : "NOT SET"
  });
  
  if (isProduction || isVercel || databaseUrl?.includes("neon.tech") || databaseUrl?.includes("pooler")) {
    if (!databaseUrl) {
      console.error("[Prisma] CRITICAL: DATABASE_URL is not set!");
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    console.log("[Prisma] Using Neon adapter");
    
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }
  
  // Local development - standard Prisma client
  console.log("[Prisma] Using standard Prisma client (local dev)");
  return new PrismaClient({
    log: ["error"],
  });
}

// Create the client
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
