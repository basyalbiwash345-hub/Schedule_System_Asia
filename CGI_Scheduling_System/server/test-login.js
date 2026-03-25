const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
    try {
        console.log('\n🔍 Checking admin user in database...\n');
        
        const admin = await prisma.users.findFirst({
            where: { username: 'admin' },
            include: { user_roles: { include: { roles: true } } },
        });
        
        if (!admin) {
            console.log('❌ Admin user not found in database');
            return;
        }
        
        console.log('✅ Admin user found:');
        console.log('   ID:', admin.id);
        console.log('   Username:', admin.username);
        console.log('   Email:', admin.email);
        console.log('   Name:', admin.name);
        console.log('   Status:', admin.status);
        console.log('   Roles:', admin.user_roles.map(ur => ur.roles.name).join(', '));
        console.log('\n🔑 Password hash in DB:', admin.password_hash.substring(0, 20) + '...');
        
        // Test password comparison
        const testPassword = 'AdminPass1!';
        console.log('\n🧪 Testing password comparison:');
        console.log('   Input password:', testPassword);
        
        const matches = await bcrypt.compare(testPassword, admin.password_hash);
        console.log('   Password matches:', matches ? '✅ YES' : '❌ NO');
        
        if (!matches) {
            console.log('\n❌ Password hash mismatch!');
            console.log('   The stored hash may have been created with different salt/iterations');
        } else {
            console.log('\n✅ Password verification successful!');
            console.log('   If login still fails, the issue is elsewhere (JWT, etc)');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testLogin();
