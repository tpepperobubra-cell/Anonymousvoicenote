    
/**
 * messages.ts – Backend + Frontend Integration for VoiceVault
 * Features:
 * 1. Record voice in browser
 * 2. Convert to robotic voice on server
 * 3. Send via POST with progress bar
 * 4. Dashboard fetches messages anonymously
 */

import { addMessage, getUserByLink, listMessagesForUser } from '../../lib/store';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Define types for request bodies
interface PostRequestBody {
  userLink: string;
  audioBase64: string;
  mime?: string;
  duration?: number | null;
}

interface GetQueryParams {
  userLink: string;
  adminToken: string;
}

// Main API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ---------------------- POST: Add message ----------------------
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime = 'audio/webm', duration = null } =
      req.body as PostRequestBody;

    if (!userLink || !audioBase64)
      return res
        .status(400)
        .json({ error: 'userLink and audioBase64 required' });

    const user = await getUserByLink(userLink);
    if (!user)
      return res.status(404).json({ error: 'recipient not found' });

    // Convert audio to robotic
    const roboticBase64 = makeRobotic(audioBase64);

    // Store message
    const message = addMessage({
      userLink: user.userLink,
      audioBase64: roboticBase64,
      mime,
      duration,
    });

    return res.status(201).json({ id: message.id, createdAt: message.createdAt });
  }

  // ---------------------- GET: List messages ----------------------
  if (req.method === 'GET') {
    const { userLink, adminToken } = req.query as unknown as GetQueryParams;

    if (!userLink || !adminToken)
      return res
        .status(400)
        .json({ error: 'userLink & adminToken required' });

    const user = await getUserByLink(userLink);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.adminToken !== adminToken)
      return res.status(403).json({ error: 'invalid admin token' });

    const rows = listMessagesForUser(userLink).map((m) => ({
      id: m.id,
      mime: m.mime,
      duration: m.duration,
      createdAt: m.createdAt,
      url: `/api/messages/${m.id}`,
      user: 'Anonymous', // hide username
    }));

    return res.status(200).json(rows);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end();
}

// ---------------------- Helper: Robotic Audio ----------------------
function makeRobotic(base64Audio: string): string {
  const inputPath = path.join(process.cwd(), 'tmp_input.webm');
  const outputPath = path.join(process.cwd(), 'tmp_robotic.webm');

  fs.writeFileSync(inputPath, Buffer.from(base64Audio, 'base64'));

  execSync(
    `ffmpeg -y -i ${inputPath} -af "asetrate=44100*1.3,aresample=44100,atempo=1.0" ${outputPath}`
  );

  const roboticBuffer = fs.readFileSync(outputPath);

  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  return roboticBuffer.toString('base64');
}
