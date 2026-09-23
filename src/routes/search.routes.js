// Owner: m5 (Balaji) — Database + Search module
// Base path: /api/search
// Day 3 TODO: basic ILIKE search across posts/debates/users
// Day 4 TODO: upgrade to tsvector/GIN + ts_rank, add pagination/filters

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/search route stub — implementation starts Day 3' });
});

module.exports = router;
