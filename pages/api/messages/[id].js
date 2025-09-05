// DELETE -> delete message by id with ?adminToken=<token>
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'data.db');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const db = new Database(DB_PATH);

export default function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'DELETE') {
    const { adminToken } = req.query;
    if (!adminToken) return res.status(400).json({ error: 'adminToken required' });

    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'message not found' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.userId);
    if (!user || user.adminToken !== adminToken) return res.status(403).json({ error: 'invalid token' });

    const filepath = path.join(UPLOAD_DIR, row.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    return res.json({ ok: true });
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end();
}
