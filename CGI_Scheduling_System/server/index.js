require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const ALLOWED_INTERVAL_UNITS = new Set(['day', 'week', 'biweek', 'month']);
const ALLOWED_STATUS = new Set(['active', 'inactive']);

const parseOptionalInt = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const parseRequiredDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const validateRotationPayload = (payload) => {
    const errors = [];
    const name = (payload.name || '').trim();
    const rotationTypeId = parseOptionalInt(payload.rotation_type_id);
    const teamId = parseOptionalInt(payload.team_id);
    const locationId = parseOptionalInt(payload.location_id);
    const startDate = parseRequiredDate(payload.start_date);
    const intervalUnit = payload.interval_unit;
    const intervalCount = payload.interval_count === undefined || payload.interval_count === null || payload.interval_count === ''
        ? 1
        : Number.parseInt(payload.interval_count, 10);
    const status = payload.status || 'active';

    if (!name) errors.push('Rotation name is required.');
    if (!rotationTypeId) errors.push('Rotation type is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!ALLOWED_INTERVAL_UNITS.has(intervalUnit)) errors.push('Interval unit is invalid.');
    if (Number.isNaN(intervalCount) || intervalCount < 1) errors.push('Interval count must be at least 1.');
    if (!ALLOWED_STATUS.has(status)) errors.push('Status is invalid.');

    const hasTeam = teamId !== null;
    const hasLocation = locationId !== null;
    if (hasTeam === hasLocation) {
        errors.push('Rotation must be scoped to either a team or a location (not both).');
    }

    return {
        errors,
        data: {
            name,
            rotation_type_id: rotationTypeId,
            team_id: teamId,
            location_id: locationId,
            start_date: startDate,
            interval_unit: intervalUnit,
            interval_count: intervalCount,
            status
        }
    };
};

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

// ROTATION SUPPORTING DATA
app.get('/api/rotation-types', async (req, res) => {
    try {
        const rotationTypes = await prisma.rotation_types.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(rotationTypes);
    } catch (err) {
        console.error("Rotation Types Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to load rotation types." });
    }
});

app.get('/api/teams', async (req, res) => {
    try {
        const teams = await prisma.teams.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(teams);
    } catch (err) {
        console.error("Teams Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to load teams." });
    }
});

app.get('/api/locations', async (req, res) => {
    try {
        const locations = await prisma.locations.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(locations);
    } catch (err) {
        console.error("Locations Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to load locations." });
    }
});

// ROTATIONS CRUD
app.get('/api/rotations', async (req, res) => {
    try {
        const rotations = await prisma.rotations.findMany({
            orderBy: { id: 'asc' },
            include: {
                rotation_types: true,
                teams: true,
                locations: true
            }
        });
        res.json(rotations);
    } catch (err) {
        console.error("Rotations Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to load rotations." });
    }
});

app.post('/api/rotations', async (req, res) => {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) {
        return res.status(400).json({ error: errors.join(' ') });
    }

    try {
        const rotation = await prisma.rotations.create({
            data
        });
        res.status(201).json(rotation);
    } catch (err) {
        console.error("Rotation Create Error:", err.message);
        res.status(500).json({ error: "Failed to create rotation." });
    }
});

app.put('/api/rotations/:id', async (req, res) => {
    const rotationId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(rotationId)) {
        return res.status(400).json({ error: "Invalid rotation id." });
    }

    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) {
        return res.status(400).json({ error: errors.join(' ') });
    }

    try {
        const rotation = await prisma.rotations.update({
            where: { id: rotationId },
            data
        });
        res.json(rotation);
    } catch (err) {
        console.error("Rotation Update Error:", err.message);
        res.status(500).json({ error: "Failed to update rotation." });
    }
});

app.delete('/api/rotations/:id', async (req, res) => {
    const rotationId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(rotationId)) {
        return res.status(400).json({ error: "Invalid rotation id." });
    }

    try {
        await prisma.rotations.delete({
            where: { id: rotationId }
        });
        res.json({ ok: true });
    } catch (err) {
        console.error("Rotation Delete Error:", err.message);
        res.status(500).json({ error: "Failed to delete rotation." });
    }
});

app.listen(port, () => {
    console.log(` Prisma 6 Server live on http://localhost:${port}`);
});
