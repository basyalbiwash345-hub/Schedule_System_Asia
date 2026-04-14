const express = require('express');
const router = express.Router();
const prisma = require('./db');

const ALLOWED_INTERVAL_UNITS = new Set(['day', 'week', 'biweek', 'month']);
const ALLOWED_STATUS = new Set(['active', 'inactive']);

// Maps rotation type names (lowercase) to matrix schedule codes
const ROTATION_TYPE_CODE_MAP = {
    '24/7 spoc it services':    'IT',
    '24/7 spoc cdo stewards':   'CD',
    '24/7 spoc cdo escalation': 'ES',
    'mountain time rotation':   'MT',
    'working stat':             'WS',
    'encana friday':            'EF',
    'service desk':             'SD',
};

const getStatusCode = (rotationTypeName) => {
    if (!rotationTypeName) return null;
    return ROTATION_TYPE_CODE_MAP[rotationTypeName.toLowerCase().trim()] || null;
};

// Reads the code for a rotation type, preferring the `code` column stored in the DB
// (populated by the server startup migration) over the hardcoded name map.
const getRotationTypeCode = async (rotationTypeId) => {
    if (!rotationTypeId) return null;
    try {
        const rows = await prisma.$queryRaw`
            SELECT code, name FROM rotation_types WHERE id = ${rotationTypeId} LIMIT 1
        `;
        const row = rows[0];
        if (!row) return null;
        // Prefer explicit code column; fall back to name-based map
        return row.code || getStatusCode(row.name);
    } catch {
        return null;
    }
};

const generateAssignments = async (rotationId, memberIds, startDate, endDate, statusCode) => {
    if (!statusCode || !memberIds.length || !startDate || !endDate) return;
    const assignments = [];
    // Use UTC midnight so the stored timestamp always produces the correct date when
    // converted back with toISOString().split('T')[0] — regardless of server timezone.
    const cur = new Date(startDate);
    const end = new Date(endDate);
    cur.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    while (cur <= end) {
        const dayStart = new Date(cur);
        const dayEnd = new Date(cur);
        dayEnd.setUTCHours(23, 59, 59, 999);
        for (const userId of memberIds) {
            assignments.push({
                rotation_id: rotationId,
                user_id: userId,
                start_time: new Date(dayStart),
                end_time: new Date(dayEnd),
                status_code: statusCode,
                status: 'scheduled',
                slot: 'full',
            });
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    if (assignments.length) {
        await prisma.rotation_assignments.createMany({ data: assignments });
    }
};

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

const parseIdArray = (value) => {
    if (Array.isArray(value)) {
        const ids = value.map((v) => Number.parseInt(v, 10)).filter((v) => !Number.isNaN(v));
        return { ids: Array.from(new Set(ids)), invalid: ids.length !== value.length };
    }
    if (typeof value === 'string' && value.trim()) {
        const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
        const ids = parts.map((v) => Number.parseInt(v, 10)).filter((v) => !Number.isNaN(v));
        return { ids: Array.from(new Set(ids)), invalid: ids.length !== parts.length };
    }
    if (value === undefined || value === null || value === '') {
        return { ids: [], invalid: false };
    }
    return { ids: [], invalid: true };
};

const parseEscalationTiers = (value, errors) => {
    if (value === undefined || value === null || value === '') return null;
    if (Array.isArray(value)) {
        return value.length ? value : (errors.push('Escalation tiers cannot be empty.'), null);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed) && parsed.length === 0)
                    errors.push('Escalation tiers cannot be empty.');
                return parsed;
            } catch (err) {
                errors.push('Escalation tiers must be valid JSON.');
                return null;
            }
        }
        const tiers = trimmed
            .split(/[\n,]+/)
            .map((tier) => tier.trim())
            .filter(Boolean);
        if (!tiers.length) {
            errors.push('Escalation tiers cannot be empty.');
            return null;
        }
        return tiers;
    }
    errors.push('Escalation tiers must be a list or comma-separated string.');
    return null;
};

const getIntervalEndDate = (startDate, intervalUnit, intervalCount) => {
    const end = new Date(startDate);
    if (intervalUnit === 'day') end.setDate(end.getDate() + intervalCount);
    if (intervalUnit === 'week') end.setDate(end.getDate() + intervalCount * 7);
    if (intervalUnit === 'biweek') end.setDate(end.getDate() + intervalCount * 14);
    if (intervalUnit === 'month') end.setMonth(end.getMonth() + intervalCount);
    return end;
};

const intervalsOverlap = (startA, endA, startB, endB) =>
    startA < endB && startB < endA;

