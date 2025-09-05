import { createUser, getUserByLink } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username } = req.body || {};
    console.log('POST /api/users:', { username });

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'username required' });
    }

    // Create user
    const u = createUser(username.trim());

    // Normalize userLink to lowercase for consistency
    u.userLink = u.userLink.toLowerCase();

    console.log('User created:', u);
    return res.status(201).json(u);
  }

  if (req.method === 'GET') {
    let { link } = req.query;
    console.log('GET /api/users:', { link });

    if (!link) return res.status(400).json({ error: 'link required' });

    link = link.toLowerCase(); // normalize
    const u = getUserByLink(link);
    if (!u) {
      console.log('User not found for link:', link);
      return res.status(404).json({ error: 'not found' });
    }

    // Return public info only
    return res.status(200).json({ id: u.id, username: u.username, userLink: u.userLink, createdAt: u.createdAt });
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
