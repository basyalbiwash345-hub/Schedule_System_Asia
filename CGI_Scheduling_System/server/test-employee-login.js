const fetch = require('node-fetch');

async function testEmployeeLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'dansaulnier82', password: 'TempPass1!' })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Employee login successful!');
            console.log('User:', data.user.name);
            console.log('Roles:', data.user.roles.join(', '));
        } else {
            console.log('❌ Login failed:', data.error);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testEmployeeLogin();