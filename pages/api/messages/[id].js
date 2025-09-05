import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const msg = await sql`SELECT audio_base64, mime FROM messages WHERE id = ${id}`;
    if (msg.rows.length === 0) return res.status(404).json({ error: 'not found' });

    const row = msg.rows[0];
    const buf = Buffer.from(row.audio_base64, 'base64');
    res.setHeader('Content-Type', row.mime || 'audio/webm');
    res.send(buf);
    return;
  }

  if (req.method === 'DELETE') {
    const { adminToken } = req.query;
    if (!adminToken) return res.status(400).json({ error: 'adminToken required' });

    const msg = await sql`SELECT * FROM messages WHERE id = ${id}`;
    if (msg.rows.length === 0) return res.status(404).json({ error: 'not found' });

    const user = await sql`SELECT admin_token::text AS admin_token FROM users WHERE id = ${msg.rows[0].user_id}`;
    if (user.rows.length === 0) return res.status(404).json({ error: 'user not found' });
    if (user.rows[0].admin_token !== adminToken) return res.status(403).json({ error: 'invalid token' });

    await sql`DELETE FROM messages WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow', ['GET','DELETE']);
  res.status(405).end();
}
