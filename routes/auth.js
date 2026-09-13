'use strict';

const express = require('express');
const db = require('../db.js');
const auth = require('../lib/auth.js');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration(body) {
  const errors = [];
  const username = (body.username || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const displayName = (body.display_name || '').trim() || username;

  if (!USERNAME_RE.test(username)) {
    errors.push('Username must be 3-20 characters (letters, numbers, underscore).');
  }
  if (!EMAIL_RE.test(email)) {
    errors.push('A valid email address is required.');
  }
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  return { username, email, password, displayName, errors };
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, displayName, errors } = validateRegistration(req.body || {});
    if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

    const taken = db
      .prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE')
      .get(username, email);
    if (taken) return res.status(409).json({ error: 'Username or email is already in use.' });

    const hash = await auth.hashPassword(password);
    const info = db
      .prepare('INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)')
      .run(username, email, hash, displayName);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    auth.setCookie(res, auth.signUser(user));
    res.status(201).json(auth.publicUser(user));
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = (req.body.identifier || '').trim();
    const password = req.body.password || '';
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Provide an identifier (username or email) and a password.' });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE')
      .get(identifier, identifier);
    if (!user || !(await auth.verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
    auth.setCookie(res, auth.signUser(user));

    // Serve the dirties-but-simple read: fresh row without hash concerns.
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    res.json(auth.publicUser(fresh));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  auth.clearCookie(res);
  res.json({ ok: true });
});

// Identity is ALWAYS derived from the verified token.
router.get('/me', auth.requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) {
    auth.clearCookie(res);
    return res.status(401).json({ error: 'Account no longer exists.' });
  }
  req.auth.is_admin = user.is_admin; // keep token + row in sync
  res.json(auth.publicUser(user));
});

module.exports = router;