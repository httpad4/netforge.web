'use strict';

const express = require('express');
const db = require('../db.js');

const router = express.Router();

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LESSON_TYPES = ['reading', 'lab', 'quiz'];

function fail(res, message) {
  return res.status(400).json({ error: message });
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

router.get('/modules', (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.id, m.slug, m.title, m.description, m.sort_order, m.is_published,
              (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id) AS lesson_count
       FROM modules m ORDER BY m.sort_order, m.id`
    )
    .all();
  res.json({ modules: rows });
});

router.post('/modules', (req, res, next) => {
  try {
    const { slug, title, description = '', sort_order = 0, is_published = 1 } = req.body || {};
    if (!SLUG_RE.test(slug || '')) return fail(res, 'Invalid slug (lowercase letters, numbers, dashes).');
    if (!(title || '').trim()) return fail(res, 'Title is required.');
    if (db.prepare('SELECT 1 FROM modules WHERE slug = ?').get(slug)) {
      return fail(res, 'That slug is already in use.');
    }
    const info = db
      .prepare('INSERT INTO modules (slug, title, description, sort_order, is_published) VALUES (?, ?, ?, ?, ?)')
      .run(slug, title.trim(), description.trim(), Number(sort_order) || 0, is_published ? 1 : 0);
    res.status(201).json({ module: db.prepare('SELECT * FROM modules WHERE id = ?').get(info.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put('/modules/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM modules WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Module not found.' });

    const b = req.body || {};
    const slug = (b.slug || existing.slug).trim();
    const title = (b.title || existing.title).trim();
    if (!SLUG_RE.test(slug)) return fail(res, 'Invalid slug (lowercase letters, numbers, dashes).');
    if (!title) return fail(res, 'Title is required.');

    const clash = db.prepare('SELECT 1 FROM modules WHERE slug = ? AND id != ?').get(slug, id);
    if (clash) return fail(res, 'That slug is already in use.');

    db.prepare(
      `UPDATE modules
       SET slug = ?, title = ?, description = ?, sort_order = ?, is_published = ?
       WHERE id = ?`
    ).run(
      slug,
      title,
      b.description !== undefined ? b.description.trim() : existing.description,
      b.sort_order !== undefined ? Number(b.sort_order) || 0 : existing.sort_order,
      b.is_published !== undefined ? (b.is_published ? 1 : 0) : existing.is_published,
      id
    );
    res.json({ module: db.prepare('SELECT * FROM modules WHERE id = ?').get(id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/modules/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM modules WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Module not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

router.get('/modules/:id/lessons', (req, res) => {
  const id = Number(req.params.id);
  const rows = db
    .prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY sort_order, id')
    .all(id);
  res.json({ lessons: rows });
});

router.post('/lessons', (req, res, next) => {
  try {
    const b = req.body || {};
    const moduleId = Number(b.module_id);
    const moduleRow = moduleId ? db.prepare('SELECT id FROM modules WHERE id = ?').get(moduleId) : null;
    if (!moduleRow) return fail(res, 'A valid module_id is required.');
    if (!SLUG_RE.test(b.slug || '')) return fail(res, 'Invalid slug (lowercase letters, numbers, dashes).');
    if (!(b.title || '').trim()) return fail(res, 'Title is required.');
    if (!LESSON_TYPES.includes(b.lesson_type)) return fail(res, 'lesson_type must be reading, lab, or quiz.');
    if (db.prepare('SELECT 1 FROM lessons WHERE slug = ?').get(b.slug)) return fail(res, 'That slug is already in use.');

    const info = db
      .prepare(
        `INSERT INTO lessons (module_id, slug, title, content, lesson_type, sort_order, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        moduleId,
        b.slug.trim(),
        b.title.trim(),
        b.content || '',
        b.lesson_type,
        Number(b.sort_order) || 0,
        b.is_published === undefined ? 1 : (b.is_published ? 1 : 0)
      );
    res.status(201).json({ lesson: db.prepare('SELECT * FROM lessons WHERE id = ?').get(info.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put('/lessons/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Lesson not found.' });

    const b = req.body || {};
    const slug = (b.slug || existing.slug).trim();
    const title = (b.title || existing.title).trim();
    if (!SLUG_RE.test(slug)) return fail(res, 'Invalid slug (lowercase letters, numbers, dashes).');
    if (!title) return fail(res, 'Title is required.');
    if (b.lesson_type && !LESSON_TYPES.includes(b.lesson_type)) return fail(res, 'lesson_type must be reading, lab, or quiz.');
    if (b.module_id != null && !db.prepare('SELECT id FROM modules WHERE id = ?').get(Number(b.module_id))) {
      return fail(res, 'Unknown module_id.');
    }
    if (db.prepare('SELECT 1 FROM lessons WHERE slug = ? AND id != ?').get(slug, id)) {
      return fail(res, 'That slug is already in use.');
    }

    db.prepare(
      `UPDATE lessons
       SET module_id = ?, slug = ?, title = ?, content = ?, lesson_type = ?, sort_order = ?, is_published = ?
       WHERE id = ?`
    ).run(
      b.module_id != null ? Number(b.module_id) : existing.module_id,
      slug,
      title,
      b.content !== undefined ? b.content : existing.content,
      b.lesson_type || existing.lesson_type,
      b.sort_order !== undefined ? Number(b.sort_order) || 0 : existing.sort_order,
      b.is_published !== undefined ? (b.is_published ? 1 : 0) : existing.is_published,
      id
    );
    res.json({ lesson: db.prepare('SELECT * FROM lessons WHERE id = ?').get(id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/lessons/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Lesson not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Quiz questions (full fidelity - includes is_correct)
// ---------------------------------------------------------------------------

router.get('/lessons/:id/quiz', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const lesson = db.prepare('SELECT id, lesson_type FROM lessons WHERE id = ?').get(id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    if (lesson.lesson_type !== 'quiz') return fail(res, 'Lesson is not a quiz.');
    const questions = db
      .prepare('SELECT id, question_text, explanation, sort_order FROM quiz_questions WHERE lesson_id = ? ORDER BY sort_order, id')
      .all(id);
    const full = questions.map((q) => ({
      ...q,
      options: db.prepare('SELECT id, option_text, is_correct, sort_order FROM quiz_options WHERE question_id = ? ORDER BY sort_order, id').all(q.id),
    }));
    res.json({ quiz: full });
  } catch (err) {
    next(err);
  }
});

// PUT /lessons/:id/quiz - replaces the entire question set. quiz_options are
// not referenced elsewhere, so replace is safe.
router.put('/lessons/:id/quiz', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const lesson = db.prepare('SELECT id, lesson_type FROM lessons WHERE id = ?').get(id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    if (lesson.lesson_type !== 'quiz') return fail(res, 'Lesson is not a quiz.');

    const questions = Array.isArray(req.body && req.body.questions) ? req.body.questions : null;
    if (!questions) return fail(res, 'Expected { questions: [...] }.');

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE lesson_id = ?)').run(id);
      db.prepare('DELETE FROM quiz_questions WHERE lesson_id = ?').run(id);

      const insertQ = db.prepare(
        'INSERT INTO quiz_questions (lesson_id, question_text, explanation, sort_order) VALUES (?, ?, ?, ?)'
      );
      const insertO = db.prepare(
        'INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?)'
      );

      questions.forEach((q, qi) => {
        const text = (q.question_text || '').trim();
        if (!text) return;
        const opts = Array.isArray(q.options) ? q.options : [];
        const correctCount = opts.filter((o) => o.is_correct).length;
        if (opts.length < 2 || correctCount < 1) return;

        const qInfo = insertQ.run(id, text, (q.explanation || '').trim(), Number(q.sort_order) || qi + 1);
        opts.forEach((o, oi) => {
          insertO.run(qInfo.lastInsertRowid, (o.option_text || '').trim(), o.is_correct ? 1 : 0, Number(o.sort_order) || oi + 1);
        });
      });
    });
    tx();

    const questions2 = db
      .prepare('SELECT id, question_text, explanation, sort_order FROM quiz_questions WHERE lesson_id = ? ORDER BY sort_order, id')
      .all(id);
    res.json({ quiz: questions2.map((q) => ({
      ...q,
      options: db.prepare('SELECT id, option_text, is_correct, sort_order FROM quiz_options WHERE question_id = ? ORDER BY sort_order, id').all(q.id),
    })) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

router.get('/analytics', (req, res, next) => {
  try {
    const modules = db
      .prepare(
        `SELECT m.id, m.slug, m.title, m.sort_order,
                mp.total_users,
                mp.users_complete,
                mp.avg_pct
         FROM modules m
         LEFT JOIN (
           SELECT module_id,
                  COUNT(*) AS total_users,
                  SUM(is_complete) AS users_complete,
                  ROUND(100.0 * SUM(completed_lessons) / NULLIF(SUM(total_lessons), 0), 1) AS avg_pct
           FROM module_progress
           WHERE total_lessons > 0
           GROUP BY module_id
         ) mp ON mp.module_id = m.id
         ORDER BY m.sort_order`
      )
      .all();

    const quizzes = db
      .prepare(
        `SELECT l.id AS lesson_id, l.title, l.slug, m.title AS module_title,
                COUNT(qa.id) AS attempts,
                COALESCE(SUM(qa.passed), 0) AS passes,
                AVG(100.0 * qa.score / qa.total_questions) AS avg_score
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         LEFT JOIN quiz_attempts qa ON qa.lesson_id = l.id
         WHERE l.lesson_type = 'quiz'
         GROUP BY l.id
         ORDER BY attempts DESC, l.id`
      )
      .all();

    const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

    res.json({
      users: userCount,
      modules: modules.map((m) => ({
        ...m,
        total_users: m.total_users || 0,
        users_complete: m.users_complete || 0,
        avg_pct: m.avg_pct == null ? 0 : Number(m.avg_pct),
      })),
      quizzes: quizzes.map((q) => ({
        lesson_id: q.lesson_id,
        title: q.title,
        slug: q.slug,
        module_title: q.module_title,
        attempts: q.attempts,
        passes: q.passes,
        pass_rate: q.attempts ? Math.round((100 * q.passes) / q.attempts) : 0,
        avg_score: q.avg_score == null ? 0 : Math.round(Number(q.avg_score)),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;