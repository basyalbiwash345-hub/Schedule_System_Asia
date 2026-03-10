const { PrismaClient } = require('@prisma/client');

let prisma;

try {
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
    console.log("💎 Prisma Client successfully initialized!");
} catch (error) {
    console.error("Prisma failed to initialize:", error.message);
    // We keep it as a blank object so the server doesn't crash on boot
    prisma = {};
}

module.exports = prisma;