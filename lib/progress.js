'use strict';

/*
 * Progress + gamification engine (server-side ONLY).
 *
 * - Completion of a lesson is an idempotent insert into lesson_progress.
 * - Module completion is DERIVED from module_progress view (never stored).
 * - Badges are awarded here, inside completion / quiz endpoints - never by the client.
 * - Streak: consecutive days (local time) with at least one completion, counting
 *   back from today, or from yesterday if today has none yet.
 */

const db = require('../db.js');

const BADGE = {
  FIRST_LESSON: 'first_lesson',
  MODULE_MASTER: 'module_master',
  COURSE_COMPLETE: 'course_complete',
  PERFECT_QUIZ: 'perfect_quiz',
};

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

// Marks a lesson complete for a user. Idempotent. Returns { already, newBadges }.
function completeLesson(userId, lessonId) {
  const lesson = db
    .prepare('SELECT id, lesson_type FROM lessons WHERE id = ? AND is_published = 1')
    .get(lessonId);
  if (!lesson) {
    const err = new Error('Lesson not found or not published');
    err.status = 404;
    throw err;
  }

  const existing = db
    .prepare('SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lessonId);
  if (!existing) {
    db.prepare('INSERT INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)').run(userId, lessonId);
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 401;
    throw err;
  }

  return {
    completed: true,
    already: !!existing,
    newBadges: checkBadges(userId),
  };
}

function isModuleComplete(moduleId, userId) {
  const row = db
    .prepare('SELECT is_complete FROM module_progress WHERE user_id = ? AND module_id = ?')
    .get(userId, moduleId);
  return !!(row && row.is_complete);
}

function isCourseComplete(userId) {
  const rows = db.prepare('SELECT is_complete FROM module_progress WHERE user_id = ?').all(userId);
  return rows.length > 0 && rows.every((r) => r.is_complete);
}

function hasAnyProgress(userId) {
  return !!db.prepare('SELECT id FROM lesson_progress WHERE user_id = ? LIMIT 1').get(userId);
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function awardBadge(userId, code) {
  const badge = db.prepare('SELECT id, code, title, icon FROM badges WHERE code = ?').get(code);
  if (!badge) return null;
  const res = db
    .prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)')
    .run(userId, badge.id);
  if (res.changes === 0) return null; // already owned
  return { code: badge.code, title: badge.title, icon: badge.icon };
}

// Recomputes badge conditions for a user. Returns newly awarded badge objects.
function checkBadges(userId) {
  const earned = [];

  if (hasAnyProgress(userId)) {
    const b = awardBadge(userId, BADGE.FIRST_LESSON);
    if (b) earned.push(b);
  }

  const fullyComplete = db
    .prepare(
      `SELECT module_id FROM module_progress
       WHERE user_id = ? AND is_complete = 1`
    )
    .all(userId);
  if (fullyComplete.length > 0) {
    const b = awardBadge(userId, BADGE.MODULE_MASTER);
    if (b) earned.push(b);
  }

  if (isCourseComplete(userId)) {
    const b = awardBadge(userId, BADGE.COURSE_COMPLETE);
    if (b) earned.push(b);
  }

  return earned;
}

function earnedBadges(userId) {
  return db
    .prepare(
      `SELECT b.code, b.title, b.description, b.icon, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = ?
       ORDER BY ub.earned_at`
    )
    .all(userId);
}

// ---------------------------------------------------------------------------
// Progress queries
// ---------------------------------------------------------------------------

function moduleProgress(userId) {
  const rows =
    userId != null
      ? db
          .prepare(
            `SELECT module_id, module_slug, module_title, total_lessons, completed_lessons, is_complete,
                    (SELECT l.slug FROM lessons l WHERE l.module_id = module_id AND l.is_published = 1 ORDER BY l.sort_order LIMIT 1) AS first_lesson_slug
             FROM module_progress WHERE user_id = ? ORDER BY (SELECT sort_order FROM modules WHERE id = module_id)`
          )
          .all(userId)
      : db
          .prepare(
            `SELECT DISTINCT module_id, module_slug, module_title, total_lessons, 0 AS completed_lessons, 0 AS is_complete,
                    (SELECT l.slug FROM lessons l WHERE l.module_id = module_id AND l.is_published = 1 ORDER BY l.sort_order LIMIT 1) AS first_lesson_slug
             FROM module_progress ORDER BY (SELECT sort_order FROM modules WHERE id = module_id)`
          )
          .all();

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total_lessons,
      completed: acc.completed + r.completed_lessons,
    }),
    { total: 0, completed: 0 }
  );

  const idCache = db.prepare('SELECT id FROM modules WHERE slug = ?');

  return {
    modules: rows.map((r) => ({
      moduleId: r.module_id,
      slug: r.module_slug,
      title: r.module_title,
      firstLessonSlug: r.first_lesson_slug,
      totalLessons: r.total_lessons,
      completedLessons: r.completed_lessons,
      isComplete: r.is_complete === 1,
    })),
    overall: {
      totalLessons: totals.total,
      completedLessons: totals.completed,
      percent: totals.total === 0 ? 0 : Math.round((totals.completed / totals.total) * 100),
      isComplete: totals.total > 0 && totals.completed === totals.total,
    },
    courseId: idCache.get('networking-basics') || null,
  };
}

// "Continue where you left off": the first incomplete published lesson in
// curriculum order (module sort_order, then lesson sort_order).
function continueLesson(userId) {
  if (userId == null) return null;
  return db
    .prepare(
      `SELECT l.id, l.slug AS lesson_slug, l.title, m.slug AS module_slug, m.title AS module_title
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE l.is_published = 1
         AND NOT EXISTS (SELECT 1 FROM lesson_progress lp WHERE lp.user_id = ? AND lp.lesson_id = l.id)
       ORDER BY m.sort_order, l.sort_order
       LIMIT 1`
    )
    .get(userId) || null;
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

function buildStreak(userId) {
  if (userId == null) return { current: 0, longest: 0 };
  const rows = db
    .prepare('SELECT date(completed_at) AS d FROM lesson_progress WHERE user_id = ?')
    .all(userId);
  if (rows.length === 0) return { current: 0, longest: 0 };

  const days = new Set(rows.map((r) => r.d));
  const toKey = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  // Earliest to latest, computing longest run.
  const dates = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(`${dates[i - 1]}T00:00:00`);
    const cur = new Date(`${dates[i]}T00:00:00`);
    const diff = Math.round((cur - prev) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak: count back from today, or yesterday if today is empty.
  let current = 0;
  let cursor = new Date();
  if (!days.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}

module.exports = {
  BADGE,
  completeLesson,
  checkBadges,
  awardBadge,
  earnedBadges,
  moduleProgress,
  continueLesson,
  buildStreak,
  isCourseComplete,
};