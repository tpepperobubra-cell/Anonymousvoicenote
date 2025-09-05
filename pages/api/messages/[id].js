import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await sql`SELECT audio_base64, mime FROM messages WHERE id=${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });

    const buffer = Buffer.from(rows[0].audio_base64, 'base64');
    res.setHeader('Content-Type', rows[0].mime);
    res.send(buffer);
    return;
  }

  if (req.method === 'DELETE') {
    const { adminToken } = req.query;
    if (!adminToken) return res.status(400).json({ error: 'adminToken required' });

    const { rows: msgRows } = await sql`SELECT * FROM messages WHERE id=${id}`;
    if (msgRows.length === 0) return res.status(404).json({ error: 'not found' });

    const { rows: userRows } = await sql`SELECT * FROM users WHERE id=${msgRows[0].user_id}`;
    if (userRows[0].admin_token !== adminToken) return res.status(403).json({ error: 'invalid token' });

    await sql`DELETE FROM messages WHERE id=${id}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow',['GET','DELETE']);
  res.status(405).end();
}
