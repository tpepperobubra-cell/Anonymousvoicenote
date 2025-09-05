// components/MessageList.js
import React, { useRef, useState } from 'react';

// Capture playing audio from an HTMLAudioElement
async function capturePlayingAudio(audioEl, limitMs = 20000) {
  let stream = null;
  if (audioEl.captureStream) {
    stream = audioEl.captureStream();
  } else {
    // fallback: getDisplayMedia with audio (user chooses tab/window)
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
    } catch (err) {
      throw new Error('No capture method available: ' + err.message);
    }
  }

  const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const chunks = [];
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.start();

  await Promise.race([
    new Promise(r => audioEl.addEventListener('ended', r, { once: true })),
    new Promise(r => setTimeout(r, limitMs))
  ]);

  mr.stop();
  await new Promise(r => mr.onstop = r);

  // cleanup
  try { stream.getTracks().forEach(t => t.stop()); } catch(e) {}
  return new Blob(chunks, { type: 'audio/webm' });
}

export default function MessageList({ messages = [], onDelete, adminToken }) {
  const audioRefs = useRef({});
  const [loadingId, setLoadingId] = useState(null);

  async function handleShare(msg) {
    const el = audioRefs.current[msg.id];
    if (!el) return alert('Audio not ready');
    setLoadingId(msg.id);
    try {
      if (el.paused) await el.play();
      const blob = await capturePlayingAudio(el, 20000);
      const file = new File([blob], 'voicevault.webm', { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Anonymous Voice Note', text: 'Shared from VoiceVault' });
      } else {
        // fallback download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'voicevault.webm';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Could not capture audio: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {messages.length === 0 && <div className="small">No messages yet.</div>}
      {messages.map(m => (
        <div key={m.id} className="message glass">
          <div className="row" style={{justifyContent:'space-between'}}>
            <div>
              <div style={{fontWeight:700}}>Anonymous</div>
              <div className="small">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
            <div className="controls">
              <button className="btn btn-ghost" onClick={() => onDelete && onDelete(m.id)}>🗑 Delete</button>
              <button className="btn btn-primary" onClick={() => handleShare(m)} disabled={loadingId === m.id}>
                {loadingId === m.id ? 'Recording…' : 'Share'}
              </button>
            </div>
          </div>

          <audio
            ref={el => audioRefs.current[m.id] = el}
            controls
            src={m.url}
            style={{marginTop:12, width:'100%'}}
          />
        </div>
      ))}
    </div>
  );
}
