'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');
const progress = require('../lib/progress.js');

const router = express.Router();

// POST /api/lessons/:id/complete - idempotent, badges checked server-side.
router.post('/lessons/:id/complete', auth.requireAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });

    const result = progress.completeLesson(req.userId, lessonId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/progress - everything the dashboard and module cards need.
router.get('/progress', auth.requireAuth, (req, res, next) => {
  try {
    const { modules, overall } = progress.moduleProgress(req.userId);
    res.json({
      modules,
      overall,
      continueLesson: progress.continueLesson(req.userId),
      streak: progress.buildStreak(req.userId),
      badges: progress.earnedBadges(req.userId),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;