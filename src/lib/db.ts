import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  
  // Check if we're in a serverless environment (Vercel) or have a Neon URL
  const isServerless = process.env.VERCEL === "1" || 
                       process.env.VERCEL_ENV || 
                       databaseUrl?.includes("neon.tech") || 
                       databaseUrl?.includes("pooler");
  
  if (isServerless) {
    if (!databaseUrl) {
      console.error("DATABASE_URL is not set. Available env vars:", Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("VERCEL")));
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    console.log("Using Neon adapter with connection string starting with:", databaseUrl.substring(0, 20) + "...");
    
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }
  
  // Local development or other PostgreSQL
  return new PrismaClient({
    log: ["error"],
  });
}

// Lazy initialization - only create when first accessed
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
