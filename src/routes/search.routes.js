// Owner: m5 (Balaji) — Database + Search module
// Base path: /api/search
// Day 3: basic ILIKE search across posts/debates/users/tags — see search.controller.js
// Day 4 TODO: upgrade to tsvector/GIN + ts_rank

const express = require('express');
const router = express.Router();
const { search } = require('../controllers/search.controller');

router.get('/', search);

module.exports = router;
