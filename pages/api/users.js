// POST /api/users => create a vault
// GET  /api/users?link=anonymous-... => fetch user info (public)
import { createUser, getUserByLink } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username } = req.body || {};
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'username required' });
    }
    const u = createUser(username.trim());
    // Return adminToken so owner can manage (store locally)
    return res.status(201).json(u);
  }

  if (req.method === 'GET') {
    const { link } = req.query;
    if (!link) return res.status(400).json({ error: 'link required' });
    const u = getUserByLink(link);
    if (!u) return res.status(404).json({ error: 'not found' });
    // Return public info only
    return res.status(200).json({ id: u.id, username: u.username, userLink: u.userLink, createdAt: u.createdAt });
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
