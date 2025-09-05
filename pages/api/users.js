import { createUser, getUserByLink } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username } = req.body || {};
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'username required' });
    }
    const user = createUser(username);
    return res.status(201).json(user);
  }

  if (req.method === 'GET') {
    let { link } = req.query;
    if (!link) return res.status(400).json({ error: 'link required' });
    const user = getUserByLink(link);
    if (!user) return res.status(404).json({ error: 'not found' });
    return res.status(200).json({
      id: user.id,
      username: user.username,
      userLink: user.userLink,
      createdAt: user.createdAt
    });
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
