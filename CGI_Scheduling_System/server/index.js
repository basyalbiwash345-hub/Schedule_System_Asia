require('dotenv').config();
const express = require('express');
const prisma = require('./db'); // 1. Make sure this is NOT commented out
const app = express();
const port = 5000;

app.use(express.json());

// 2. This is your root route (Working!)
app.get('/', (req, res) => {
    res.send('CGI Scheduling System API is running!');
});

// 3. Re-enable this route
app.get('/api/teams', async (req, res) => {
    // If Prisma failed to load, don't try to call findMany()
    if (!prisma.teams) {
        return res.status(500).json({ error: "Database connection is not ready." });
    }

    try {
        const allTeams = await prisma.teams.findMany();
        res.json(allTeams);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Could not fetch teams." });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});