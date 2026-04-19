const express = require('express');
const router = express.Router();
const { authMiddleware, storeMiddleware, roleMiddleware } = require('../middleware');
const { STORE_ROLES } = require('../constants/auth.constants');

router.get('/', (req, res) => {
  res.json({ message: 'Stores routes - coming soon' });
});

// Example: scoped to token store + OWNER/ADMIN only
router.get(
  '/:storeId/settings-preview',
  authMiddleware,
  storeMiddleware,
  roleMiddleware(STORE_ROLES.OWNER, STORE_ROLES.ADMIN),
  (req, res) => {
    res.json({
      success: true,
      data: {
        storeId: req.params.storeId,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;
