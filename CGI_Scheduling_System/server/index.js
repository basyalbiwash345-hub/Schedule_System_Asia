require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// 1. FETCH ALL USERS (PERSISTENT)
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(users);
    } catch (err) {
        console.error("Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to load users from PostgreSQL." });
    }
});

// 2. CREATE NEW USER (SAVES TO DATABASE)
app.post('/api/users', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const newUser = await prisma.users.create({
            data: {
                name: username, // Maps your form's 'username' to the 'name' column
                email: email,
                password_hash: password,
                status: 'active'
            }
        });
        console.log(`✅ User ${newUser.name} saved to database.`);
        res.status(201).json(newUser);
    } catch (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "DB Error: " + err.message });
    }
});

app.listen(port, () => {
    console.log(` Prisma 6 Server live on http://localhost:${port}`);
});