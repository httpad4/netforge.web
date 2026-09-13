'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');
const progress = require('../lib/progress.js');

const router = express.Router();

// Passing threshold: at least 70% of questions correct. Documented in README and
// surfaced on the quiz UI.
const QUIZ_PASS_RATIO = 0.7;

const lessonStmt = db.prepare('SELECT id, slug, title FROM lessons WHERE id = ? AND is_published = 1');
const questionsStmt = db.prepare(
  'SELECT id, question_text, explanation FROM quiz_questions WHERE lesson_id = ? ORDER BY sort_order, id'
);
const optionsStmt = db.prepare(
  'SELECT id, question_id, option_text, is_correct FROM quiz_options WHERE question_id = ? ORDER BY sort_order, id'
);

function getQuiz(lessonId) {
  const lesson = lessonStmt.get(lessonId);
  if (!lesson) {
    const err = new Error('Lesson not found or not published.');
    err.status = 404;
    throw err;
  }
  const type = db.prepare('SELECT lesson_type FROM lessons WHERE id = ?').get(lessonId);
  if (type.lesson_type !== 'quiz') {
    const err = new Error('This lesson is not a quiz.');
    err.status = 400;
    throw err;
  }
  const questions = questionsStmt.all(lesson.id || lessonId);
  const full = questions.map((q) => ({ ...q, options: optionsStmt.all(q.id) }));
  return { lesson, questions: full };
}

// GET /api/lessons/:id/quiz - NEVER leaks is_correct or explanation before submission.
router.get('/lessons/:id/quiz', auth.optionalAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    const { lesson, questions } = getQuiz(lessonId);
    res.json({
      lesson,
      passRatio: QUIZ_PASS_RATIO,
      questions: questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options.map((o) => ({ id: o.id, option_text: o.option_text })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/lessons/:id/quiz/attempts - scoring happens ENTIRELY server-side.
router.post('/lessons/:id/quiz/attempts', auth.requireAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    const { lesson, questions } = getQuiz(lessonId);
    if (questions.length === 0) return res.status(400).json({ error: 'This quiz has no questions.' });

    const submitted = (req.body && req.body.answers) || {};

    const feedback = questions.map((q) => {
      const givenId = Number(submitted[q.id]);
      const chosen = q.options.find((o) => o.id === givenId);
      const correctOption = q.options.find((o) => o.is_correct === 1);
      const correct = !!(chosen && correctOption && chosen.id === correctOption.id);
      return {
        questionId: q.id,
        question_text: q.question_text,
        selectedOptionId: chosen ? chosen.id : null,
        correctOptionId: correctOption ? correctOption.id : null,
        correct,
        explanation: q.explanation,
      };
    });

    const score = feedback.filter((f) => f.correct).length;
    const total = questions.length;
    const passed = total > 0 && score / total >= QUIZ_PASS_RATIO;

    db.prepare(
      `INSERT INTO quiz_attempts (user_id, lesson_id, score, total_questions, passed)
       VALUES (?, ?, ?, ?, ?)`
    ).run(req.userId, lessonId, score, total, passed ? 1 : 0);

    const newBadges = [];

    if (passed) {
      const res2 = progress.completeLesson(req.userId, lessonId);
      newBadges.push(...res2.newBadges);
    }
    if (score === total && total > 0) {
      const b = progress.awardBadge(req.userId, progress.BADGE.PERFECT_QUIZ);
      if (b) newBadges.push(b);
    }

    res.json({ score, total, passed, passRatio: QUIZ_PASS_RATIO, feedback, newBadges });
  } catch (err) {
    next(err);
  }
});

// GET /api/lessons/:id/quiz/attempts - the current user's attempt history.
router.get('/lessons/:id/quiz/attempts', auth.requireAuth, (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId)) return res.status(400).json({ error: 'Invalid lesson id.' });
    const attempts = db
      .prepare(
        `SELECT id, score, total_questions, passed, completed_at
         FROM quiz_attempts WHERE user_id = ? AND lesson_id = ? ORDER BY completed_at`
      )
      .all(req.userId, lessonId);
    res.json({ attempts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;