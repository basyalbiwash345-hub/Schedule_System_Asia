require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

const app = express();
const port = 5000;

// ── IMPORT ROUTES ─────────────────────────────────────────────────────────────
const rotationRoutes = require('./rotations');

app.use(cors());
app.use(express.json());

// ── USE ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/rotations', rotationRoutes);

// ── HELPERS ───────────────────────────────────────────────────────────────────
const parseOptionalInt = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone) => {
    if (!phone) return true;
    return /^[+]?[\d\s\-().]{7,20}$/.test(phone);
};

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
        if (!body.first_name?.trim()) errors.first_name = 'First name is required.';
        if (!body.last_name?.trim()) errors.last_name = 'Last name is required.';
        if (!body.username?.trim()) errors.username = 'Username is required.';
        if (!body.email?.trim()) errors.email = 'Email is required.';
        else if (!validateEmail(body.email)) errors.email = 'Email format is invalid.';
        if (!body.password) errors.password = 'Temporary password is required.';
        else {
            const pwErrors = validatePassword(body.password);
            if (pwErrors.length) errors.password = pwErrors.join(' ');
        }
        if (!body.roles || body.roles.length === 0)
            errors.roles = 'At least one role is required.';
    } else {
        if (body.first_name !== undefined && !body.first_name?.trim())
            errors.first_name = 'First name cannot be empty.';
        if (body.last_name !== undefined && !body.last_name?.trim())
            errors.last_name = 'Last name cannot be empty.';
        if (body.username !== undefined && !body.username?.trim())
            errors.username = 'Username cannot be empty.';
        if (body.email !== undefined) {
            if (!body.email?.trim()) errors.email = 'Email cannot be empty.';
            else if (!validateEmail(body.email)) errors.email = 'Email format is invalid.';
        }
        if (body.roles !== undefined && body.roles.length === 0)
            errors.roles = 'At least one role is required.';
    }
    if (body.phone && !validatePhone(body.phone))
        errors.phone = 'Phone format is invalid. Use format: +1 (555) 000-0000';
    return errors;
};

const logAction = async (userId, action, entityType, entityId, oldValue = null, newValue = null) => {
    try {
        await prisma.audit_logs.create({
            data: { user_id: userId, action, entity_type: entityType, entity_id: entityId, old_value: oldValue, new_value: newValue },
        });
    } catch (err) { console.error('Audit log failed:', err.message); }
};

