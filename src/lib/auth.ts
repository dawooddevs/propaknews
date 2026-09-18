import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';

const WEEK = 7 * 24 * 3600 * 1000;

export function login(username: string, password: string): string | null {
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.pass_hash)) return null;
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, Date.now() + WEEK);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return token;
}

export function checkSession(token: string | undefined): boolean {
  if (!token) return false;
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as any;
  return !!s && s.expires_at > Date.now();
}

export const logout = (token: string) => db.prepare('DELETE FROM sessions WHERE token = ?').run(token);

export function changePassword(username: string, newPassword: string) {
  db.prepare('UPDATE users SET pass_hash = ? WHERE username = ? COLLATE NOCASE')
    .run(bcrypt.hashSync(newPassword, 10), username);
  db.prepare('DELETE FROM sessions').run();
}
