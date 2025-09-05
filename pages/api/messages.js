// In-memory store for messages
let messages = [];

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(messages);
  }

  if (req.method === 'POST') {
    const { content, userId } = req.body;

    if (!content || !userId) {
      return res.status(400).json({ error: 'Content and userId are required' });
    }

    const message = {
      id: Date.now().toString(),
      content,
      userId,
      createdAt: new Date().toISOString()
    };

    messages.push(message);
    return res.status(201).json(message);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
