/**
 * Prisma client singleton
 */

import { PrismaClient } from '@prisma/client';

// nodemon restarts re-evaluate this module; without the cache each reload would
// open a fresh connection pool and eventually exhaust Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
