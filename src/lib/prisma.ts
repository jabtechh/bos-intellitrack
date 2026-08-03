// SERVER-ONLY MODULE
// This module must only be imported from Next.js Server Components, Server
// Actions, Route Handlers, or other server-side code. It must never be
// imported from Client Components. The PrismaPg driver adapter renders it
// non-runnable in browser contexts regardless.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add DATABASE_URL to your environment variables before using Prisma."
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}