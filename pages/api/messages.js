import { addMessage, getUserByLink, listMessagesForUser } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime='audio/webm', duration=null } = req.body || {};
    console.log('POST /api/messages:', { userLink, audioBase64Exists: !!audioBase64 });

    if (!userLink || !audioBase64) {
      return res.status(400).json({ error: 'userLink and audioBase64 required' });
    }

    // Normalize userLink to lowercase to avoid mismatch
    const user = getUserByLink(userLink.toLowerCase());
    if (!user) {
      console.log('Recipient not found for:', userLink);
      return res.status(404).json({ error: 'recipient not found' });
    }

    const m = addMessage({ userLink: user.userLink, audioBase64, mime, duration });
    return res.status(201).json({ id: m.id, createdAt: m.createdAt });
  }

  if (req.method === 'GET') {
    let { userLink, adminToken } = req.query;
    console.log('GET /api/messages:', { userLink, adminToken });

    if (!userLink || !adminToken) {
      return res.status(400).json({ error: 'userLink & adminToken required' });
    }

    userLink = userLink.toLowerCase(); // normalize
    const user = getUserByLink(userLink);
    if (!user) {
      console.log('User not found for:', userLink);
      return res.status(404).json({ error: 'user not found' });
    }
    if (user.adminToken !== adminToken) {
      return res.status(403).json({ error: 'invalid admin token' });
    }

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
