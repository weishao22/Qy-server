'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function writeAdmin(data) {
  ensureDataDir();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
}

function readAdmin() {
  ensureDataDir();
  if (!fs.existsSync(ADMIN_FILE)) {
    const salt = crypto.randomBytes(16).toString('hex');
    const initial = process.env.ADMIN_PASSWORD || 'admin123';
    const data = {
      salt,
      hash: hashPassword(initial, salt),
      mustChange: true,
      updatedAt: new Date().toISOString()
    };
    writeAdmin(data);
    return data;
  }
  const raw = fs.readFileSync(ADMIN_FILE, 'utf8');
  return JSON.parse(raw);
}

function verifyPassword(password) {
  const data = readAdmin();
  const expected = Buffer.from(data.hash, 'hex');
  const actual = Buffer.from(hashPassword(password, data.salt), 'hex');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function changePassword(current, next) {
  if (!verifyPassword(current)) {
    return { ok: false, error: '当前密码不正确' };
  }
  if (typeof next !== 'string' || next.length < 6) {
    return { ok: false, error: '新密码至少需要 6 个字符' };
  }
  const salt = crypto.randomBytes(16).toString('hex');
  writeAdmin({
    salt,
    hash: hashPassword(next, salt),
    mustChange: false,
    updatedAt: new Date().toISOString()
  });
  return { ok: true };
}

function mustChangePassword() {
  return Boolean(readAdmin().mustChange);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL });
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function pruneSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

module.exports = {
  DATA_DIR,
  verifyPassword,
  changePassword,
  mustChangePassword,
  createSession,
  validateSession,
  destroySession,
  pruneSessions,
  SESSION_TTL
};
