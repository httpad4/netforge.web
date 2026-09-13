'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');

const router = express.Router();

const MAX_BODY = 5000;

function lessonRowsForUser(userId, lessonId) {
  return db
    .prepare(
      `SELECT n.id, n.body, n.created_at, n.updated_at
       FROM notes n WHERE n.user_id = ? AND n.lesson_id = ? ORDER BY n.updated_at DESC`
    )
    .all(userId, lessonId);
}

// GET /api/lessons/:id/notes - a user's own notes for a lesson.
router.get('/lessons/:id/notes', auth.requireAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    res.json({ notes: lessonRowsForUser(req.userId, lessonId) });
  } catch (err) {
    next(err);
  }
});

// POST /api/lessons/:id/notes
router.post('/lessons/:id/notes', auth.requireAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    const body = (req.body && req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Note body is required.' });
    if (body.length > MAX_BODY) return res.status(400).json({ error: 'Note is too long.' });

    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    db.prepare('INSERT INTO notes (user_id, lesson_id, body) VALUES (?, ?, ?)')
      .run(req.userId, lessonId, body);
    res.status(201).json({ notes: lessonRowsForUser(req.userId, lessonId) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notes/:noteId - update own note.
router.put('/notes/:noteId', auth.requireAuth, (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    const body = (req.body && req.body.body || '').trim();
    if (!Number.isInteger(noteId)) return res.status(400).json({ error: 'Invalid note id.' });
    if (!body) return res.status(400).json({ error: 'Note body is required.' });
    if (body.length > MAX_BODY) return res.status(400).json({ error: 'Note is too long.' });

    const note = db.prepare('SELECT id, lesson_id FROM notes WHERE id = ? AND user_id = ?').get(noteId, req.userId);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    db.prepare("UPDATE notes SET body = ?, updated_at = datetime('now') WHERE id = ?").run(body, noteId);
    res.json({ notes: lessonRowsForUser(req.userId, note.lesson_id) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:noteId
router.delete('/notes/:noteId', auth.requireAuth, (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    if (!Number.isInteger(noteId)) return res.status(400).json({ error: 'Invalid note id.' });
    const note = db.prepare('SELECT id, lesson_id FROM notes WHERE id = ? AND user_id = ?').get(noteId, req.userId);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(noteId, req.userId);
    res.json({ notes: lessonRowsForUser(req.userId, note.lesson_id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;