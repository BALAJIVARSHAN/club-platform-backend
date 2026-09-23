// Owner: m1
// Base path: /api/auth
// TODO(m1): implement real handlers here.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/auth route stub — not implemented yet', owner: 'm1' });
});

module.exports = router;
