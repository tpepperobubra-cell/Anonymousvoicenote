require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const multer = require('multer');
const { nanoid } = require('nanoid');
const Database = require('better-sqlite3');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
const port = process.env.PORT || 4000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use(helmet());
app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: '12mb' }));

// rate limiting
const rateLimiter = new RateLimiterMemory({ points: 30, duration: 1 });
app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many requests' }));
});

// DB
const dbFile = path.join(DATA_DIR, 'voicevault.db');
const db = new Database(dbFile);
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT,
  userLink TEXT UNIQUE,
  adminToken TEXT,
  createdAt TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  userId TEXT,
  filename TEXT,
  mime TEXT,
  duration TEXT,
  createdAt TEXT,
  FOREIGN KEY(userId) REFERENCES users(id)
);
`);

// SQL statements
const createUserStmt = db.prepare('INSERT INTO users (id, username, userLink, adminToken, createdAt) VALUES (?, ?, ?, ?, ?)');
const getUserByLinkStmt = db.prepare('SELECT id, username, userLink, createdAt FROM users WHERE userLink = ?');
const getUserFullByLinkStmt = db.prepare('SELECT * FROM users WHERE userLink = ?');
const insertMessageStmt = db.prepare('INSERT INTO messages (id, userId, filename, mime, duration, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
const getMessagesByUserStmt = db.prepare('SELECT id, filename, mime, duration, createdAt FROM messages WHERE userId = ? ORDER BY createdAt DESC');
const getMessageByIdStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
const deleteMessageStmt = db.prepare('DELETE FROM messages WHERE id = ?');

// file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${nanoid(8)}-${file.originalname}`)
});
const upload = multer({ storage });

// routes
app.post('/api/users', (req, res) => {
  const username = (req.body.username || '').trim();
  if (!username) return res.status(400).json({ error: 'username required' });
  const userLink = `anonymous-${nanoid(8)}`;
  const id = nanoid(12);
  const adminToken = nanoid(32);
  const createdAt = new Date().toISOString();
  try {
    createUserStmt.run(id, username, userLink, adminToken, createdAt);
    res.json({ id, username, userLink, adminToken, createdAt });
  } catch {
    res.status(500).json({ error: 'failed to create user' });
  }
});

app.get('/api/users/:userLink', (req, res) => {
  const u = getUserByLinkStmt.get(req.params.userLink);
  if (!u) return res.status(404).json({ error: 'user not found' });
  res.json(u);
});

app.post('/api/messages/:userLink', (req, res) => {
  const user = getUserFullByLinkStmt.get(req.params.userLink);
  if (!user) return res.status(404).json({ error: 'recipient not found' });

  const { audioBase64, mime = 'audio/webm', duration } = req.body;
  if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' });

  const buffer = Buffer.from(audioBase64, 'base64');
  const filename = `${Date.now()}-${nanoid(8)}.webm`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  const id = nanoid(12);
  const createdAt = new Date().toISOString();
  insertMessageStmt.run(id, user.id, filename, mime, duration, createdAt);

  res.json({ id, createdAt });
});

app.post('/api/messages/:userLink/upload', upload.single('audio'), (req, res) => {
  const user = getUserFullByLinkStmt.get(req.params.userLink);
  if (!user) return res.status(404).json({ error: 'recipient not found' });
  if (!req.file) return res.status(400).json({ error: 'file required' });

  const id = nanoid(12);
  const createdAt = new Date().toISOString();
  insertMessageStmt.run(id, user.id, req.file.filename, req.file.mimetype, req.body.duration || null, createdAt);
  res.json({ id, createdAt });
});

app.get('/api/messages/:userLink', (req, res) => {
  const user = getUserFullByLinkStmt.get(req.params.userLink);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (req.query.adminToken !== user.adminToken) return res.status(403).json({ error: 'invalid admin token' });

  const rows = getMessagesByUserStmt.all(user.id).map(r => ({
    id: r.id,
    duration: r.duration,
    createdAt: r.createdAt,
    url: `${req.protocol}://${req.get('host')}/uploads/${r.filename}`,
    mime: r.mime
  }));
  res.json(rows);
});

app.delete('/api/messages/:id', (req, res) => {
  const row = getMessageByIdStmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'message not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.userId);
  if (req.query.adminToken !== user.adminToken) return res.status(403).json({ error: 'invalid admin token' });

  fs.unlinkSync(path.join(UPLOADS_DIR, row.filename));
  deleteMessageStmt.run(row.id);
  res.json({ ok: true });
});

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }));
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
