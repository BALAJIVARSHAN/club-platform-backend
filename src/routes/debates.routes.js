const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/debates not implemented yet' });
});

module.exports = router;
