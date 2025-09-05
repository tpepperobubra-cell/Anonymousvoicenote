// In-memory store for messages
let messages = [];

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const message = messages.find((m) => m.id === id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    return res.status(200).json(message);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
