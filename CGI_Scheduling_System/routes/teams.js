var express = require(&#39;express&#39;);
var router = express.Router();
const { PrismaClient } = require(&#39;@prisma/client&#39;);
const prisma = new PrismaClient();

// GET /api/teams - List all teams
router.get(&#39;/&#39;, async function(req, res, next) {
  try {
    const teams = await prisma.teams.findMany({
      include: {
        lead: true,
        _count: {
          select: { rotations: true }
        }
      },
      orderBy: { id: &#39;desc&#39; }
    });
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: &#39;Failed to fetch teams&#39; });
  }
});

// POST /api/teams - Create new team
router.post(&#39;/&#39;, async function(req, res, next) {
  try {
    const { name, color, lead_id, members, team_role, description, group_id } = req.body;
    const team = await prisma.teams.create({
      data: {
        name,
        color,
        lead_id: parseInt(lead_id) || null,
        members: members ? JSON.parse(members) : null,
        team_role,
        description,
        group_id: parseInt(group_id) || null,
      },
      include: { lead: true }
    });
    res.status(201).json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: &#39;Failed to create team&#39; });
  }
});

// DELETE /api/teams/:id - Delete team
router.delete(&#39;/:id&#39;, async function(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.teams.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: &#39;Team deleted successfully&#39; });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: &#39;Failed to delete team&#39; });
  }
});

module.exports = router;

