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

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain at least one special character.');
    return errors;
};

const validateUserPayload = (body, isUpdate = false) => {
    const errors = {};
    if (!isUpdate) {
        if (!body.first_name?.trim()) errors.first_name = 'First name is required.';
        if (!body.last_name?.trim()) errors.last_name = 'Last name is required.';
        if (!body.username?.trim()) errors.username = 'Username is required.';
        if (!body.email?.trim()) errors.email = 'Email is required.';
        else if (!validateEmail(body.email)) errors.email = 'Email format is invalid.';
        if (!body.password) errors.password = 'Temporary password is required.';
        else { const pwErrors = validatePassword(body.password); if (pwErrors.length) errors.password = pwErrors.join(' '); }
        if (!body.roles || body.roles.length === 0) errors.roles = 'At least one role is required.';
    } else {
        if (body.email && !validateEmail(body.email)) errors.email = 'Email format is invalid.';
    }
    return errors;
};

const logAction = async (userId, action, entityType, entityId, oldValue = null, newValue = null) => {
    try {
        await prisma.audit_logs.create({ data: { user_id: userId, action, entity_type: entityType, entity_id: entityId, old_value: oldValue, new_value: newValue } });
    } catch (err) { console.error('Audit log failed:', err.message); }
};

const validateRotationPayload = (payload) => {
    const errors = [];
    const name = (payload.name || '').trim();
    const rotationTypeId = parseOptionalInt(payload.rotation_type_id);
    const teamId = parseOptionalInt(payload.team_id);
    const locationId = parseOptionalInt(payload.location_id);
    const startDate = parseRequiredDate(payload.start_date);
    const intervalUnit = payload.interval_unit;
    const intervalCount = payload.interval_count === undefined || payload.interval_count === null || payload.interval_count === '' ? 1 : Number.parseInt(payload.interval_count, 10);
    const status = payload.status || 'active';
    if (!name) errors.push('Rotation name is required.');
    if (!rotationTypeId) errors.push('Rotation type is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!ALLOWED_INTERVAL_UNITS.has(intervalUnit)) errors.push('Interval unit is invalid.');
    if (Number.isNaN(intervalCount) || intervalCount < 1) errors.push('Interval count must be at least 1.');
    if (!ALLOWED_STATUS.has(status)) errors.push('Status is invalid.');
    const hasTeam = teamId !== null; const hasLocation = locationId !== null;
    if (hasTeam === hasLocation) errors.push('Rotation must be scoped to either a team or a location (not both).');
    return { errors, data: { name, rotation_type_id: rotationTypeId, team_id: teamId, location_id: locationId, start_date: startDate, interval_unit: intervalUnit, interval_count: intervalCount, status } };
};

// ── USERS ─────────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({ orderBy: { id: 'asc' }, include: { user_roles: { include: { roles: true } } } });
        res.json(Array.isArray(users) ? users : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const { first_name, last_name, username, email, password, phone, location, team_id, roles } = req.body;
    const validationErrors = validateUserPayload(req.body);
    if (Object.keys(validationErrors).length) return res.status(400).json({ errors: validationErrors });
    try {
        const existingEmail = await prisma.users.findUnique({ where: { email } });
        if (existingEmail) return res.status(400).json({ errors: { email: 'Email is already in use.' } });
        const existingUsername = await prisma.users.findUnique({ where: { username } });
        if (existingUsername) return res.status(400).json({ errors: { username: 'Username is already taken.' } });
        const roleRecords = await prisma.roles.findMany({ where: { id: { in: roles.map(Number) } } });
        if (roleRecords.length !== roles.length) return res.status(400).json({ errors: { roles: 'One or more selected roles are invalid.' } });
        if (team_id) { const team = await prisma.teams.findUnique({ where: { id: Number(team_id) } }); if (!team) return res.status(400).json({ errors: { team_id: 'Selected team is invalid.' } }); }
        const fullName = `${first_name.trim()} ${last_name.trim()}`;
        const newUser = await prisma.users.create({
            data: { first_name: first_name.trim(), last_name: last_name.trim(), name: fullName, username: username.trim(), email: email.trim().toLowerCase(), password_hash: password, phone: phone?.trim() || null, location: location?.trim() || null, team_id: team_id ? Number(team_id) : null, must_change_password: true, status: 'active', user_roles: { create: roles.map(roleId => ({ role_id: Number(roleId) })) } },
            include: { user_roles: { include: { roles: true } } }
        });
        await logAction(null, 'CREATE_USER', 'users', newUser.id, null, { name: fullName, email, username });
        res.status(201).json(newUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { first_name, last_name, username, email, phone, location, team_id, roles } = req.body;
    const validationErrors = validateUserPayload(req.body, true);
    if (Object.keys(validationErrors).length) return res.status(400).json({ errors: validationErrors });
    try {
        const existing = await prisma.users.findUnique({ where: { id: userId } });
        if (!existing) return res.status(404).json({ error: 'User not found.' });
        if (email) { const conflict = await prisma.users.findFirst({ where: { email, NOT: { id: userId } } }); if (conflict) return res.status(400).json({ errors: { email: 'Email is already in use.' } }); }
        if (username) { const conflict = await prisma.users.findFirst({ where: { username, NOT: { id: userId } } }); if (conflict) return res.status(400).json({ errors: { username: 'Username is already taken.' } }); }
        const updateData = {};
        if (first_name) updateData.first_name = first_name.trim();
        if (last_name) updateData.last_name = last_name.trim();
        if (first_name || last_name) updateData.name = `${(first_name || existing.first_name).trim()} ${(last_name || existing.last_name).trim()}`;
        if (username) updateData.username = username.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone !== undefined) updateData.phone = phone?.trim() || null;
        if (location !== undefined) updateData.location = location?.trim() || null;
        if (team_id !== undefined) updateData.team_id = team_id ? Number(team_id) : null;
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: { ...updateData, ...(roles && roles.length > 0 ? { user_roles: { deleteMany: {}, create: roles.map(roleId => ({ role_id: Number(roleId) })) } } : {}) },
            include: { user_roles: { include: { roles: true } } }
        });
        await logAction(null, 'UPDATE_USER', 'users', userId, existing, updatedUser);
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const existing = await prisma.users.findUnique({ where: { id: userId } });
        if (!existing) return res.status(404).json({ error: 'User not found.' });
        await prisma.users.delete({ where: { id: userId } });
        await logAction(null, 'DELETE_USER', 'users', userId, existing, null);
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ROLES ─────────────────────────────────────────────────────────────────────
app.get('/api/roles', async (req, res) => {
    try { const roles = await prisma.roles.findMany({ orderBy: { name: 'asc' } }); res.json(roles); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TEAMS ─────────────────────────────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
    try { const teams = await prisma.teams.findMany({ orderBy: { name: 'asc' }, include: { lead: true } }); res.json(Array.isArray(teams) ? teams : []); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/teams', async (req, res) => {
    try { const { name, color, leadId, description, role, members } = req.body; const team = await prisma.teams.create({ data: { name, color, lead_id: parseOptionalInt(leadId), description, team_role: role, members: members ? JSON.stringify(members) : null }, include: { lead: true } }); res.status(201).json(team); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/teams/:id', async (req, res) => {
    const teamId = parseOptionalInt(req.params.id); const { name, color, leadId, description, role, members } = req.body;
    try { const updatedTeam = await prisma.teams.update({ where: { id: teamId }, data: { name, color, lead_id: parseOptionalInt(leadId), description, team_role: role, members: members ? JSON.stringify(members) : null }, include: { lead: true } }); res.json(updatedTeam); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/teams/:id', async (req, res) => {
    const teamId = parseOptionalInt(req.params.id);
    try { await prisma.teams.delete({ where: { id: teamId } }); res.json({ message: 'Team deleted successfully' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ROTATIONS & METADATA ──────────────────────────────────────────────────────
app.get('/api/rotation-types', async (req, res) => {
    try { const types = await prisma.rotation_types.findMany({ orderBy: { name: 'asc' } }); res.json(types); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/locations', async (req, res) => {
    try { const locs = await prisma.locations.findMany({ orderBy: { name: 'asc' } }); res.json(locs); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/rotations', async (req, res) => {
    try { const rotations = await prisma.rotations.findMany({ include: { rotation_types: true, teams: true, locations: true }, orderBy: { id: 'asc' } }); res.json(Array.isArray(rotations) ? rotations : []); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/rotations', async (req, res) => {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    try { const rotation = await prisma.rotations.create({ data }); res.status(201).json(rotation); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/rotations/:id', async (req, res) => {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    try { const rotation = await prisma.rotations.update({ where: { id: parseInt(req.params.id) }, data }); res.json(rotation); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/rotations/:id', async (req, res) => {
    const rotationId = parseOptionalInt(req.params.id);
    try { await prisma.rotations.delete({ where: { id: rotationId } }); res.json({ message: 'Rotation deleted successfully' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ── STARTUP ROLE SEED
const seedRoles = async () => {
    const count = await prisma.roles.count();
    if (count === 0) {
        await prisma.roles.createMany({
            data: [
                { name: 'Administrator', description: 'Full system access including user and role management.' },
                { name: 'Team Lead / Supervisor', description: 'Manage team members, approve leave requests, and oversee schedules.' },
                { name: 'Rotation Owner', description: 'Create and manage rotation schedules.' },
                { name: 'Employee', description: 'View personal schedule and submit leave requests.' },
            ]
        });
        console.log('Roles seeded.');
    }
};

app.listen(port, async () => {
    console.log('CGI Scheduling Server live on http://localhost:' + port);
    await seedRoles();
});