const logAction = async (
    userId,
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = null
) => {
    try {
        const sanitize = (value) =>
            value === null || value === undefined
                ? null
                : JSON.parse(JSON.stringify(value));
        await prisma.audit_logs.create({
            data: {
                user_id: userId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                old_value: sanitize(oldValue),
                new_value: sanitize(newValue),
            },
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

const parseRotationPayload = (payload) => {
    const errors = [];

    const name = (payload.name || '').trim();
    const rotationTypeId = parseOptionalInt(payload.rotation_type_id);
    const teamId = parseOptionalInt(payload.team_id);
    const startDate = parseRequiredDate(payload.start_date);
    const endDate = parseRequiredDate(payload.end_date);
    const intervalUnit = payload.interval_unit;
    const intervalCount =
        payload.interval_count ? Number.parseInt(payload.interval_count, 10) : 1;
    const status = payload.status || 'active';
    const allowDoubleBooking = Boolean(payload.allow_double_booking);
    const notes = payload.notes ? String(payload.notes).trim() : '';
    // Schedule code: directly assigned on the rotation (overrides the rotation type's code)
    const code = payload.code ? String(payload.code).trim().toUpperCase() : null;
    const { ids: assignedMemberIds, invalid: invalidMemberIds } = parseIdArray(
        payload.assigned_member_ids
    );
    const escalationTiers = parseEscalationTiers(
        payload.escalation_tiers,
        errors
    );

    if (!name) errors.push('Rotation name is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!endDate) errors.push('End date is required.');
    if (startDate && endDate && endDate < startDate)
        errors.push('End date must be on or after the start date.');
    if (!ALLOWED_INTERVAL_UNITS.has(intervalUnit))
        errors.push('Interval unit is invalid.');
    if (Number.isNaN(intervalCount) || intervalCount < 1)
        errors.push('Interval count must be at least 1.');
    if (!ALLOWED_STATUS.has(status)) errors.push('Status is invalid.');

    if (teamId === null) errors.push('Assigned team is required.');

    if (invalidMemberIds) errors.push('Assigned members list is invalid.');
    if (!assignedMemberIds.length)
        errors.push('Assigned members are required.');

    return {
        errors,
        // rotationCode is kept separate so it is never passed into Prisma's
        // model API (the generated client predates the code column).
        // It is written via $executeRaw after create/update.
        rotationCode: code || null,
        data: {
            name,
            rotation_type_id: rotationTypeId,
            team_id: teamId,
            location_id: null,
            start_date: startDate,
            end_date: endDate,
            interval_unit: intervalUnit,
            interval_count: intervalCount,
            status,
            allow_double_booking: allowDoubleBooking,
            notes: notes || null,
            escalation_tiers: escalationTiers,
            assigned_member_ids: assignedMemberIds,
        },
    };
};

const validateRotationTypeExists = async (rotationTypeId, errors) => {
    if (rotationTypeId === null) return;

    const rotationType = await prisma.rotation_types.findUnique({
        where: { id: rotationTypeId },
        select: { id: true },
    });

    if (!rotationType) {
        errors.push('Selected rotation type does not exist.');
    }
};

const validateMembersForScope = async (
    memberIds,
    teamId,
    locationId,
    errors,
    existingRotation = null
) => {
    if (!memberIds.length) return { members: [] };

    const members = await prisma.users.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, team_memberships: { select: { id: true } }, location: true, name: true },
    });

    if (members.length !== memberIds.length) {
        errors.push('One or more assigned members do not exist.');
        return { members };
    }

    if (teamId !== null) {
        const existingMemberIds = new Set(
            Array.isArray(existingRotation?.assigned_member_ids)
                ? existingRotation.assigned_member_ids
                    .map((id) => Number.parseInt(id, 10))
                    .filter((id) => !Number.isNaN(id))
                : []
        );
        const teamUnchanged = existingRotation?.team_id === teamId;
        const invalid = members.filter((m) => {
            if (m.team_memberships?.some(t => t.id === teamId)) return false;
            return !(teamUnchanged && existingMemberIds.has(m.id));
        });

        if (invalid.length) {
            errors.push(
                'Assigned members must belong to the selected team.'
            );
        }
    }

    if (locationId !== null) {
        const location = await prisma.locations.findUnique({
            where: { id: locationId },
        });
        if (!location) {
            errors.push('Selected location does not exist.');
        } else {
            const locName = (location.name || '').trim().toLowerCase();
            const invalid = members.filter(
                (m) =>
                    !m.location ||
                    m.location.trim().toLowerCase() !== locName
            );
            if (invalid.length) {
                errors.push(
                    'Assigned members must belong to the selected location.'
                );
            }
        }
    }

    return { members };
};

// Returns array of member IDs that are double-booked across overlapping rotations.
const checkDoubleBooking = async (rotationId, memberIds, startDate, endDate) => {
    if (!memberIds.length) return [];

    const others = await prisma.rotations.findMany({
        where: rotationId ? { id: { not: rotationId } } : {},
        select: {
            id: true,
            allow_double_booking: true,
            start_date: true,
            end_date: true,
            interval_unit: true,
            interval_count: true,
            assigned_member_ids: true,
        },
    });

    const conflicting = new Set();

    others.forEach((r) => {
        // Skip rotations that explicitly allow double-booking
        if (r.allow_double_booking) return;
        const existingIds = Array.isArray(r.assigned_member_ids)
            ? r.assigned_member_ids.map((id) => Number.parseInt(id, 10)).filter((id) => !Number.isNaN(id))
            : [];
        if (!existingIds.length) return;

        const existingEnd = r.end_date || getIntervalEndDate(r.start_date, r.interval_unit, r.interval_count || 1);
        if (!intervalsOverlap(startDate, endDate, r.start_date, existingEnd)) return;

        existingIds.forEach((id) => { if (memberIds.includes(id)) conflicting.add(id); });
    });

    return Array.from(conflicting);
};

// GET ALL
router.get('/', async (req, res) => {
    try {
        const rotations = await prisma.rotations.findMany({
            include: { rotation_types: true, teams: true, locations: true },
            orderBy: { id: 'asc' },
        });
        // Merge in the code column (written via raw SQL; not yet in generated client)
        const codRows = await prisma.$queryRaw`SELECT id, code FROM rotations`;
        const codeMap = Object.fromEntries(codRows.map(r => [Number(r.id), r.code || null]));
        res.json(rotations.map(r => ({ ...r, code: codeMap[r.id] ?? null })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/types', async (req, res) => {
    try {
        const types = await prisma.rotation_types.findMany({
            orderBy: { id: 'asc' },
        });
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ONE
router.get('/:id', async (req, res) => {
    try {
        const rotation = await prisma.rotations.findUnique({
            where: { id: parseInt(req.params.id, 10) },
        });

        if (!rotation) return res.status(404).json({ error: 'Not found' });

        res.json(rotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post('/', async (req, res) => {
    const { errors, data, rotationCode } = parseRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (data.rotation_type_id !== null) {
        await validateRotationTypeExists(data.rotation_type_id, errors);
        if (errors.length) return res.status(400).json({ errors });
    }

    await validateMembersForScope(
        data.assigned_member_ids,
        data.team_id,
        data.location_id,
        errors,
        null
    );
    if (errors.length) return res.status(400).json({ errors });

    if (!data.allow_double_booking) {
        const conflictingIds = await checkDoubleBooking(null, data.assigned_member_ids, data.start_date, data.end_date);
        if (conflictingIds.length > 0) {
            return res.status(409).json({
                conflict: true,
                error: 'One or more members are already assigned to an overlapping rotation.',
                conflicting_member_ids: conflictingIds,
            });
        }
    }

    try {
        const rotation = await prisma.rotations.create({ data });
        await logAction(null, 'rotation_created', 'rotation', rotation.id, null, rotation);

        // Persist the code via raw SQL (Prisma client predates this column)
        if (rotationCode) {
            await prisma.$executeRaw`UPDATE rotations SET code = ${rotationCode} WHERE id = ${rotation.id}`;
        }

        // Rotation's own code takes priority; fall back to the type's code
        const statusCode = rotationCode || await getRotationTypeCode(data.rotation_type_id);
        await generateAssignments(rotation.id, data.assigned_member_ids, data.start_date, data.end_date, statusCode);

        res.status(201).json({ ...rotation, code: rotationCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { errors, data, rotationCode } = parseRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (data.rotation_type_id !== null) {
        await validateRotationTypeExists(data.rotation_type_id, errors);
        if (errors.length) return res.status(400).json({ errors });
    }

    let existing;
    try {
        existing = await prisma.rotations.findUnique({ where: { id } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }

    if (!existing)
        return res.status(404).json({ error: 'Rotation not found' });

    await validateMembersForScope(
        data.assigned_member_ids,
        data.team_id,
        data.location_id,
        errors,
        existing
    );
    if (errors.length) return res.status(400).json({ errors });

    if (!data.allow_double_booking) {
        const conflictingIds = await checkDoubleBooking(id, data.assigned_member_ids, data.start_date, data.end_date);
        if (conflictingIds.length > 0) {
            return res.status(409).json({
                conflict: true,
                error: 'One or more members are already assigned to an overlapping rotation.',
                conflicting_member_ids: conflictingIds,
            });
        }
    }

    try {
        const updated = await prisma.rotations.update({ where: { id }, data });
        await logAction(null, 'rotation_updated', 'rotation', id, existing, updated);

        // Persist the code via raw SQL (Prisma client predates this column)
        await prisma.$executeRaw`UPDATE rotations SET code = ${rotationCode} WHERE id = ${id}`;

        // Regenerate schedule assignments from the new rotation definition
        await prisma.rotation_assignments.deleteMany({ where: { rotation_id: id } });
        // Rotation's own code takes priority; fall back to the type's code
        const statusCode = rotationCode || await getRotationTypeCode(data.rotation_type_id);
        await generateAssignments(id, data.assigned_member_ids, data.start_date, data.end_date, statusCode);

        res.json({ ...updated, code: rotationCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);

    try {
        const existing = await prisma.rotations.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Rotation not found' });

        await prisma.rotations.delete({ where: { id } });
        await logAction(null, 'rotation_deleted', 'rotation', id, existing, null);

        res.json({ message: 'Rotation deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
