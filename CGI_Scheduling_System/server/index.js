require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const COMMON_ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'admin';
const COMMON_ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@cgi.com';
const COMMON_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass1!';
const COMMON_ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME?.trim() || 'System';
const COMMON_ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME?.trim() || 'Admin';

if (!JWT_SECRET) {
    console.error('❌ ERROR: JWT_SECRET is not defined in .env file');
    process.exit(1);
}

const rotationRoutes = require('./rotations');

app.use(cors());
app.use(express.json());

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
const authorizeAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token, authorization denied' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles.includes('Administrator')) return res.status(403).json({ error: 'Access denied: Admins only' });
        req.user = decoded;
        next();
    } catch (err) { res.status(401).json({ error: 'Token is not valid' }); }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token, authorization denied' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) { res.status(401).json({ error: 'Token is not valid' }); }
};

app.use('/api/rotations', authenticateToken, rotationRoutes);

// ── HELPERS ───────────────────────────────────────────────────────────────────
const parseOptionalInt = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => { if (!phone) return true; return /^[+]?[\d\s\-().]{7,20}$/.test(phone); };
const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain at least one special character.');
    return errors;
};

const ROLE_PRIORITY = ['Administrator', 'Team Lead / Supervisor', 'Employee'];
const getPrimaryRole = (roleNames = []) => ROLE_PRIORITY.find((role) => roleNames.includes(role)) || roleNames[0] || 'Employee';

const serializeAuthenticatedUser = (user) => {
    const roleNames = user.user_roles?.map((ur) => ur.roles?.name).filter(Boolean) || [];
    return {
        id: user.id, name: user.name, email: user.email, username: user.username,
        teams: user.team_memberships?.map(t => t.id) || [], // <-- UPDATED FOR MANY-TO-MANY
        status: user.status, must_change_password: user.must_change_password, roles: roleNames, primary_role: getPrimaryRole(roleNames),
    };
};

const buildCommonAdminName = () => `${COMMON_ADMIN_FIRST_NAME} ${COMMON_ADMIN_LAST_NAME}`.trim();
const isCommonAdminIdentifier = (identifier = '') => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return normalizedIdentifier === COMMON_ADMIN_USERNAME.toLowerCase() || normalizedIdentifier === COMMON_ADMIN_EMAIL;
};

const hashPassword = async (password) => { const salt = await bcrypt.genSalt(10); return bcrypt.hash(password, salt); };
const verifyStoredPassword = async (storedPasswordHash, password) => {
    if (!storedPasswordHash || !password) return false;
    if (storedPasswordHash === password) return true;
    try { return await bcrypt.compare(password, storedPasswordHash); } catch { return false; }
};

const findUserForAuth = async (identifier) => {
    return prisma.users.findFirst({
        where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
        include: { user_roles: { include: { roles: true } }, team_memberships: true },
    });
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
        if (body.first_name !== undefined && !body.first_name?.trim()) errors.first_name = 'First name cannot be empty.';
        if (body.last_name !== undefined && !body.last_name?.trim()) errors.last_name = 'Last name cannot be empty.';
        if (body.username !== undefined && !body.username?.trim()) errors.username = 'Username cannot be empty.';
        if (body.email !== undefined) { if (!body.email?.trim()) errors.email = 'Email cannot be empty.'; else if (!validateEmail(body.email)) errors.email = 'Email format is invalid.'; }
        if (body.roles !== undefined && body.roles.length === 0) errors.roles = 'At least one role is required.';
    }
    if (body.team_ids !== undefined && !Array.isArray(body.team_ids)) errors.team_ids = 'Team assignments must be an array.';
    if (body.phone && !validatePhone(body.phone)) errors.phone = 'Phone format is invalid. Use format: +1 (555) 000-0000';
    return errors;
};

