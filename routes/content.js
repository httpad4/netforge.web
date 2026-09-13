'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');
const progress = require('../lib/progress.js');

const router = express.Router();

// GET /api/modules - published modules with lesson counts (+ completion when logged in)
router.get('/', auth.optionalAuth, (req, res, next) => {
  try {
    const rows =
      req.userId != null
        ? db
            .prepare(
              `SELECT m.id, m.slug, m.title, m.description, m.sort_order,
                      (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1) AS total_lessons,
                      (SELECT l.slug FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1 ORDER BY l.sort_order LIMIT 1) AS first_lesson_slug,
                      mp.completed_lessons
               FROM modules m
               JOIN module_progress mp ON mp.module_id = m.id AND mp.user_id = ?
               WHERE m.is_published = 1
               ORDER BY m.sort_order`
            )
            .all(req.userId)
        : db
            .prepare(
              `SELECT m.id, m.slug, m.title, m.description, m.sort_order,
                      (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1) AS total_lessons,
                      (SELECT l.slug FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1 ORDER BY l.sort_order LIMIT 1) AS first_lesson_slug,
                      0 AS completed_lessons
               FROM modules m
               WHERE m.is_published = 1
               ORDER BY m.sort_order`
            )
            .all();

    res.json({ modules: rows });
  } catch (err) {
    next(err);
  }
});

// Badge catalog (registered before /:slug so it is not swallowed)
router.get('/badges', (req, res) => {
  res.json({ badges: db.prepare('SELECT id, code, title, description, icon FROM badges ORDER BY id').all() });
});

// GET /api/modules/:slug - one module with its (published) lessons
router.get('/:slug', auth.optionalAuth, (req, res, next) => {
  try {
    const mod = db.prepare('SELECT * FROM modules WHERE slug = ? AND is_published = 1').get(req.params.slug);
    if (!mod) return res.status(404).json({ error: 'Module not found.' });

    const lessons =
      req.userId != null
        ? db
            .prepare(
              `SELECT l.id, l.slug, l.title, l.lesson_type, l.sort_order,
                      EXISTS(SELECT 1 FROM lesson_progress lp WHERE lp.user_id = ? AND lp.lesson_id = l.id) AS completed
               FROM lessons l WHERE l.module_id = ? AND l.is_published = 1
               ORDER BY l.sort_order`
            )
            .all(req.userId, mod.id)
        : db
            .prepare(
              `SELECT l.id, l.slug, l.title, l.lesson_type, l.sort_order, 0 AS completed
               FROM lessons l WHERE l.module_id = ? AND l.is_published = 1
               ORDER BY l.sort_order`
            )
            .all(mod.id);

    const total = lessons.length;
    const done = lessons.filter((l) => l.completed).length;
    res.json({ module: mod, lessons, completedLessons: done, totalLessons: total });
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/:slug/lessons/:lessonSlug - lesson scoped to its module
router.get('/:slug/lessons/:lessonSlug', auth.optionalAuth, (req, res, next) => {
  try {
    const mod = db.prepare('SELECT * FROM modules WHERE slug = ? AND is_published = 1').get(req.params.slug);
    if (!mod) return res.status(404).json({ error: 'Module not found.' });

    const lesson = db
      .prepare('SELECT * FROM lessons WHERE slug = ? AND module_id = ? AND is_published = 1')
      .get(req.params.lessonSlug, mod.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const completed =
      req.userId != null &&
      !!db
        .prepare('SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
        .get(req.userId, lesson.id);

    const lessons =
      req.userId != null
        ? db
            .prepare(
              `SELECT l.id, l.slug, l.title, l.lesson_type, l.sort_order,
                      EXISTS(SELECT 1 FROM lesson_progress lp WHERE lp.user_id = ? AND lp.lesson_id = l.id) AS completed
               FROM lessons l WHERE l.module_id = ? AND l.is_published = 1 ORDER BY l.sort_order`
            )
            .all(req.userId, mod.id)
        : db
            .prepare(
              `SELECT l.id, l.slug, l.title, l.lesson_type, l.sort_order, 0 AS completed
               FROM lessons l WHERE l.module_id = ? AND l.is_published = 1 ORDER BY l.sort_order`
            )
            .all(mod.id);

    const idx = lessons.findIndex((l) => l.id === lesson.id);
    res.json({
      lesson: {
        id: lesson.id, slug: lesson.slug, title: lesson.title, content: lesson.content,
        lesson_type: lesson.lesson_type, sort_order: lesson.sort_order, completed,
      },
      module: { id: mod.id, slug: mod.slug, title: mod.title },
      lessons,
      prev: idx > 0 ? lessons[idx - 1].slug : null,
      next: idx < lessons.length - 1 ? lessons[idx + 1].slug : null,
    });
  } catch (err) {
    next(err);
  }
});

// Earned badges for the current user
router.get('/me/badges', auth.requireAuth, (req, res) => {
  res.json({ badges: progress.earnedBadges(req.userId) });
});

module.exports = router;