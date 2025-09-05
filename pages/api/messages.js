// POST -> send message (body: { userLink, audioBase64, mime?, duration? })
// GET  -> list messages for a vault (query: userLink, adminToken)
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

const DB_PATH = path.join(process.cwd(), 'data.db');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  userId TEXT,
  filename TEXT,
  mime TEXT,
  duration TEXT,
  createdAt TEXT
);
`);

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime = 'audio/webm', duration = null } = req.body;
    if (!userLink || !audioBase64) return res.status(400).json({ error: 'userLink and audioBase64 required' });

    const user = db.prepare('SELECT * FROM users WHERE userLink = ?').get(userLink);
    if (!user) return res.status(404).json({ error: 'user not found' });

    try {
      const buffer = Buffer.from(audioBase64, 'base64');
      const filename = `${Date.now()}-${nanoid(8)}.webm`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

      const id = nanoid(12);
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO messages (id, userId, filename, mime, duration, createdAt) VALUES (?,?,?,?,?,?)')
        .run(id, user.id, filename, mime, duration, createdAt);

      return res.json({ id, createdAt });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'failed to save message' });
    }
  }

  if (req.method === 'GET') {
    const { userLink, adminToken } = req.query;
    if (!userLink || !adminToken) return res.status(400).json({ error: 'userLink & adminToken required' });

    const user = db.prepare('SELECT * FROM users WHERE userLink = ?').get(userLink);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (adminToken !== user.adminToken) return res.status(403).json({ error: 'invalid token' });

    const rows = db.prepare('SELECT id, filename, mime, duration, createdAt FROM messages WHERE userId = ? ORDER BY createdAt DESC').all(user.id);
    const list = rows.map(r => ({
      id: r.id,
      duration: r.duration,
      createdAt: r.createdAt,
      url: `/api/uploads/${encodeURIComponent(r.filename)}`,
      mime: r.mime
    }));
    return res.json(list);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
