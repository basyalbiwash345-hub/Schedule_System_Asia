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
        ? 1 : Number.parseInt(payload.interval_count, 10);
    const status = payload.status || 'active';

    if (!name) errors.push('Rotation name is required.');
    if (!rotationTypeId) errors.push('Rotation type is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!ALLOWED_INTERVAL_UNITS.has(intervalUnit)) errors.push('Interval unit is invalid.');
    if (Number.isNaN(intervalCount) || intervalCount < 1) errors.push('Interval count must be at least 1.');
    if (!ALLOWED_STATUS.has(status)) errors.push('Status is invalid.');

    const hasTeam = teamId !== null;
    const hasLocation = locationId !== null;
    if (hasTeam === hasLocation) errors.push('Rotation must be scoped to either a team or a location (not both).');

    return {
        errors,
        data: { name, rotation_type_id: rotationTypeId, team_id: teamId, location_id: locationId, start_date: startDate, interval_unit: intervalUnit, interval_count: intervalCount, status }
    };
};

// --- USERS ---
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({ orderBy: { id: 'asc' } });
        res.json(Array.isArray(users) ? users : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const newUser = await prisma.users.create({
            data: { name: username, email, password_hash: password, status: 'active' }
        });
        res.status(201).json(newUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    const { username, email } = req.body;
    try {
        const updatedUser = await prisma.users.update({
            where: { id: parseInt(req.params.id) },
            data: { name: username, email }
        });
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await prisma.users.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TEAMS ---
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await prisma.teams.findMany({
            orderBy: { name: 'asc' },
            include: { lead: true }
        });
        res.json(Array.isArray(teams) ? teams : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/teams', async (req, res) => {
    try {
        const { name, color, leadId, description, role, members } = req.body;
        const team = await prisma.teams.create({
            data: {
                name,
                color,
                lead_id: parseOptionalInt(leadId),
                description,
                team_role: role,
                members: members ? JSON.stringify(members) : null
            },
            include: { lead: true }
        });
        res.status(201).json(team);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/teams/:id', async (req, res) => {
    const teamId = parseOptionalInt(req.params.id);
    const { name, color, leadId, description, role, members } = req.body;
    try {
        const updatedTeam = await prisma.teams.update({
            where: { id: teamId },
            data: {
                name,
                color,
                lead_id: parseOptionalInt(leadId),
                description,
                team_role: role,
                members: members ? JSON.stringify(members) : null
            },
            include: { lead: true }
        });
        res.json(updatedTeam);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/teams/:id', async (req, res) => {
    const teamId = parseOptionalInt(req.params.id);
    try {
        await prisma.teams.delete({ where: { id: teamId } });
        res.json({ message: 'Team deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROTATIONS & METADATA ---
app.get('/api/rotation-types', async (req, res) => {
    try {
        const types = await prisma.rotation_types.findMany({ orderBy: { name: 'asc' } });
        res.json(types);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations', async (req, res) => {
    try {
        const locs = await prisma.locations.findMany({ orderBy: { name: 'asc' } });
        res.json(locs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/rotations', async (req, res) => {
    try {
        const rotations = await prisma.rotations.findMany({
            include: { rotation_types: true, teams: true, locations: true },
            orderBy: { id: 'asc' }
        });
        res.json(Array.isArray(rotations) ? rotations : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rotations', async (req, res) => {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    try {
        const rotation = await prisma.rotations.create({ data });
        res.status(201).json(rotation);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/rotations/:id', async (req, res) => {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    try {
        const rotation = await prisma.rotations.update({
            where: { id: parseInt(req.params.id) },
            data
        });
        res.json(rotation);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/rotations/:id', async (req, res) => {
    const rotationId = parseOptionalInt(req.params.id);
    try {
        await prisma.rotations.delete({ where: { id: rotationId } });
        res.json({ message: 'Rotation deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => console.log(`🚀 CGI Scheduling Server live on http://localhost:${port}`));