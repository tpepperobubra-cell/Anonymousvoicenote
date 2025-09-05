import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime = 'audio/webm', duration = null } = req.body;
    if (!userLink || !audioBase64) return res.status(400).json({ error: 'missing data' });

    const userQ = await sql`SELECT id FROM users WHERE user_link = ${userLink}`;
    if (userQ.rows.length === 0) return res.status(404).json({ error: 'user not found' });
    const userId = userQ.rows[0].id;

    const insert = await sql`
      INSERT INTO messages (user_id, audio_base64, mime, duration)
      VALUES (${userId}, ${audioBase64}, ${mime}, ${duration})
      RETURNING id, created_at AS "createdAt"
    `;
    return res.json(insert.rows[0]);
  }

  if (req.method === 'GET') {
    const { userLink, adminToken } = req.query;
    if (!userLink || !adminToken) return res.status(400).json({ error: 'missing params' });

    const userQ = await sql`SELECT id, admin_token::text AS admin_token FROM users WHERE user_link = ${userLink}`;
    if (userQ.rows.length === 0) return res.status(404).json({ error: 'user not found' });
    if (userQ.rows[0].admin_token !== adminToken) return res.status(403).json({ error: 'invalid token' });

    const rows = await sql`
      SELECT id, mime, duration, created_at AS "createdAt"
      FROM messages WHERE user_id = ${userQ.rows[0].id}
      ORDER BY created_at DESC
    `;
    const list = rows.rows.map(r => ({
      id: r.id,
      mime: r.mime,
      duration: r.duration,
      createdAt: r.createdAt,
      url: `/api/messages/${r.id}`
    }));
    return res.json(list);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
