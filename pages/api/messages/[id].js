import { getMessageById, deleteMessageById, getUserByLink } from '../../../lib/store';

export default function handler(req, res) {
  const { id } = req.query;
  console.log('Message handler called with id:', id);

  if (!id) return res.status(400).json({ error: 'id required' });

  if (req.method === 'GET') {
    const m = getMessageById(id);
    if (!m) {
      console.log('Message not found for id:', id);
      return res.status(404).json({ error: 'not found' });
    }

    const buffer = Buffer.from(m.audioBase64, 'base64');
    res.setHeader('Content-Type', m.mime || 'audio/webm');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  }

  if (req.method === 'DELETE') {
    const { adminToken } = req.query;
    if (!adminToken) return res.status(400).json({ error: 'adminToken required' });

    const m = getMessageById(id);
    if (!m) {
      console.log('Message not found for delete id:', id);
      return res.status(404).json({ error: 'not found' });
    }

    const user = getUserByLink(m.userLink.toLowerCase());
    if (!user || user.adminToken !== adminToken) {
      return res.status(403).json({ error: 'invalid admin token' });
    }

    const ok = deleteMessageById(id);
    if (!ok) return res.status(500).json({ error: 'failed to delete' });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET','DELETE']);
  res.status(405).end();
}
