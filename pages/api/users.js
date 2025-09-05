// In-memory store for users
let users = [];

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    return res.status(201).json(user);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
