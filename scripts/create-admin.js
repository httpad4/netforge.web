'use strict';

/*
 * Create (or promote to) an administrator account.
 *
 *   node scripts/create-admin.js <username> <email> [password]
 *
 * If the password argument is omitted you will be prompted. The account is
 * created if needed, then is_admin is set to 1.
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../db.js');

async function promptPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  let pw;
  for (;;) {
    pw = await ask('Password: ');
    if (pw.length >= 8) break;
    console.log('Password must be at least 8 characters.');
  }
  rl.close();
  return pw;
}

(async () => {
  const [, , username, email, pwArg] = process.argv;
  if (!username || !email) {
    console.error('Usage: node scripts/create-admin.js <username> <email> [password]');
    process.exit(1);
  }
  const password = pwArg || (await promptPassword());

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
    console.log(`Promoted "${username}" to admin.`);
  } else {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 1)').run(username, email, hash);
    console.log(`Admin account created: ${username} (${email}).`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});