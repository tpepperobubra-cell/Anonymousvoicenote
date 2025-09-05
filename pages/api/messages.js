import { addMessage, getUserByLink, listMessagesForUser } from '../../lib/store';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Helper: Convert Base64 to robotic audio
function makeRobotic(base64Audio) {
  const inputPath = path.join(process.cwd(), 'tmp_input.webm');
  const outputPath = path.join(process.cwd(), 'tmp_robotic.webm');

  fs.writeFileSync(inputPath, Buffer.from(base64Audio, 'base64'));

  // Apply robotic effect with ffmpeg
  execSync(`ffmpeg -y -i ${inputPath} -af "asetrate=44100*1.3,aresample=44100,atempo=1.0" ${outputPath}`);

  const roboticBuffer = fs.readFileSync(outputPath);

  // Clean up temp files
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  return roboticBuffer.toString('base64');
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime='audio/webm', duration=null } = req.body || {};
    if (!userLink || !audioBase64) return res.status(400).json({ error: 'userLink and audioBase64 required' });

    const user = getUserByLink(userLink);
    if (!user) return res.status(404).json({ error: 'recipient not found' });

    // Convert audio to robotic
    const roboticBase64 = makeRobotic(audioBase64);

    const message = addMessage({
      userLink: user.userLink,
      audioBase64: roboticBase64,
      mime,
      duration
    });

    return res.status(201).json({ id: message.id, createdAt: message.createdAt });
  }

  if (req.method === 'GET') {
    let { userLink, adminToken } = req.query;
    if (!userLink || !adminToken) return res.status(400).json({ error: 'userLink & adminToken required' });

    const user = getUserByLink(userLink);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.adminToken !== adminToken) return res.status(403).json({ error: 'invalid admin token' });

    const rows = listMessagesForUser(userLink).map(m => ({
      id: m.id,
      mime: m.mime,
      duration: m.duration,
      createdAt: m.createdAt,
      url: `/api/messages/${m.id}`,
      user: 'Anonymous'  // keep messages anonymous
    }));

    return res.status(200).json(rows);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
