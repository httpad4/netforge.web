# NetForge

A self-paced, mobile-first learning platform for computer networking (students & hobbyists). Plain HTML/CSS/JS frontend, Node.js + Express backend, SQLite storage.

## Quick start

```bash
npm install
npm start          # http://localhost:3000
npm run seed       # re-seed curriculum if the DB is empty/nonexistent
node scripts/smoke.js   # end-to-end API smoke test (wipes data/netforge.db first)
```

The DB is created and seeded on first boot at `data/netforge.db`. Seed data is inserted only when the `modules` table is empty.

## Accounts & admin

- Anyone can create a regular account via the "Sign in" modal (top-right).
- To create an administrator account (needed for the Admin console and for reviewing the Analytics tab):

```bash
node scripts/create-admin.js <username> <email> [password]
```

If `password` is omitted you will be prompted. Run it once; if the account already exists it is promoted to admin. Course content can then be managed in the Admin page without editing code.

## Security model

- Passwords are hashed with bcrypt (10 salt rounds).
- Sessions are signed JWTs in an httpOnly, SameSite=Lax cookie named `nf_token`.
- The user identity an endpoint acts as is **always** derived from the verified token (`payload.sub`), never from client-sent values.
- All database access uses prepared statements only.
- Progress, badges, and quiz results are computed **server-side** and cannot be granted by the client.
- The admin console is gated by the server at mount time (`requireAuth` + `requireAdmin`).

## Quiz grading

- A quiz lesson is passed at **70%** of questions correct (`QUIZ_PASS_RATIO = 0.7` in `routes/quiz.js`). A perfect score earns the `perfect_quiz` badge. Passing a quiz marks its lesson complete. A non-passing attempt does **not** mark it complete, but you can retry.
- A quiz lesson becomes "completed" only on a passing attempt; the badge is awarded server-side at that moment.

## Gamification interpretations

- **Streak**: the number of consecutive local days (ending today or yesterday) with at least one lesson completed.
- **Continue where you left off**: the first incomplete, published lesson in curriculum order (per-module sort order). NetForge does not track per-lesson view activity.
- **Badges**: `first_lesson`, `module_master` (all lessons in one module complete), `course_complete`, `perfect_quiz`. Awarded server-side inside a transaction with the completion.
- **Analytics** (Admin → Analytics): "most-attempted quiz questions" is interpreted as the most-attempted quiz **lessons**, since only per-attempt score/total is stored (never per-question answers). Combined with pass rate, this flags quiz lessons students find hardest.

## Curriculum content format

Lesson bodies are Markdown rendered by a small in-house renderer (`public/js/markdown.js`). It supports headings, lists, tables, blockquotes, fenced code, inline code/links/image passthrough, and glossary auto-linking on text nodes (skipping `A`, `CODE`, `PRE`, `H1`–`H4`). Labs are inline DOM widgets introduced via `<div data-lab="subnet-calculator|osi-matcher|terminal">` and marked complete with the "Mark lab complete" button at 5 correct subnet answers / 7 matched OSI layers / 5 distinct diagnostic commands.

## API surface

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` |
| Content | `GET /api/modules` · `GET /api/lessons/:slug` · `GET /api/badges` |
| Progress | `POST /api/lessons/:id/complete` · `GET /api/progress` |
| Quiz | `GET /api/lessons/:id/quiz` · `POST /api/lessons/:id/quiz` |
| Notes/comments | `GET|POST /api/lessons/:id/notes` · `DELETE /api/notes/:id` · `GET|POST /api/lessons/:id/comments` · soft-delete `DELETE /api/comments/:id` |
| Glossary | `GET /api/glossary` |
| Admin (auth + admin) | modules/lessons/quiz CRUD + `GET /api/admin/analytics` |