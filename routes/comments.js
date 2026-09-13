'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');

const router = express.Router();

const MAX_BODY = 2000;

function commentRows(lessonId) {
  return db
    .prepare(
      `SELECT c.id, c.user_id, c.lesson_id, c.parent_id, c.body, c.is_deleted, c.created_at,
              u.username, u.display_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.lesson_id = ?
       ORDER BY c.created_at ASC, c.id ASC`
    )
    .all(lessonId);
}

// GET /api/lessons/:id/comments
router.get('/lessons/:id/comments', auth.optionalAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    const rows = commentRows(lessonId);
    res.json({
      comments: rows.map((r) => ({
        id: r.id,
        parent_id: r.parent_id,
        body: r.is_deleted === 1 ? null : r.body,
        is_deleted: r.is_deleted === 1,
        created_at: r.created_at,
        author: r.display_name,
        username: r.username,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/lessons/:id/comments - one level of replies via parent_id.
router.post('/lessons/:id/comments', auth.requireAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    const body = (req.body && req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment body is required.' });
    if (body.length > MAX_BODY) return res.status(400).json({ error: 'Comment is too long.' });

    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ? AND is_published = 1').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    let parentId = null;
    if (req.body.parent_id != null) {
      parentId = Number(req.body.parent_id);
      const parent = db
        .prepare('SELECT id, lesson_id, parent_id FROM comments WHERE id = ?')
        .get(parentId);
      if (!parent) return res.status(400).json({ error: 'Parent comment not found.' });
      if (parent.lesson_id !== lessonId) return res.status(400).json({ error: 'Parent comment is on another lesson.' });
      if (parent.parent_id != null) return res.status(400).json({ error: 'Replies are limited to one level.' });
    }

    db.prepare('INSERT INTO comments (user_id, lesson_id, parent_id, body) VALUES (?, ?, ?, ?)')
      .run(req.userId, lessonId, parentId, body);
    res.status(201).json({ comments: commentRows(lessonId).map((r) => ({
      id: r.id,
      parent_id: r.parent_id,
      body: r.is_deleted === 1 ? null : r.body,
      is_deleted: r.is_deleted === 1,
      created_at: r.created_at,
      author: r.display_name,
      username: r.username,
    })) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/comments/:id - soft delete only (owner or admin).
router.delete('/comments/:id', auth.requireAuth, (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    if (!Number.isInteger(commentId)) return res.status(400).json({ error: 'Invalid comment id.' });

    const comment = db.prepare('SELECT id, lesson_id, user_id FROM comments WHERE id = ?').get(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const isAdmin = req.auth.is_admin === true || req.auth.is_admin === 1;
    if (!isAdmin && comment.user_id !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }

    db.prepare('UPDATE comments SET is_deleted = 1 WHERE id = ?').run(commentId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;