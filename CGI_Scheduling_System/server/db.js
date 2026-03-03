const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client is the replacement for the manual 'pg' Pool.
 * It uses the DATABASE_URL from your .env file via prisma.config.ts
 * to manage all 12 of your database models (teams, users, etc.).
 */
const prisma = new PrismaClient();

module.exports = prisma;