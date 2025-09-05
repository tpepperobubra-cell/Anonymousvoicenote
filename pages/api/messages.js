// POST /api/messages  { userLink, audioBase64, mime, duration }
// GET  /api/messages?userLink=...&adminToken=...  -> list messages (owner only)
import { addMessage, getUserByLink, listMessagesForUser } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime='audio/webm', duration=null } = req.body || {};
    if (!userLink || !audioBase64) return res.status(400).json({ error: 'userLink and audioBase64 required' });

    const user = getUserByLink(userLink);
    if (!user) return res.status(404).json({ error: 'recipient not found' });

    const m = addMessage({ userLink, audioBase64, mime, duration });
    return res.status(201).json({ id: m.id, createdAt: m.createdAt });
  }

  if (req.method === 'GET') {
    const { userLink, adminToken } = req.query;
    if (!userLink || !adminToken) return res.status(400).json({ error: 'userLink & adminToken required' });

    const user = getUserByLink(userLink);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.adminToken !== adminToken) return res.status(403).json({ error: 'invalid admin token' });

    const rows = listMessagesForUser(userLink).map(m => ({
      id: m.id,
      mime: m.mime,
      duration: m.duration,
      createdAt: m.createdAt,
      url: `/api/messages/${m.id}`
    }));
    return res.status(200).json(rows);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
