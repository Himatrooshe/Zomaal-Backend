const express = require('express');
const router = express.Router();

// TODO: Implement KPI routes
// GET /api/kpi/snapshot - Get KPI snapshot
// GET /api/kpi/dashboard - Get dashboard data

router.get('/snapshot', (req, res) => {
  res.json({ message: 'KPI snapshot - coming soon' });
});

router.get('/dashboard', (req, res) => {
  res.json({ message: 'Dashboard data - coming soon' });
});

module.exports = router;