const logAction = async (userId, action, entityType, entityId, oldValue = null, newValue = null) => {
    try { await prisma.audit_logs.create({ data: { user_id: userId, action, entity_type: entityType, entity_id: entityId, old_value: oldValue, new_value: newValue } }); } catch (err) { console.error('Audit log failed:', err.message); }
};

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const identifier = req.body.identifier?.trim();
    const password = req.body.password;
    if (!identifier || !password) return res.status(400).json({ error: 'Email/username and password are required.' });

    try {
        if (isCommonAdminIdentifier(identifier) && password === COMMON_ADMIN_PASSWORD) {
            const adminUser = await seedDefaultAdmin();
            if (!adminUser) return res.status(500).json({ error: 'Administrator role is unavailable.' });
            const token = jwt.sign({ id: adminUser.id, username: adminUser.username, roles: ['Administrator'] }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, user: serializeAuthenticatedUser(adminUser) });
        }

        const user = await findUserForAuth(identifier);
        const passwordMatches = await verifyStoredPassword(user?.password_hash, password);

        if (!user || !passwordMatches) return res.status(401).json({ error: 'Invalid email/username or password.' });
        if (user.status && user.status !== 'active') return res.status(403).json({ error: 'This account is inactive.' });
        if (user.password_hash === password) await prisma.users.update({ where: { id: user.id }, data: { password_hash: await hashPassword(password) } });

        const roleNames = user.user_roles?.map((ur) => ur.roles?.name).filter(Boolean) || [];
        const token = jwt.sign({ id: user.id, username: user.username, roles: roleNames }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: serializeAuthenticatedUser(user) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/change-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.users.findUnique({ where: { id: decoded.id }, include: { user_roles: { include: { roles: true } }, team_memberships: true } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const isMatch = await verifyStoredPassword(user.password_hash, currentPassword);
        if (!isMatch) return res.status(400).json({ error: 'Current/Temporary password is incorrect.' });
        const pwErrors = validatePassword(newPassword);
        if (pwErrors.length) return res.status(400).json({ error: pwErrors.join(' ') });

        const newHashed = await hashPassword(newPassword);
        const updatedUser = await prisma.users.update({
            where: { id: user.id }, data: { password_hash: newHashed, must_change_password: false },
            include: { user_roles: { include: { roles: true } }, team_memberships: true }
        });
        await logAction(user.id, 'CHANGE_PASSWORD', 'users', user.id);
        res.json(serializeAuthenticatedUser(updatedUser));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── USERS ─────────────────────────────────────────────────────────────────────
app.get('/api/users', authenticateToken,async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            orderBy: { id: 'asc' },
            include: { user_roles: { include: { roles: true } }, team_memberships: true },
        });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/:id', authenticateToken,async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { user_roles: { include: { roles: true } }, team_memberships: true },
        });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', authorizeAdmin, async (req, res) => {
    const { first_name, last_name, username, email, password, phone, location, team_ids, roles } = req.body;
    const validationErrors = validateUserPayload(req.body);
    if (Object.keys(validationErrors).length) return res.status(400).json({ errors: validationErrors });
    try {
        const existingEmail = await prisma.users.findUnique({ where: { email } });
        if (existingEmail) return res.status(400).json({ errors: { email: 'Email is already in use.' } });
        const existingUsername = await prisma.users.findUnique({ where: { username } });
        if (existingUsername) return res.status(400).json({ errors: { username: 'Username is already taken.' } });

        const fullName = `${first_name.trim()} ${last_name.trim()}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPw = await bcrypt.hash(password, salt);

        const newUser = await prisma.users.create({
            data: {
                first_name: first_name.trim(), last_name: last_name.trim(),
                name: fullName, username: username.trim(),
                email: email.trim().toLowerCase(), password_hash: hashedPw,
                phone: phone?.trim() || null, location: location?.trim() || null,
                must_change_password: true, status: 'active',
                team_memberships: team_ids && team_ids.length > 0 ? { connect: team_ids.map(id => ({ id: Number(id) })) } : undefined,
                user_roles: { create: roles.map(roleId => ({ role_id: Number(roleId) })) },
            },
            include: { user_roles: { include: { roles: true } }, team_memberships: true },
        });
        await logAction(null, 'CREATE_USER', 'users', newUser.id, null, { name: fullName, email, username });
        res.status(201).json(newUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', authorizeAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { first_name, last_name, username, email, phone, location, team_ids, roles } = req.body;
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

        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: {
                ...updateData,
                ...(team_ids !== undefined ? { team_memberships: { set: [], connect: team_ids.map(id => ({ id: Number(id) })) } } : {}),
                ...(roles && roles.length > 0 ? { user_roles: { deleteMany: {}, create: roles.map(roleId => ({ role_id: Number(roleId) })) } } : {}),
            },
            include: { user_roles: { include: { roles: true } }, team_memberships: true },
        });
        await logAction(null, 'UPDATE_USER', 'users', userId, existing, updatedUser);
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', authorizeAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const existing = await prisma.users.findUnique({ where: { id: userId }, include: { user_roles: { include: { roles: true } } } });
        if (!existing) return res.status(404).json({ error: 'User not found.' });

        const isAdmin = existing.user_roles.some(ur => ur.roles.name === 'Administrator');
        if (isAdmin) {
            const adminCount = await prisma.user_roles.count({ where: { roles: { name: 'Administrator' } } });
            if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the only Administrator.' });
        }

        const activeAssignments = await prisma.rotation_assignments.count({ where: { user_id: userId, status: 'scheduled', end_time: { gte: new Date() } } });
        if (activeAssignments > 0) return res.status(400).json({ error: `Cannot delete user with ${activeAssignments} active shift assignment(s).` });

        await prisma.users.delete({ where: { id: userId } });
        await logAction(null, 'DELETE_USER', 'users', userId, existing, null);
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ROLES & TYPES ────────────────────────────────────────────────────────────
app.get('/api/roles', authenticateToken, async (req, res) => {
    try { res.json(await prisma.roles.findMany({ orderBy: { name: 'asc' } })); } catch (err) { res.status(500).json({ error: err.message }); }
});

const DEFAULT_ROTATION_TYPES = [
    { name: '24/7 SPOC IT Services',    code: 'IT', default_interval_unit: 'week' },
    { name: '24/7 SPOC CDO Stewards',   code: 'CD', default_interval_unit: 'week' },
    { name: '24/7 SPOC CDO Escalation', code: 'ES', default_interval_unit: 'week' },
    { name: 'Mountain Time Rotation',   code: 'MT', default_interval_unit: 'week' },
    { name: 'Working Stat',             code: 'WS', default_interval_unit: 'day'  },
    { name: 'Encana Friday',            code: 'EF', default_interval_unit: 'week' },
    { name: 'Service Desk',             code: 'SD', default_interval_unit: 'week' },
    { name: 'New',                      code: null, default_interval_unit: 'week' },
];


app.get('/api/rotation-types', authenticateToken,async (req, res) => {
    try {
        let types = await prisma.rotation_types.findMany({ orderBy: { id: 'asc' } });
        if (types.length === 0) { await prisma.rotation_types.createMany({ data: DEFAULT_ROTATION_TYPES }); types = await prisma.rotation_types.findMany({ orderBy: { id: 'asc' } }); }
        res.json(types);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TEAMS ─────────────────────────────────────────────────────────────────────
app.get('/api/teams', authenticateToken, async (req, res) => {
    try {
        const teams = await prisma.teams.findMany({
            orderBy: { name: 'asc' },
            include: { lead: true, user_memberships: true },
        });
        res.json(Array.isArray(teams) ? teams : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/teams', authorizeAdmin, async (req, res) => {
    const { name, color, leadId, members, description } = req.body;
    try {
        const memberIds = new Set(members ? members.map(id => parseInt(id)) : []);
        if (leadId) memberIds.add(parseInt(leadId));

        const newTeam = await prisma.teams.create({
            data: {
                name, color, description,
                lead_id: leadId ? parseInt(leadId) : null,
                user_memberships: { connect: Array.from(memberIds).map(id => ({ id })) }
            },
            include: { lead: true, user_memberships: true }
        });
        res.json(newTeam);
    } catch (err) { res.status(500).json({ error: 'Failed to create team.' }); }
});

app.put('/api/teams/:id', authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, color, leadId, members, description } = req.body;
    try {
        const memberIds = new Set(members ? members.map(mid => parseInt(mid)) : []);
        if (leadId) memberIds.add(parseInt(leadId));

        const updatedTeam = await prisma.teams.update({
            where: { id: parseInt(id) },
            data: {
                name, color, description,
                lead_id: leadId ? parseInt(leadId) : null,
                user_memberships: { set: [], connect: Array.from(memberIds).map(userId => ({ id: userId })) }
            },
            include: { lead: true, user_memberships: true }
        });
        res.json(updatedTeam);
    } catch (err) { res.status(500).json({ error: 'Failed to update team.' }); }
});

app.delete('/api/teams/:id', authorizeAdmin, async (req, res) => {
    try { await prisma.teams.delete({ where: { id: parseOptionalInt(req.params.id) } }); res.json({ message: 'Team deleted successfully' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── LOCATIONS & SCHEDULE ──────────────────────────────────────────────────────
app.get('/api/locations', authenticateToken, async (req, res) => {
    try { res.json(await prisma.locations.findMany({ orderBy: { id: 'asc' } })); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/schedule', async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month query param required (e.g. 2026-01)' });
    const [year, mon] = month.split('-').map(Number);
    try {
        // Use UTC boundaries so entries stored at UTC midnight are always matched correctly
        const gte = new Date(Date.UTC(year, mon - 1, 1));
        const lte = new Date(Date.UTC(year, mon - 1, new Date(year, mon, 0).getDate(), 23, 59, 59, 999));
        const entries = await prisma.rotation_assignments.findMany({
            where: { start_time: { gte, lte } },
            orderBy: { start_time: 'asc' },
        });
        res.json(entries.map(e => ({ id: e.id, user_id: e.user_id, date: e.start_time.toISOString().split('T')[0], code: e.status_code })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/schedule', async (req, res) => {
    const { user_id, date, code } = req.body;
    if (!user_id || !date || !code) return res.status(400).json({ error: 'user_id, date, and code are required.' });
    const dayStart = new Date(date + 'T00:00:00.000Z');
    try {
        const existing = await prisma.rotation_assignments.findFirst({ where: { user_id: Number(user_id), start_time: { gte: dayStart, lte: new Date(date + 'T23:59:59.999Z') } } });
        let entry;
        if (existing) entry = await prisma.rotation_assignments.update({ where: { id: existing.id }, data: { status_code: code } });
        else entry = await prisma.rotation_assignments.create({ data: { user_id: Number(user_id), start_time: dayStart, end_time: new Date(date + 'T23:59:59.999Z'), status_code: code, status: 'scheduled', slot: 'full' } });
        res.json({ id: entry.id, user_id: entry.user_id, date, code: entry.status_code });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/schedule/:id', async (req, res) => {
    try { await prisma.rotation_assignments.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Schedule entry deleted' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/matrix-users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            where: { status: 'active' },
            orderBy: { name: 'asc' },
            include: {
                team_memberships: {
                    select: { id: true, name: true, color: true }
                }
            },
        });

        // We map the data so the frontend still receives a structure it understands.
        // Even if the user has multiple teams, we provide the 'primary' (first) one
        // so the current Matrix logic doesn't break.
        const result = users.map(u => ({
            id: u.id,
            name: u.name,
            // Provide the array for future-proofing
            teams: u.team_memberships,
            // Provide team_id for backward compatibility with the current MatrixView
            team_id: u.team_memberships.length > 0 ? u.team_memberships[0].id : null,
            // Provide team name for the labels in the Matrix
            team_name: u.team_memberships.length > 0 ? u.team_memberships[0].name : 'Unassigned'
        }));

        res.json(result);
    } catch (err) {
        console.error('Matrix users fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});
// ── SEED ──────────────────────────────────────────────────────────────────────
const seedRoles = async () => {
    const count = await prisma.roles.count();
    if (count === 0) {
        await prisma.roles.createMany({ data: [ { name: 'Administrator', description: 'Full system access.' }, { name: 'Team Lead / Supervisor', description: 'Manage team members.' }, { name: 'Employee', description: 'View personal schedule.' } ] });
        console.log('✅ Roles seeded.');
    }
};

const seedDefaultAdmin = async () => {
    const adminRole = await prisma.roles.findFirst({ where: { name: 'Administrator' } });
    if (!adminRole) return;

    // THE FIX: We must include the user_roles and team_memberships when checking for the existing admin!
    const existingAdmin = await prisma.users.findFirst({
        where: { OR: [ { email: COMMON_ADMIN_EMAIL }, { username: COMMON_ADMIN_USERNAME } ] },
        include: { user_roles: { include: { roles: true } }, team_memberships: true }
    });

    if (existingAdmin) {
        await prisma.users.update({ where: { id: existingAdmin.id }, data: { must_change_password: false } });
        return existingAdmin; // Now this returns with your Admin role safely attached!
    } else {
        const admin = await prisma.users.create({
            data: {
                first_name: COMMON_ADMIN_FIRST_NAME,
                last_name: COMMON_ADMIN_LAST_NAME,
                name: buildCommonAdminName(),
                username: COMMON_ADMIN_USERNAME,
                email: COMMON_ADMIN_EMAIL,
                password_hash: await hashPassword(COMMON_ADMIN_PASSWORD),
                must_change_password: false,
                status: 'active',
                user_roles: { create: [{ role_id: adminRole.id }] }
            }
        });
        return prisma.users.findUnique({
            where: { id: admin.id },
            include: { user_roles: { include: { roles: true } }, team_memberships: true }
        });
    }
};

const seedExcelData = async () => {
    const teamCount = await prisma.teams.count();
    if (teamCount > 0) return;

    const teamNames = [
        { name: 'CDO FDN Subsurface and Land', color: '#e31937' }, { name: 'CDO FDN Business Services', color: '#2563eb' }, { name: 'CDO FDN Ops App Support', color: '#059669' }, { name: 'CDO FDN Custom App Support', color: '#7c3aed' }, { name: 'ServiceNow', color: '#d97706' }, { name: 'IT Apps', color: '#db2777' }, { name: 'Platforms', color: '#0891b2' }, { name: 'Service Desk', color: '#65a30d' }, { name: 'Lead', color: '#dc2626' }, { name: 'ALM', color: '#0284c7' }, { name: 'MMF/EHS/Reserves/IT+/Incident', color: '#16a34a' }, { name: 'SNOW, UIPath, PF', color: '#9333ea' }, { name: 'IT PCO', color: '#ca8a04' }, { name: 'IT BA', color: '#0f766e' }, { name: 'CDO PCO', color: '#b45309' }, { name: 'Change', color: '#4338ca' }, { name: 'Developer', color: '#be123c' }, { name: 'SDM', color: '#0369a1' },
    ];

    const createdTeams = {};
    for (const t of teamNames) {
        const team = await prisma.teams.create({ data: { name: t.name, color: t.color, status: 'active' } });
        createdTeams[t.name] = team.id;
    }

    const employeeRole = await prisma.roles.findFirst({ where: { name: 'Employee' } });

    // Auto-generate 54 realistic users (3 per team)
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Cameron', 'Drew', 'Harper', 'Jesse', 'Kendall', 'Logan', 'Micah', 'Peyton', 'Reese', 'Rowan', 'Skyler', 'Charlie', 'Dakota', 'Finley', 'Hayden', 'Parker'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

    let userCounter = 0;
    for (const teamName of Object.keys(createdTeams)) {
        const teamId = createdTeams[teamName];

        // Loop 3 times per team
        for (let i = 0; i < 3; i++) {
            const fName = firstNames[userCounter % firstNames.length];
            const lName = lastNames[(userCounter * 3) % lastNames.length];
            const fullName = `${fName} ${lName}`;
            const username = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}`;

            const seedHash = await bcrypt.hash('TempPass1!', await bcrypt.genSalt(10));
            try {
                await prisma.users.create({
                    data: {
                        first_name: fName,
                        last_name: lName,
                        name: fullName,
                        username: username,
                        email: `${username}@cgi.com`,
                        password_hash: seedHash,
                        must_change_password: true,
                        status: 'active',
                        team_memberships: { connect: [{ id: teamId }] },
                        ...(employeeRole ? { user_roles: { create: [{ role_id: employeeRole.id }] } } : {}),
                    },
                });
            } catch (e) { console.error(`Failed to seed user ${fullName}:`, e.message); }

            userCounter++;
        }
    }
    console.log(`✅ ${userCounter} Employees generated and assigned across all teams.`);
};

