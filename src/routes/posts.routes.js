// Owner: m2
// Base path: /api/posts
// TODO(m2): implement real handlers here.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/posts route stub — not implemented yet', owner: 'm2' });
});

module.exports = router;
