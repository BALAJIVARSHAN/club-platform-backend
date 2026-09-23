// Owner: FUTURE (Phase 5 dev, computed view)
// Base path: /api/leaderboard
// TODO(FUTURE (Phase 5 dev, computed view)): implement real handlers here.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/leaderboard route stub — not implemented yet', owner: 'FUTURE (Phase 5 dev, computed view)' });
});

module.exports = router;