const seedSampleRotations = async () => {
    const count = await prisma.rotations.count();
    if (count > 0) return;

    const sdTeam = await prisma.teams.findFirst({ where: { name: 'Service Desk' } });
    const opsTeam = await prisma.teams.findFirst({ where: { name: 'CDO FDN Ops App Support' } });

    // Fetch users using the new many-to-many relationship
    let sdUsers = [];
    if (sdTeam) sdUsers = await prisma.users.findMany({ where: { team_memberships: { some: { id: sdTeam.id } } } });

    let opsUsers = [];
    if (opsTeam) opsUsers = await prisma.users.findMany({ where: { team_memberships: { some: { id: opsTeam.id } } } });

    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. Service Desk Weekly Rotation
    if (sdTeam && sdUsers.length > 0) {
        const rot = await prisma.rotations.create({
            data: {
                name: 'Team-Level', team_id: sdTeam.id, interval_unit: 'week', interval_count: 1,
                start_date: today, end_date: new Date(new Date(today).setMonth(today.getMonth() + 3)),
                status: 'active', assigned_member_ids: sdUsers.map(u => u.id), allow_double_booking: false
            }
        });

        // Schedule first week
        for(let i=0; i<7; i++) {
            const d = new Date(today); d.setDate(d.getDate() + i);
            const e = new Date(d); e.setHours(23,59,59,999);

            for(const u of sdUsers) {
                await prisma.rotation_assignments.create({
                    data: { rotation_id: rot.id, user_id: u.id, start_time: d, end_time: e, status: 'scheduled', status_code: 'P', slot: 'full' }
                });
            }
        }
    }

    // 2. Ops Daily On-Call
    if (opsTeam && opsUsers.length > 0) {
        const rot = await prisma.rotations.create({
            data: {
                name: 'On-Call', team_id: opsTeam.id, interval_unit: 'day', interval_count: 1,
                start_date: today, end_date: new Date(new Date(today).setMonth(today.getMonth() + 1)),
                status: 'active', assigned_member_ids: opsUsers.map(u => u.id), allow_double_booking: false
            }
        });

        // Schedule alternate days
        for(let i=0; i<7; i++) {
            const d = new Date(today); d.setDate(d.getDate() + i);
            const e = new Date(d); e.setHours(23,59,59,999);

            const u = opsUsers[i % opsUsers.length]; // Alternate people
            await prisma.rotation_assignments.create({
                data: { rotation_id: rot.id, user_id: u.id, start_time: d, end_time: e, status: 'scheduled', status_code: 'O', slot: 'full' }
            });
        }
    }
    console.log('✅ Sample rotations & schedule seeded.');
};

