const { PrismaClient } = require('@prisma/client');

// Initialize Prisma
const prisma = new PrismaClient();

async function checkDb() {
    try {
        await prisma.$connect();
        console.log("💎 Prisma 6 successfully connected to 'asia1'.");
    } catch (e) {
        console.error("❌ Prisma Connection Failed:", e.message);
    }
}

checkDb();

module.exports = prisma;