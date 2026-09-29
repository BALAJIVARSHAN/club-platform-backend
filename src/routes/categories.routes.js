const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/categories not implemented yet' });
});

module.exports = router;
