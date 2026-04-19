const express = require('express');
const router = express.Router();

// TODO: Implement transaction routes
// GET /api/transactions - List transactions (filtered by store)
// POST /api/transactions - Create new transaction
// GET /api/transactions/:id - Get transaction by ID

router.get('/', (req, res) => {
  res.json({ message: 'Transactions routes - coming soon' });
});

module.exports = router;