// ── START SERVER ──────────────────────────────────────────────────────────────
// Map rotation type names to their schedule codes (used for auto-migration)
const ROTATION_TYPE_CODE_MAP = {
    '24/7 spoc it services':    'IT',
    '24/7 spoc cdo stewards':   'CD',
    '24/7 spoc cdo escalation': 'ES',
    'mountain time rotation':   'MT',
    'working stat':             'WS',
    'encana friday':            'EF',
    'service desk':             'SD',
};

const migrateRotationTypesCodes = async () => {
    try {
        // Add code column to rotation_types if it doesn't exist yet
        await prisma.$executeRawUnsafe(
            `ALTER TABLE rotation_types ADD COLUMN IF NOT EXISTS code VARCHAR(10);`
        );
        // Add code column to rotations if it doesn't exist yet
        await prisma.$executeRawUnsafe(
            `ALTER TABLE rotations ADD COLUMN IF NOT EXISTS code VARCHAR(10);`
        );
        // Populate rotation_types.code for any row that still has NULL based on the name
        const types = await prisma.$queryRaw`SELECT id, name FROM rotation_types WHERE code IS NULL`;
        for (const t of types) {
            const code = ROTATION_TYPE_CODE_MAP[(t.name || '').toLowerCase().trim()] || null;
            if (code) {
                await prisma.$executeRaw`UPDATE rotation_types SET code = ${code} WHERE id = ${t.id}`;
            }
        }
        // Back-fill rotations.code from their rotation type for any existing rotations
        await prisma.$executeRawUnsafe(`
            UPDATE rotations r
            SET code = rt.code
            FROM rotation_types rt
            WHERE r.rotation_type_id = rt.id
              AND r.code IS NULL
              AND rt.code IS NOT NULL;
        `);
        console.log('✅ rotation_types.code and rotations.code columns ensured.');
    } catch (err) {
        console.error('⚠️  rotation_types migration warning:', err.message);
    }
};

app.listen(port, async () => {
    console.log(`🚀 CGI Scheduling Server live on http://localhost:${port}`);
    await migrateRotationTypesCodes();
    await seedRoles();
    const result = await seedDefaultAdmin();
    if (result) console.log('🔑 Admin User Ready:', result.username);
    await seedExcelData();
    await seedSampleRotations();
});