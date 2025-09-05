import { sql } from '@vercel/postgres';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    const userLink = `anonymous-${nanoid(8)}`;
    const { rows } = await sql`
      INSERT INTO users (username, user_link)
      VALUES (${username}, ${userLink})
      RETURNING id, username, user_link AS "userLink", admin_token AS "adminToken", created_at AS "createdAt"
    `;
    return res.json(rows[0]);
  }

  if (req.method === 'GET') {
    const { link } = req.query;
    if (!link) return res.status(400).json({ error: 'link required' });
    const { rows } = await sql`
      SELECT id, username, user_link AS "userLink", created_at AS "createdAt"
      FROM users WHERE user_link = ${link}
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    return res.json(rows[0]);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
