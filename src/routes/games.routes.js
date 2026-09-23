// Owner: FUTURE (Phase 5 dev)
// Base path: /api/games
// TODO(FUTURE (Phase 5 dev)): implement real handlers here.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/games route stub — not implemented yet', owner: 'FUTURE (Phase 5 dev)' });
});

module.exports = router;
