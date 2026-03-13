var express = require('express');
var router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/teams
router.get('/', async function(req, res) {
  try {
    const teams = await prisma.teams.findMany({
      include: {
        lead: true,
        _count: { select: { rotations: true } }
      },
      orderBy: { id: 'desc' }
    });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// POST /api/teams
router.post('/', async function(req, res) {
  try {
    const { name, color, leadId, members, role, description } = req.body;
    const team = await prisma.teams.create({
      data: {
        name,
        color,
        lead_id: parseInt(leadId) || null,
        members: members ? JSON.stringify(members) : null,
        team_role: role,
        description
      },
      include: { lead: true }
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PUT /api/teams/:id
router.put('/:id', async function(req, res) {
  try {
    const { name, color, leadId, members, role, description } = req.body;
    const team = await prisma.teams.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        color,
        lead_id: parseInt(leadId) || null,
        members: members ? JSON.stringify(members) : null,
        team_role: role,
        description
      },
      include: { lead: true }
    });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/teams/:id
router.delete('/:id', async function(req, res) {
  try {
    await prisma.teams.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

module.exports = router;