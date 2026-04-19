const express = require('express');
const router = express.Router();

// TODO: Implement user routes
// GET /api/users - List all users
// GET /api/users/:id - Get user by ID
// PUT /api/users/:id - Update user
// DELETE /api/users/:id - Delete user

router.get('/', (req, res) => {
  res.json({ message: 'Users routes - coming soon' });
});

module.exports = router;
