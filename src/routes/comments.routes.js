const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/comments not implemented yet' });
});

module.exports = router;
