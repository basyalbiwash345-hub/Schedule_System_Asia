require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass1!';

async function listUsers() {
    try {
        console.log('\n👥 Available Users for Login:\n');
        console.log('=' .repeat(80));

        const users = await prisma.users.findMany({
            include: {
                user_roles: { include: { roles: true } }
            },
            orderBy: { id: 'asc' }
        });

        // Get teams separately
        const teams = await prisma.teams.findMany();
        const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));

        users.forEach(user => {
            console.log(`\n📋 User ID: ${user.id}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Password: ${user.username === adminUsername ? adminPassword : 'TempPass1!'}`);
            console.log(`   Role: ${user.user_roles.map(ur => ur.roles.name).join(', ')}`);
            console.log(`   Team: ${user.team_id ? teamMap[user.team_id] || 'Unknown Team' : 'Unassigned'}`);
            console.log(`   Status: ${user.status}`);
        });

        console.log('\n' + '=' .repeat(80));
        console.log(`\n📊 Total users: ${users.length}`);
        console.log('\n🔑 Note: All seeded users use password "TempPass1!" except admin');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
