const express = require('express');
const router = express.Router();
const prisma = require('./db');

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
    const locationId = parseOptionalInt(payload.location_id);
    const startDate = parseRequiredDate(payload.start_date);
    const intervalUnit = payload.interval_unit;
    const intervalCount =
        payload.interval_count ? Number.parseInt(payload.interval_count, 10) : 1;
    const status = payload.status || 'active';
    const allowDoubleBooking = Boolean(payload.allow_double_booking);
    const notes = payload.notes ? String(payload.notes).trim() : '';
    const { ids: assignedMemberIds, invalid: invalidMemberIds } = parseIdArray(
        payload.assigned_member_ids
    );
    const escalationTiers = parseEscalationTiers(
        payload.escalation_tiers,
        errors
    );

    if (!name) errors.push('Rotation name is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!ALLOWED_INTERVAL_UNITS.has(intervalUnit))
        errors.push('Interval unit is invalid.');
    if (Number.isNaN(intervalCount) || intervalCount < 1)
        errors.push('Interval count must be at least 1.');
    if (!ALLOWED_STATUS.has(status)) errors.push('Status is invalid.');

    const hasTeam = teamId !== null;
    const hasLocation = locationId !== null;

    if (hasTeam === hasLocation)
        errors.push('Must choose either team OR location (not both).');

    if (invalidMemberIds) errors.push('Assigned members list is invalid.');
    if (!assignedMemberIds.length)
        errors.push('Assigned members are required.');

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
            status,
            allow_double_booking: allowDoubleBooking,
            notes: notes || null,
            escalation_tiers: escalationTiers,
            assigned_member_ids: assignedMemberIds,
        },
    };
};

const validateMembersForScope = async (
    memberIds,
    teamId,
    locationId,
    errors
) => {
    if (!memberIds.length) return { members: [] };

    const members = await prisma.users.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, team_id: true, location: true, name: true },
    });

    if (members.length !== memberIds.length) {
        errors.push('One or more assigned members do not exist.');
        return { members };
    }

    if (teamId !== null) {
        const invalid = members.filter((m) => m.team_id !== teamId);
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

const validateUniqueName = async (name, rotationId, errors) => {
    if (!name) return;
    const existing = await prisma.rotations.findFirst({
        where: {
            name: { equals: name, mode: 'insensitive' },
            ...(rotationId ? { id: { not: rotationId } } : {}),
        },
    });
    if (existing) errors.push('Rotation name must be unique.');
};

const validateDoubleBooking = async (
    rotationId,
    memberIds,
    startDate,
    intervalUnit,
    intervalCount,
    errors
) => {
    if (!memberIds.length) return;

    const rotations = await prisma.rotations.findMany({
        where: rotationId ? { id: { not: rotationId } } : {},
        select: {
            id: true,
            name: true,
            start_date: true,
            interval_unit: true,
            interval_count: true,
            assigned_member_ids: true,
        },
    });

    const newStart = startDate;
    const newEnd = getIntervalEndDate(
        startDate,
        intervalUnit,
        intervalCount
    );

    const conflictingMembers = new Set();

    rotations.forEach((rotation) => {
        if (!rotation.assigned_member_ids) return;
        const existingIds = Array.isArray(rotation.assigned_member_ids)
            ? rotation.assigned_member_ids
                .map((id) => Number.parseInt(id, 10))
                .filter((id) => !Number.isNaN(id))
            : [];
        if (!existingIds.length) return;

        const existingStart = rotation.start_date;
        const existingEnd = getIntervalEndDate(
            existingStart,
            rotation.interval_unit,
            rotation.interval_count || 1
        );

        if (!intervalsOverlap(newStart, newEnd, existingStart, existingEnd))
            return;

        existingIds.forEach((id) => {
            if (memberIds.includes(id)) conflictingMembers.add(id);
        });
    });

    if (conflictingMembers.size > 0) {
        errors.push('Double-booking detected for one or more members.');
    }
};

// GET ALL
router.get('/', async (req, res) => {
    try {
        const rotations = await prisma.rotations.findMany({
            include: {
                rotation_types: true,
                teams: true,
                locations: true,
            },
            orderBy: { id: 'asc' },
        });
        res.json(rotations);
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
    const { errors, data } = parseRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ errors });

    await validateUniqueName(data.name, null, errors);
    await validateMembersForScope(
        data.assigned_member_ids,
        data.team_id,
        data.location_id,
        errors
    );
    if (!data.allow_double_booking) {
        await validateDoubleBooking(
            null,
            data.assigned_member_ids,
            data.start_date,
            data.interval_unit,
            data.interval_count || 1,
            errors
        );
    }

    if (errors.length) return res.status(400).json({ errors });

    try {
        const rotation = await prisma.rotations.create({
            data,
        });
        await logAction(null, 'rotation_created', 'rotation', rotation.id, null, rotation);
        res.status(201).json(rotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { errors, data } = parseRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ errors });

    await validateUniqueName(data.name, id, errors);
    await validateMembersForScope(
        data.assigned_member_ids,
        data.team_id,
        data.location_id,
        errors
    );
    if (!data.allow_double_booking) {
        await validateDoubleBooking(
            id,
            data.assigned_member_ids,
            data.start_date,
            data.interval_unit,
            data.interval_count || 1,
            errors
        );
    }

    if (errors.length) return res.status(400).json({ errors });

    try {
        const existing = await prisma.rotations.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Rotation not found' });

        const updated = await prisma.rotations.update({
            where: { id },
            data,
        });

        await logAction(null, 'rotation_updated', 'rotation', id, existing, updated);
        res.json(updated);
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
