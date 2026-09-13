'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const auth = require('./lib/auth.js');

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Public API
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/modules', require('./routes/content.js'));
app.use('/api/lessons', require('./routes/lessons.js'));
app.use('/api', require('./routes/progress.js')); // /api/progress, /api/lessons/:id/complete
app.use('/api', require('./routes/quiz.js')); // /api/lessons/:id/quiz(+/attempts)
app.use('/api', require('./routes/notes.js')); // /api/lessons/:id/notes, /api/notes/:id
app.use('/api', require('./routes/comments.js')); // /api/lessons/:id/comments, /api/comments/:id
app.use('/api', require('./routes/glossary.js')); // /api/glossary

// Admin API - guards applied at mount time so they run BEFORE the router's
// own route layers (router.use() would append after the routes instead).
app.use('/api/admin', auth.requireAuth, auth.requireAdmin, require('./routes/admin.js'));

// Static frontend
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// API 404 + JSON error handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const message = status >= 500 ? 'Internal server error.' : err.message;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NetForge running at http://localhost:${PORT}`);
});