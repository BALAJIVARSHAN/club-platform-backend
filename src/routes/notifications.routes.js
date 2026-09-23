// Owner: TBD (m1 or shared)
// Base path: /api/notifications
// TODO(TBD (m1 or shared)): implement real handlers here.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '/api/notifications route stub — not implemented yet', owner: 'TBD (m1 or shared)' });
});

module.exports = router;
