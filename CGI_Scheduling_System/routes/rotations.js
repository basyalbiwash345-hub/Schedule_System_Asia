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

// GET /api/rotations
router.get('/', async function(req, res) {
    try {
        const rotations = await prisma.rotations.findMany({
            include: { rotation_types: true, teams: true, locations: true },
            orderBy: { id: 'asc' }
        });
        res.json(rotations);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch rotations' }); }
});

// POST /api/rotations
router.post('/', async function(req, res) {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    try {
        const rotation = await prisma.rotations.create({ data });
        res.status(201).json(rotation);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/rotations/:id
router.put('/:id', async function(req, res) {
    const { errors, data } = validateRotationPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    try {
        const rotation = await prisma.rotations.update({
            where: { id: parseInt(req.params.id) },
            data
        });
        res.json(rotation);
    } catch (err) { res.status(500).json({ error: 'Failed to update rotation' }); }
});

// DELETE /api/rotations/:id
router.delete('/:id', async function(req, res) {
    try {
        await prisma.rotations.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Rotation deleted successfully' });
    } catch (err) { res.status(500).json({ error: 'Failed to delete rotation' }); }
});

// GET /api/rotations/types
router.get('/types', async function(req, res) {
    try {
        const types = await prisma.rotation_types.findMany({ orderBy: { name: 'asc' } });
        res.json(types);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch rotation types' }); }
});

// GET /api/rotations/locations
router.get('/locations', async function(req, res) {
    try {
        const locations = await prisma.locations.findMany({ orderBy: { name: 'asc' } });
        res.json(locations);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch locations' }); }
});

module.exports = router;