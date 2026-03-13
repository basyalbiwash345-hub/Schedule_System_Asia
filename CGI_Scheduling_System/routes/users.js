var express = require('express');
var router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/users
router.get('/', async function(req, res) {
  try {
    const users = await prisma.users.findMany({ orderBy: { id: 'asc' } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', async function(req, res) {
  try {
    const { username, email, password } = req.body;
    const newUser = await prisma.users.create({
      data: { name: username, email, password_hash: password, status: 'active' }
    });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async function(req, res) {
  try {
    const { username, email } = req.body;
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(req.params.id) },
      data: { name: username, email }
    });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async function(req, res) {
  try {
    await prisma.users.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;