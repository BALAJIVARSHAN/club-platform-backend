// Owner: m3
// Base path: /api/debates
// TODO(m3): implement real handlers here.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/debates route stub — not implemented yet', owner: 'm3' });
});

module.exports = router;
