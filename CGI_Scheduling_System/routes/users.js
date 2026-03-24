var express = require('express');
var router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs'); // Add this import

// GET /api/users
router.get('/', async function(req, res) {
  try {
    const users = await prisma.users.findMany({
      orderBy: { id: 'asc' },
      include: { user_roles: { include: { roles: true } } } // Better to include roles
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users (Updated for Hashing)
router.post('/', async function(req, res) {
  try {
    const { username, email, password } = req.body;

    // 1. Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash(password, salt);

    const newUser = await prisma.users.create({
      data: {
        name: username,
        username: username, // Added this field
        email,
        password_hash: hashedPw, // Save the hashed version
        status: 'active'
      }
    });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async function(req, res) {
  try {
    const { username, email, password } = req.body;
    const updateData = { name: username, email };

    // If a new password is provided, hash it before updating
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
// Note: In a real app, you would add your authorizeAdmin middleware here
router.delete('/:id', async function(req, res) {
  try {
    await prisma.users.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;