// ── USERS ─────────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            orderBy: { id: 'asc' },
            include: { user_roles: { include: { roles: true } } },
        });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { user_roles: { include: { roles: true } } },
        });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const { first_name, last_name, username, email, password, phone, location, team_id, roles } = req.body;
    const validationErrors = validateUserPayload(req.body);
    if (Object.keys(validationErrors).length)
        return res.status(400).json({ errors: validationErrors });
    try {
        const existingEmail = await prisma.users.findUnique({ where: { email } });
        if (existingEmail)
            return res.status(400).json({ errors: { email: 'Email is already in use.' } });
        const existingUsername = await prisma.users.findUnique({ where: { username } });
        if (existingUsername)
            return res.status(400).json({ errors: { username: 'Username is already taken.' } });
        const roleRecords = await prisma.roles.findMany({ where: { id: { in: roles.map(Number) } } });
        if (roleRecords.length !== roles.length)
            return res.status(400).json({ errors: { roles: 'One or more selected roles are invalid.' } });
        if (team_id) {
            const team = await prisma.teams.findUnique({ where: { id: Number(team_id) } });
            if (!team) return res.status(400).json({ errors: { team_id: 'Selected team is invalid.' } });
        }
        const fullName = `${first_name.trim()} ${last_name.trim()}`;
        const newUser = await prisma.users.create({
            data: {
                first_name: first_name.trim(), last_name: last_name.trim(),
                name: fullName, username: username.trim(),
                email: email.trim().toLowerCase(), password_hash: password,
                phone: phone?.trim() || null, location: location?.trim() || null,
                team_id: team_id ? Number(team_id) : null,
                must_change_password: true, status: 'active',
                user_roles: { create: roles.map(roleId => ({ role_id: Number(roleId) })) },
            },
            include: { user_roles: { include: { roles: true } } },
        });
        await logAction(null, 'CREATE_USER', 'users', newUser.id, null, { name: fullName, email, username });
        res.status(201).json(newUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { first_name, last_name, username, email, phone, location, team_id, roles } = req.body;
    const validationErrors = validateUserPayload(req.body, true);
    if (Object.keys(validationErrors).length)
        return res.status(400).json({ errors: validationErrors });
    try {
        const existing = await prisma.users.findUnique({ where: { id: userId } });
        if (!existing) return res.status(404).json({ error: 'User not found.' });
        if (email) {
            const conflict = await prisma.users.findFirst({ where: { email, NOT: { id: userId } } });
            if (conflict) return res.status(400).json({ errors: { email: 'Email is already in use.' } });
        }
        if (username) {
            const conflict = await prisma.users.findFirst({ where: { username, NOT: { id: userId } } });
            if (conflict) return res.status(400).json({ errors: { username: 'Username is already taken.' } });
        }
        if (roles && roles.length > 0) {
            const roleRecords = await prisma.roles.findMany({ where: { id: { in: roles.map(Number) } } });
            if (roleRecords.length !== roles.length)
                return res.status(400).json({ errors: { roles: 'One or more selected roles are invalid.' } });
        }
        if (team_id) {
            const team = await prisma.teams.findUnique({ where: { id: Number(team_id) } });
            if (!team) return res.status(400).json({ errors: { team_id: 'Selected team is invalid.' } });
        }
        const updateData = {};
        if (first_name) updateData.first_name = first_name.trim();
        if (last_name) updateData.last_name = last_name.trim();
        if (first_name || last_name)
            updateData.name = `${(first_name || existing.first_name).trim()} ${(last_name || existing.last_name).trim()}`;
        if (username) updateData.username = username.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone !== undefined) updateData.phone = phone?.trim() || null;
        if (location !== undefined) updateData.location = location?.trim() || null;
        if (team_id !== undefined) updateData.team_id = team_id ? Number(team_id) : null;
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: {
                ...updateData,
                ...(roles && roles.length > 0 ? {
                    user_roles: { deleteMany: {}, create: roles.map(roleId => ({ role_id: Number(roleId) })) }
                } : {}),
            },
            include: { user_roles: { include: { roles: true } } },
        });
        await logAction(null, 'UPDATE_USER', 'users', userId, existing, updatedUser);
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const existing = await prisma.users.findUnique({
            where: { id: userId },
            include: { user_roles: { include: { roles: true } } },
        });
        if (!existing) return res.status(404).json({ error: 'User not found.' });

        // Block if only Administrator
        const isAdmin = existing.user_roles.some(ur => ur.roles.name === 'Administrator');
        if (isAdmin) {
            const adminCount = await prisma.user_roles.count({
                where: { roles: { name: 'Administrator' } },
            });
            if (adminCount <= 1)
                return res.status(400).json({ error: 'Cannot delete the only Administrator in the system. Assign another Administrator first.' });
        }

        // Block if active shift assignments
        const activeAssignments = await prisma.rotation_assignments.count({
            where: { user_id: userId, status: 'scheduled', end_time: { gte: new Date() } },
        });
        if (activeAssignments > 0)
            return res.status(400).json({ error: `Cannot delete user with ${activeAssignments} active shift assignment(s). Please reassign or cancel their shifts first.` });

        await prisma.users.delete({ where: { id: userId } });
        await logAction(null, 'DELETE_USER', 'users', userId, existing, null);
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ROLES ─────────────────────────────────────────────────────────────────────
app.get('/api/roles', async (req, res) => {
    try {
        const roles = await prisma.roles.findMany({ orderBy: { name: 'asc' } });
        res.json(roles);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ROTATION TYPES ────────────────────────────────────────────────────────────
const DEFAULT_ROTATION_TYPES = [
    { name: 'Team-Level',          default_interval_unit: 'week' },
    { name: 'Sub-Team',            default_interval_unit: 'week' },
    { name: 'On-Call',             default_interval_unit: 'day'  },
    { name: 'Business Domain',     default_interval_unit: 'week' },
    { name: 'Cross-Team Analyst',  default_interval_unit: 'week' },
];

app.get('/api/rotation-types', async (req, res) => {
    try {
        let types = await prisma.rotation_types.findMany({ orderBy: { id: 'asc' } });
        if (types.length === 0) {
            await prisma.rotation_types.createMany({ data: DEFAULT_ROTATION_TYPES });
            types = await prisma.rotation_types.findMany({ orderBy: { id: 'asc' } });
        }
        res.json(types);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TEAMS ─────────────────────────────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await prisma.teams.findMany({
            orderBy: { name: 'asc' },
            include: { lead: true },
        });
        res.json(Array.isArray(teams) ? teams : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/teams', async (req, res) => {
    try {
        const { name, color, leadId, description, role, members } = req.body;
        const team = await prisma.teams.create({
            data: {
                name, color,
                lead_id: parseOptionalInt(leadId),
                description, team_role: role,
                members: members ? JSON.stringify(members) : null,
            },
            include: { lead: true },
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
                name, color,
                lead_id: parseOptionalInt(leadId),
                description, team_role: role,
                members: members ? JSON.stringify(members) : null,
            },
            include: { lead: true },
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

// ── LOCATIONS ─────────────────────────────────────────────────────────────────
app.get('/api/locations', async (req, res) => {
    try {
        const locations = await prisma.locations.findMany({ orderBy: { id: 'asc' } });
        res.json(locations);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
app.get('/api/schedule', async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month query param required (e.g. 2026-01)' });
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end   = new Date(year, mon, 0, 23, 59, 59);
    try {
        const entries = await prisma.rotation_assignments.findMany({
            where: { start_time: { gte: start, lte: end } },
            orderBy: { start_time: 'asc' },
        });
        const result = entries.map(e => ({
            id: e.id, user_id: e.user_id,
            date: e.start_time.toISOString().split('T')[0],
            code: e.status_code,
        }));
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/schedule', async (req, res) => {
    const { user_id, date, code } = req.body;
    if (!user_id || !date || !code)
        return res.status(400).json({ error: 'user_id, date, and code are required.' });
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd   = new Date(date + 'T23:59:59.999Z');
    try {
        const existing = await prisma.rotation_assignments.findFirst({
            where: { user_id: Number(user_id), start_time: { gte: dayStart, lte: dayEnd } },
        });
        let entry;
        if (existing) {
            entry = await prisma.rotation_assignments.update({
                where: { id: existing.id }, data: { status_code: code },
            });
        } else {
            entry = await prisma.rotation_assignments.create({
                data: { user_id: Number(user_id), start_time: dayStart, end_time: dayEnd, status_code: code, status: 'scheduled', slot: 'full' },
            });
        }
        res.json({ id: entry.id, user_id: entry.user_id, date, code: entry.status_code });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/schedule/:id', async (req, res) => {
    try {
        await prisma.rotation_assignments.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Schedule entry deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/matrix-users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            where: { status: 'active' },
            orderBy: [{ team_id: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, team_id: true },
        });
        const teams = await prisma.teams.findMany({ select: { id: true, name: true, color: true } });
        const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
        const result = users.map(u => ({
            id: u.id, name: u.name, team_id: u.team_id,
            team_name: u.team_id ? (teamMap[u.team_id]?.name || 'Unknown Team') : 'Unassigned',
            team_color: u.team_id ? (teamMap[u.team_id]?.color || '#6b7280') : '#6b7280',
        }));
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SEED ──────────────────────────────────────────────────────────────────────
const seedRoles = async () => {
    const count = await prisma.roles.count();
    if (count === 0) {
        await prisma.roles.createMany({
            data: [
                { name: 'Administrator',          description: 'Full system access including user and role management.' },
                { name: 'Team Lead / Supervisor', description: 'Manage team members, approve leave requests, and oversee schedules.' },
                { name: 'Rotation Owner',         description: 'Create and manage rotation schedules.' },
                { name: 'Employee',               description: 'View personal schedule and submit leave requests.' },
            ],
        });
        console.log('✅ Roles seeded.');
    }
};

const seedExcelData = async () => {
    const userCount = await prisma.users.count();
    if (userCount > 0) return;

    const teamNames = [
        { name: 'CDO FDN Subsurface and Land', color: '#e31937' },
        { name: 'CDO FDN Business Services',   color: '#2563eb' },
        { name: 'CDO FDN Ops App Support',     color: '#059669' },
        { name: 'CDO FDN Custom App Support',  color: '#7c3aed' },
        { name: 'ServiceNow',                   color: '#d97706' },
        { name: 'IT Apps',                      color: '#db2777' },
        { name: 'Platforms',                    color: '#0891b2' },
        { name: 'Service Desk',                 color: '#65a30d' },
        { name: 'Lead',                         color: '#dc2626' },
        { name: 'ALM',                          color: '#0284c7' },
        { name: 'MMF/EHS/Reserves/IT+/Incident',color: '#16a34a' },
        { name: 'SNOW, UIPath, PF',             color: '#9333ea' },
        { name: 'IT PCO',                       color: '#ca8a04' },
        { name: 'IT BA',                        color: '#0f766e' },
        { name: 'CDO PCO',                      color: '#b45309' },
        { name: 'Change',                       color: '#4338ca' },
        { name: 'Developer',                    color: '#be123c' },
        { name: 'SDM',                          color: '#0369a1' },
    ];

    const createdTeams = {};
    for (const t of teamNames) {
        let team = await prisma.teams.findFirst({ where: { name: t.name } });
        if (!team) team = await prisma.teams.create({ data: { name: t.name, color: t.color, status: 'active' } });
        createdTeams[t.name] = team.id;
    }

    const employeeRole = await prisma.roles.findFirst({ where: { name: 'Employee' } });

    const employees = [
        { name: 'Dan Saulnier',            team: 'CDO FDN Subsurface and Land' },
        { name: 'Alan Howatt',             team: 'CDO FDN Subsurface and Land' },
        { name: 'John Doucette',           team: 'CDO FDN Subsurface and Land' },
        { name: 'Ameera Barowalia',        team: 'CDO FDN Subsurface and Land' },
        { name: 'Travis Torraville',       team: 'CDO FDN Subsurface and Land' },
        { name: 'Ryan Praught',            team: 'CDO FDN Subsurface and Land' },
        { name: 'Sayedun Asma',            team: 'CDO FDN Business Services'   },
        { name: 'Ricky Dalton',            team: 'CDO FDN Business Services'   },
        { name: 'Simran Chopra',           team: 'CDO FDN Business Services'   },
        { name: 'Kakoli Majumder',         team: 'CDO FDN Business Services'   },
        { name: 'Nick Matheson',           team: 'CDO FDN Business Services'   },
        { name: 'David Judson',            team: 'CDO FDN Business Services'   },
        { name: 'Shane Graves',            team: 'CDO FDN Business Services'   },
        { name: 'Neil Weber',              team: 'CDO FDN Business Services'   },
        { name: 'Rick Hamer',              team: 'CDO FDN Ops App Support'     },
        { name: 'Edith Larkin',            team: 'CDO FDN Ops App Support'     },
        { name: 'Abdul-Malik Olanrewaju',  team: 'CDO FDN Ops App Support'     },
        { name: 'Veronique Breault',       team: 'CDO FDN Ops App Support'     },
        { name: 'JD Green',                team: 'CDO FDN Ops App Support'     },
        { name: 'Ryan McGuigan',           team: 'CDO FDN Ops App Support'     },
        { name: 'Kevin McPhee',            team: 'CDO FDN Ops App Support'     },
        { name: 'Monica Duddela',          team: 'CDO FDN Custom App Support'  },
        { name: 'Darren Nickerson',        team: 'CDO FDN Custom App Support'  },
        { name: 'Kyle Creamer',            team: 'CDO FDN Custom App Support'  },
        { name: 'Tim Darrach',             team: 'ServiceNow'                  },
        { name: 'Leon Tarabukin',          team: 'ServiceNow'                  },
        { name: 'Karthik Rajakrishnan',    team: 'ServiceNow'                  },
        { name: 'Rishi Akella',            team: 'IT Apps'                     },
        { name: 'Ronak Shah',              team: 'IT Apps'                     },
        { name: 'Neil Bridges',            team: 'IT Apps'                     },
        { name: 'Dan MacFarlane',          team: 'Platforms'                   },
        { name: 'Sajith Manuel',           team: 'Platforms'                   },
        { name: 'Yogdeep Singh',           team: 'Platforms'                   },
        { name: 'Jesse Ford',              team: 'Platforms'                   },
        { name: 'Courtney Gaudet',         team: 'Platforms'                   },
        { name: 'Logan Noonan',            team: 'Platforms'                   },
        { name: 'Mahaveer Chaudhari',      team: 'Service Desk'                },
        { name: 'Ance Mathew',             team: 'Service Desk'                },
        { name: 'Kristeph Small',          team: 'Service Desk'                },
        { name: 'Heli Soni',               team: 'Service Desk'                },
        { name: 'Mario Cormier',           team: 'Service Desk'                },
        { name: 'Mahshid Pouransafar',     team: 'Service Desk'                },
        { name: 'Aaron Cole',              team: 'Service Desk'                },
        { name: 'Mike Thomson',            team: 'Lead'                        },
        { name: 'Matt Burns',              team: 'Lead'                        },
        { name: 'Matej Hanzl',             team: 'ALM'                         },
        { name: 'Jeff Lee',                team: 'MMF/EHS/Reserves/IT+/Incident'},
        { name: 'Nicole Duplessis',        team: 'SNOW, UIPath, PF'            },
        { name: 'Angele Easter',           team: 'IT PCO'                      },
        { name: 'Rona Stewart',            team: 'IT PCO'                      },
        { name: 'Chloe Risk',              team: 'IT BA'                       },
        { name: 'Julie McCracken',         team: 'CDO PCO'                     },
        { name: 'Jennifer Gallant',        team: 'Change'                      },
        { name: 'Brett Cheverie',          team: 'Developer'                   },
        { name: 'Matthew Densmore',        team: 'SDM'                         },
    ];

    for (const emp of employees) {
        const nameParts = emp.name.split(' ');
        const first_name = nameParts[0];
        const last_name  = nameParts.slice(1).join(' ') || 'Unknown';
        const username   = emp.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) + Math.floor(Math.random() * 99);
        const email      = username + '@cgi.com';
        const teamId     = createdTeams[emp.team];
        try {
            await prisma.users.create({
                data: {
                    first_name, last_name, name: emp.name,
                    username, email, password_hash: 'TempPass1!',
                    team_id: teamId || null,
                    must_change_password: true, status: 'active',
                    ...(employeeRole ? { user_roles: { create: [{ role_id: employeeRole.id }] } } : {}),
                },
            });
        } catch (e) { /* skip duplicates */ }
    }
    console.log('✅ Excel employees seeded.');
};

// ── START SERVER ──────────────────────────────────────────────────────────────
app.listen(port, async () => {
    console.log(`🚀 CGI Scheduling Server live on http://localhost:${port}`);
    await seedRoles();
    await seedExcelData();
});