import { Prisma, PrismaClient } from "@prisma/client";
import { envConfig } from "./env";

const globalForPrisma = globalThis as unknown as  {
    prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();
export const db = prisma

// hot reloading pe new PrismaClient creation prevent krne ke liye 
if( envConfig.NODE_ENV !== "production") 
    globalForPrisma.prisma = db

// This setup avoids creating multiple Prisma instances during hot reloads, by storing and reusing the client through globalThis  only in dev mode.
