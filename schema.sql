-- NetForge schema
-- Conventions: parameterized SQL only in app code; no redundant progress stores.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS modules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lessons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id    INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  lesson_type  TEXT NOT NULL DEFAULT 'reading'
               CHECK (lesson_type IN ('reading', 'lab', 'quiz')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, sort_order);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON lesson_progress(lesson_id);

-- Derived module progress. NOT a stored table. A completion is derived from the
-- set of published lessons per module versus lesson_progress rows.
CREATE VIEW IF NOT EXISTS module_progress AS
SELECT
  u.id AS user_id,
  m.id AS module_id,
  m.slug AS module_slug,
  m.title AS module_title,
  (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1) AS total_lessons,
  (SELECT COUNT(*) FROM lessons l
     JOIN lesson_progress lp ON lp.lesson_id = l.id
    WHERE l.module_id = m.id AND l.is_published = 1 AND lp.user_id = u.id) AS completed_lessons,
  CASE WHEN (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1) > 0
       AND (SELECT COUNT(*) FROM lessons l
              JOIN lesson_progress lp ON lp.lesson_id = l.id
             WHERE l.module_id = m.id AND l.is_published = 1 AND lp.user_id = u.id)
           = (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1)
       THEN 1 ELSE 0 END AS is_complete
FROM users u
CROSS JOIN modules m;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id      INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  explanation    TEXT NOT NULL DEFAULT '',
  sort_order     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quizq_lesson ON quiz_questions(lesson_id, sort_order);

CREATE TABLE IF NOT EXISTS quiz_options (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id  INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text  TEXT NOT NULL,
  is_correct   INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quizopt_q ON quiz_options(question_id, sort_order);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id        INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  score            INTEGER NOT NULL,
  total_questions  INTEGER NOT NULL,
  passed           INTEGER NOT NULL DEFAULT 0,
  completed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_lesson ON quiz_attempts(lesson_id);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_user_lesson ON notes(user_id, lesson_id);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  parent_id   INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_lesson ON comments(lesson_id, created_at);

CREATE TABLE IF NOT EXISTS badges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS glossary_terms (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  term              TEXT NOT NULL UNIQUE COLLATE NOCASE,
  definition        TEXT NOT NULL,
  related_term_ids  TEXT NOT NULL DEFAULT '[]'
);