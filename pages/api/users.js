// POST -> create user
// GET  -> ?link=<userLink>  returns user
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

const DB_PATH = path.join(process.cwd(), 'data.db');
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '');
}
const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT,
  userLink TEXT UNIQUE,
  adminToken TEXT,
  createdAt TEXT
);
`);

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username } = req.body;
    if (!username || username.trim().length === 0) return res.status(400).json({ error: 'username required' });
    const id = nanoid(12);
    const userLink = `anonymous-${nanoid(8)}`;
    const adminToken = nanoid(32);
    const createdAt = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO users (id, username, userLink, adminToken, createdAt) VALUES (?,?,?,?,?)');
    try {
      stmt.run(id, username.trim(), userLink, adminToken, createdAt);
      return res.json({ id, username: username.trim(), userLink, adminToken, createdAt });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'could not create user' });
    }
  }

  if (req.method === 'GET') {
    const { link } = req.query;
    if (!link) return res.status(400).json({ error: 'link required' });
    const row = db.prepare('SELECT id, username, userLink, createdAt FROM users WHERE userLink = ?').get(link);
    if (!row) return res.status(404).json({ error: 'not found' });
    return res.json(row);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
