const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/posts', require('./posts.routes'));
router.use('/comments', require('./comments.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/tags', require('./tags.routes'));
router.use('/debates', require('./debates.routes'));
router.use('/games', require('./games.routes'));
router.use('/streaks', require('./streaks.routes'));
router.use('/leaderboard', require('./leaderboard.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/search', require('./search.routes'));

module.exports = router;
