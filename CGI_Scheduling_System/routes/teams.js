var express = require('express');
var router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Team Admin middleware - matches frontend isTeamAdmin logic
const requireTeamAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token, authorization denied' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const isTeamAdmin = decoded.roles?.some(role => ['Administrator', 'Team Lead / Supervisor'].includes(role));
    if (!isTeamAdmin) {
      return res.status(403).json({ error: 'Access denied: Team admin required (Administrator or Team Lead)' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

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

// GET /api/teams/:id
router.get('/:id', async function(req, res) {
  try {
    const teamId = parseInt(req.params.id);
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      include: {
        // This MUST match the relation name in your schema.prisma
        // which is usually the name of the related model (lead)
        lead: true,
        rotations: true
      }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// POST /api/teams
router.post('/', requireTeamAdmin, async function(req, res) {
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
router.put('/:id', requireTeamAdmin, async function(req, res) {
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
router.delete('/:id', requireTeamAdmin, async function(req, res) {
  try {
    await prisma.teams.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

module.exports = router;