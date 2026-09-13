'use strict';

/*
 * Auth helpers: JWT issuance/verification, httpOnly cookie handling,
 * password hashing (bcrypt), and route guards that ALWAYS derive identity
 * from the verified token - never from client-supplied fields.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const COOKIE_NAME = 'nf_token';
const SESSION_TTL = '7d';

// Secret: prefer env var; otherwise persist one under data/ so sessions
// survive restarts in development.
let rawSecret = process.env.NETFORGE_SECRET;
if (!rawSecret) {
  const secretFile = path.join(__dirname, '..', 'data', '.jwt_secret');
  if (fs.existsSync(secretFile)) {
    rawSecret = fs.readFileSync(secretFile, 'utf8').trim();
  } else {
    rawSecret = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, rawSecret, { mode: 0o600 });
  }
}
const SECRET = rawSecret;

const ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hash(password, ROUNDS);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signUser(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, is_admin: user.is_admin },
    SECRET,
    { expiresIn: SESSION_TTL, algorithm: 'HS256' }
  );
}

function setCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true behind HTTPS (production)
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    display_name: u.display_name,
    is_admin: u.is_admin === 1 || u.is_admin === true,
  };
}

// Verifies the token in the cookie (fallback: Authorization Bearer header).
function verifyRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const payload = verifyRequest(req);
  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.auth = payload;
  req.userId = payload.sub;
  next();
}

// Optional auth: attaches req.userId when present, otherwise continues as guest.
function optionalAuth(req, res, next) {
  const payload = verifyRequest(req);
  if (payload) {
    req.auth = payload;
    req.userId = payload.sub;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.is_admin !== true && req.auth.is_admin !== 1) {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signUser,
  setCookie,
  clearCookie,
  publicUser,
  requireAuth,
  optionalAuth,
  requireAdmin,
};