// Streams a saved upload file: /api/uploads/<filename>
import fs from 'fs';
import path from 'path';
export default function handler(req, res) {
  const { file } = req.query;
  const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
  const filepath = path.join(UPLOAD_DIR, file);
  if (!fs.existsSync(filepath)) return res.status(404).end('not found');
  const stat = fs.statSync(filepath);
  res.setHeader('Content-Type', 'audio/webm');
  res.setHeader('Content-Length', stat.size);
  const stream = fs.createReadStream(filepath);
  stream.pipe(res);
}
