import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
globalForPrisma.prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = globalForPrisma.prisma;
}

const prisma = globalForPrisma.prisma;

export default prisma;
