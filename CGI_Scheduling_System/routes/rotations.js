var express = require('express');
var router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    const endDate = parseRequiredDate(payload.end_date);
    const intervalUnit = payload.interval_unit;
    const intervalCount =
        payload.interval_count ? Number.parseInt(payload.interval_count, 10) : 1;
    const status = payload.status || 'active';
    const assignedMemberIds = Array.isArray(payload.assigned_member_ids)
        ? payload.assigned_member_ids
            .map((id) => Number.parseInt(id, 10))
            .filter((id) => !Number.isNaN(id))
        : [];
    const notes = payload.notes ? String(payload.notes).trim() : '';
    const allowDoubleBooking = Boolean(payload.allow_double_booking);
    const escalationTiers = payload.escalation_tiers
        ? (typeof payload.escalation_tiers === 'string'
            ? payload.escalation_tiers.trim()
            : payload.escalation_tiers)
        : null;

    if (rotationTypeId === null) errors.push('Rotation type is required.');
    if (!name) errors.push('Rotation name is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!endDate) errors.push('End date is required.');
    if (startDate && endDate && endDate < startDate)
        errors.push('End date must be on or after the start date.');
    if (!ALLOWED_INTERVAL_UNITS.has(intervalUnit)) errors.push('Interval unit is invalid.');
    if (Number.isNaN(intervalCount) || intervalCount < 1)
        errors.push('Interval count must be at least 1.');
    if (!ALLOWED_STATUS.has(status)) errors.push('Status is invalid.');
    if (teamId === null) errors.push('Assigned team is required.');
    if (!assignedMemberIds.length) errors.push('Assigned members are required.');

    return {
        errors,
        data: {
            name,
            rotation_type_id: rotationTypeId,
            team_id: teamId,
            location_id: locationId,
            start_date: startDate,
            end_date: endDate,
            interval_unit: intervalUnit,
            interval_count: intervalCount,
            status,
            assigned_member_ids: assignedMemberIds,
            notes: notes || null,
            allow_double_booking: allowDoubleBooking,
            escalation_tiers: escalationTiers || null
        }
    };
};

const validateRotationTypeExists = async (rotationTypeId, errors) => {
    if (rotationTypeId === null) return;

    const rotationType = await prisma.rotation_types.findUnique({
        where: { id: rotationTypeId },
        select: { id: true }
    });

    if (!rotationType) {
        errors.push('Selected rotation type does not exist.');
    }
};

// ✅ GET ALL
router.get('/', async (req, res) => {
    try {
        const rotations = await prisma.rotations.findMany({
            include: {
                rotation_types: true,
                teams: true,
                locations: true
            },
            orderBy: { id: 'asc' }
        });
        res.json(rotations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/types', async (req, res) => {
    try {
        const types = await prisma.rotation_types.findMany({ orderBy: { id: 'asc' } });
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ GET ONE (NEW - IMPORTANT)
router.get('/:id', async (req, res) => {
    try {
        const rotation = await prisma.rotations.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!rotation) return res.status(404).json({ error: 'Not found' });

        res.json(rotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ CREATE
router.post('/', async (req, res) => {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    await validateRotationTypeExists(data.rotation_type_id, errors);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    try {
        const rotation = await prisma.rotations.create({ data });
        res.status(201).json(rotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ UPDATE
router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    await validateRotationTypeExists(data.rotation_type_id, errors);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    try {
        const existing = await prisma.rotations.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Rotation not found' });

        const updated = await prisma.rotations.update({
            where: { id },
            data
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ DELETE
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const existing = await prisma.rotations.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Rotation not found' });

        await prisma.rotations.delete({ where: { id } });

        res.json({ message: 'Rotation deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ METADATA
router.get('/meta/types', async (req, res) => {
    try {
        const types = await prisma.rotation_types.findMany();
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/meta/locations', async (req, res) => {
    try {
        const locations = await prisma.locations.findMany();
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
