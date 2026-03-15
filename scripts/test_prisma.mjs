import { PrismaClient } from "@prisma/client";
console.log("PrismaClient imported successfully!");
const prisma = new PrismaClient();
console.log("PrismaClient instantiated!");
await prisma.$connect();
console.log("PrismaClient connected!");
await prisma.$disconnect();
console.log("Success!");
