require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

const app = express();
const port = 5000;

// ✅ IMPORT ROUTES
const rotationRoutes = require('./rotations');

app.use(cors());
app.use(express.json());

// ✅ USE ROUTES
app.use('/api/rotations', rotationRoutes);

// ───────────────── HELPERS ─────────────────
const parseOptionalInt = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length < 8)
        errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password))
        errors.push('Must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password))
        errors.push('Must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password))
        errors.push('Must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(password))
        errors.push('Must contain at least one special character.');
    return errors;
};

const validateUserPayload = (body, isUpdate = false) => {
    const errors = {};

    if (!isUpdate) {
        if (!body.first_name?.trim())
            errors.first_name = 'First name is required.';
        if (!body.last_name?.trim())
            errors.last_name = 'Last name is required.';
        if (!body.username?.trim())
            errors.username = 'Username is required.';
        if (!body.email?.trim())
            errors.email = 'Email is required.';
        else if (!validateEmail(body.email))
            errors.email = 'Email format is invalid.';
        if (!body.password)
            errors.password = 'Temporary password is required.';
        else {
            const pwErrors = validatePassword(body.password);
            if (pwErrors.length)
                errors.password = pwErrors.join(' ');
        }
        if (!body.roles || body.roles.length === 0)
            errors.roles = 'At least one role is required.';
    } else {
        if (body.email && !validateEmail(body.email))
            errors.email = 'Email format is invalid.';
    }

    return errors;
};

const logAction = async (
    userId,
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = null
) => {
    try {
        await prisma.audit_logs.create({
            data: {
                user_id: userId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                old_value: oldValue,
                new_value: newValue,
            },
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

// ───────────────── USERS ─────────────────
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            orderBy: { id: 'asc' },
            include: { user_roles: { include: { roles: true } } },
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const {
        first_name,
        last_name,
        username,
        email,
        password,
        phone,
        location,
        team_id,
        roles,
    } = req.body;

    const validationErrors = validateUserPayload(req.body);
    if (Object.keys(validationErrors).length)
        return res.status(400).json({ errors: validationErrors });

    try {
        const existingEmail = await prisma.users.findUnique({
            where: { email },
        });
        if (existingEmail)
            return res
                .status(400)
                .json({ errors: { email: 'Email already in use.' } });

        const existingUsername = await prisma.users.findUnique({
            where: { username },
        });
        if (existingUsername)
            return res
                .status(400)
                .json({ errors: { username: 'Username taken.' } });

        const newUser = await prisma.users.create({
            data: {
                first_name,
                last_name,
                name: `${first_name} ${last_name}`,
                username,
                email,
                password_hash: password,
                phone,
                location,
                team_id: team_id ? Number(team_id) : null,
                status: 'active',
                must_change_password: true,
                user_roles: {
                    create: roles.map((r) => ({ role_id: Number(r) })),
                },
            },
            include: { user_roles: { include: { roles: true } } },
        });

        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: req.body,
        });

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await prisma.users.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────── ROLES ─────────────────
app.get('/api/roles', async (req, res) => {
    try {
        const roles = await prisma.roles.findMany();
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ROTATION TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_ROTATION_TYPES = [
    { name: 'Team-Level', default_interval_unit: 'week' },
    { name: 'Sub-Team', default_interval_unit: 'week' },
    { name: 'On-Call', default_interval_unit: 'day' },
    { name: 'Business Domain', default_interval_unit: 'week' },
    { name: 'Cross-Team Analyst', default_interval_unit: 'week' },
];

app.get('/api/rotation-types', async (req, res) => {
    try {
        let types = await prisma.rotation_types.findMany({
            orderBy: { id: 'asc' },
        });
        if (types.length === 0) {
            await prisma.rotation_types.createMany({
                data: DEFAULT_ROTATION_TYPES,
            });
            types = await prisma.rotation_types.findMany({
                orderBy: { id: 'asc' },
            });
        }
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────── TEAMS ─────────────────
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await prisma.teams.findMany({
            include: { lead: true },
        });
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LOCATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/locations', async (req, res) => {
    try {
        const locations = await prisma.locations.findMany({
            orderBy: { id: 'asc' },
        });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────── SCHEDULE ─────────────────
app.get('/api/schedule', async (req, res) => {
    const { month } = req.query;

    if (!month)
        return res
            .status(400)
            .json({ error: 'month required (YYYY-MM)' });

    const [year, mon] = month.split('-').map(Number);

    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);

    try {
        const entries = await prisma.rotation_assignments.findMany({
            where: { start_time: { gte: start, lte: end } },
        });

        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────── START SERVER ─────────────────
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
