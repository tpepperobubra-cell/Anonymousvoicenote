import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime = 'audio/webm', duration = null } = req.body;
    if (!userLink || !audioBase64) return res.status(400).json({ error: 'missing data' });

    const { rows: userRows } = await sql`SELECT * FROM users WHERE user_link=${userLink}`;
    if (userRows.length === 0) return res.status(404).json({ error: 'user not found' });

    const userId = userRows[0].id;
    const { rows } = await sql`
      INSERT INTO messages (user_id, audio_base64, mime, duration)
      VALUES (${userId}, ${audioBase64}, ${mime}, ${duration})
      RETURNING id, created_at AS "createdAt"
    `;
    return res.json(rows[0]);
  }

  if (req.method === 'GET') {
    const { userLink, adminToken } = req.query;
    if (!userLink || !adminToken) return res.status(400).json({ error: 'missing params' });

    const { rows: userRows } = await sql`SELECT * FROM users WHERE user_link=${userLink}`;
    if (userRows.length === 0) return res.status(404).json({ error: 'user not found' });
    if (userRows[0].admin_token !== adminToken) return res.status(403).json({ error: 'invalid token' });

    const { rows } = await sql`
      SELECT id, mime, duration, created_at AS "createdAt", audio_base64 AS "audioBase64"
      FROM messages WHERE user_id=${userRows[0].id} ORDER BY created_at DESC
    `;
    return res.json(rows.map(r => ({
      ...r,
      url: `/api/messages/${r.id}`  // dynamic fetch endpoint
    })));
  }

  res.setHeader('Allow',['GET','POST']);
  res.status(405).end();
}
