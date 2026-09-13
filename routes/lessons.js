'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');

const router = express.Router();

// GET /api/lessons/:slug - full lesson content with module context for the sidebar
router.get('/:slug', auth.optionalAuth, (req, res, next) => {
  try {
    const lesson = db
      .prepare('SELECT * FROM lessons WHERE slug = ? AND is_published = 1')
      .get(req.params.slug);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const mod = db.prepare('SELECT * FROM modules WHERE id = ? AND is_published = 1').get(lesson.module_id);
    if (!mod) return res.status(404).json({ error: 'Module not found.' });

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

module.exports = router;