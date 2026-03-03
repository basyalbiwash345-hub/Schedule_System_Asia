const express = require('express');
const prisma = require('./db'); // Imports your new Prisma Client
const app = express();
const port = 5000;

// Middleware to parse JSON (essential for React-to-Node communication)
app.use(express.json());

// 1. Basic Health Check
app.get('/', (req, res) => {
    res.send('CGI Scheduling System API is running!');
});

// 2. Test Route: Fetch all Teams (e.g., Team Asia)
app.get('/api/teams', async (req, res) => {
    try {
        // Prisma automatically knows your table structure
        const allTeams = await prisma.teams.findMany();
        res.json(allTeams);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Could not fetch teams from the database." });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});