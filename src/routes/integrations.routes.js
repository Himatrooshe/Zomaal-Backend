const express = require('express');
const router = express.Router();

// TODO: Implement integration routes
// GET /api/integrations - List integrations
// POST /api/integrations - Create/connect integration
// PUT /api/integrations/:id - Update integration
// DELETE /api/integrations/:id - Disconnect integration

router.get('/', (req, res) => {
  res.json({ message: 'Integrations routes - coming soon' });
});

module.exports = router;
