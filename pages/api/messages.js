/**
 * Messages.js – Backend + Frontend Integration for VoiceVault
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

export default function handler(req, res) {
  // ---------------------- POST: Add message ----------------------
  if (req.method === 'POST') {
    const { userLink, audioBase64, mime='audio/webm', duration=null } = req.body || {};
    if (!userLink || !audioBase64) return res.status(400).json({ error: 'userLink and audioBase64 required' });

    const user = getUserByLink(userLink);
    if (!user) return res.status(404).json({ error: 'recipient not found' });

    // Convert audio to robotic
    const roboticBase64 = makeRobotic(audioBase64);

    // Store message
    const message = addMessage({ userLink: user.userLink, audioBase64: roboticBase64, mime, duration });

    return res.status(201).json({ id: message.id, createdAt: message.createdAt });
  }

  // ---------------------- GET: List messages ----------------------
  if (req.method === 'GET') {
    const { userLink, adminToken } = req.query;
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
      user: 'Anonymous' // hide username
    }));

    return res.status(200).json(rows);
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}

// ---------------------- Helper: Robotic Audio ----------------------
function makeRobotic(base64Audio: string) {
  const inputPath = path.join(process.cwd(), 'tmp_input.webm');
  const outputPath = path.join(process.cwd(), 'tmp_robotic.webm');

  fs.writeFileSync(inputPath, Buffer.from(base64Audio, 'base64'));

  execSync(`ffmpeg -y -i ${inputPath} -af "asetrate=44100*1.3,aresample=44100,atempo=1.0" ${outputPath}`);

  const roboticBuffer = fs.readFileSync(outputPath);

  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  return roboticBuffer.toString('base64');
}

/* ---------------------- FRONTEND Snippet ----------------------
Place this in your page/component where you want to record/send:

<div id="voice-recorder">
  <button id="recordBtn">Start Recording</button>
  <button id="stopBtn" disabled>Stop</button>
  <button id="sendBtn" disabled>Send</button>
  <progress id="uploadProgress" value="0" max="100" style="width:100%; display:none;"></progress>
</div>

<div id="dashboard">
  <h3>Messages</h3>
  <ul id="messageList"></ul>
</div>

<script>
let mediaRecorder;
let audioChunks = [];
let recordedBase64 = '';
let user = null; // { userLink, adminToken }

async function initRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];
    recordedBase64 = await blobToBase64(blob);
    document.getElementById('sendBtn').disabled = false;
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Buttons
document.getElementById('recordBtn').onclick = () => {
  mediaRecorder.start();
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('recordBtn').disabled = true;
};
document.getElementById('stopBtn').onclick = () => {
  mediaRecorder.stop();
  document.getElementById('stopBtn').disabled = true;
  document.getElementById('recordBtn').disabled = false;
};
document.getElementById('sendBtn').onclick = async () => {
  if (!recordedBase64 || !user) return alert('No recording or user info!');

  const progressBar = document.getElementById('uploadProgress');
  progressBar.style.display = 'block';
  progressBar.value = 0;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/messages', true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) progressBar.value = (e.loaded / e.total) * 100;
  };

  xhr.onload = () => {
    if (xhr.status === 201) {
      progressBar.value = 100;
      recordedBase64 = '';
      document.getElementById('sendBtn').disabled = true;
      fetchMessages();
    } else {
      alert('Failed to send message!');
    }
    setTimeout(() => (progressBar.style.display = 'none'), 1000);
  };

  xhr.send(JSON.stringify({
    userLink: user.userLink,
    audioBase64: recordedBase64,
    mime: 'audio/webm'
  }));
};

async function fetchMessages() {
  if (!user) return;
  const res = await fetch(`/api/messages?userLink=${user.userLink}&adminToken=${user.adminToken}`);
  const messages = await res.json();
  const list = document.getElementById('messageList');
  list.innerHTML = '';
  messages.forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = `<p>${m.user} - ${new Date(m.createdAt).toLocaleTimeString()}</p>
                    <audio controls src="${m.url}"></audio>`;
    list.appendChild(li);
  });
}

// Init
async function init() {
  await initRecorder();
  // user = { userLink: "...", adminToken: "..." };
  fetchMessages();
}
init();
</script>
