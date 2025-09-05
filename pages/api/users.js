import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: 'username required' });

      const userLink = `anonymous-${nanoid(8)}`;

      const user = await prisma.user.create({
        data: {
          username,
          userLink,
        },
      });

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to create vault' });
    }
  } else if (req.method === 'GET') {
    const { link } = req.query;
    const user = await prisma.user.findUnique({ where: { userLink: link } });
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end();
  }
}
