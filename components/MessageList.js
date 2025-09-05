import React, { useState, useRef } from 'react';

// Share helper: record a playing audio element
async function recordPlayingAudio(audioEl, durationLimit = 15000) {
  // Try element.captureStream()
  let stream = null;
  if (audioEl.captureStream) {
    stream = audioEl.captureStream();
  } else {
    // fallback: ask for display + audio (may require user approval & system support)
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: false, audio: true });
    } catch (err) {
      throw new Error('No suitable capture method available');
    }
  }

  // record for at most durationLimit ms or until playback ends
  const mediaRec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const chunks = [];
  mediaRec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mediaRec.start();

  // stop when audio ends or after durationLimit
  const stopPromise = new Promise((resolve) => {
    const onEnded = () => {
      resolve();
    };
    audioEl.addEventListener('ended', onEnded, { once: true });
    setTimeout(() => resolve(), durationLimit);
  });

  await stopPromise;
  mediaRec.stop();
  // wait for stop event
  await new Promise(r => mediaRec.onstop = r);

  // if we used captureStream from audio element, no need to stop tracks necessarily but cleanup:
  try { stream.getTracks().forEach(t => t.stop()); } catch(e){}

  return new Blob(chunks, { type: 'audio/webm' });
}

export default function MessageList({ messages = [], onDelete, adminToken, apiBase }) {
  const [loadingId, setLoadingId] = useState(null);
  const audioRefs = useRef({});

  async function handleShare(msg) {
    const audioEl = audioRefs.current[msg.id];
    if (!audioEl) return alert('Audio element not ready');

    setLoadingId(msg.id);
    try {
      // play audio if not already playing
      if (audioEl.paused) {
        await audioEl.play();
      }
      const blob = await recordPlayingAudio(audioEl, 20000); // record up to 20s
      // offer download
      const url = URL.createObjectURL(blob);
      // If Web Share available AND shares files, use it
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'voicevault.webm', { type: blob.type })] })) {
        try {
          await navigator.share({
            files: [new File([blob], 'voicevault.webm', { type: blob.type })],
            title: 'Anonymous voice note',
            text: 'Shared from VoiceVault'
          });
          setLoadingId(null);
          return;
        } catch (err) {
          // if user cancelled share, proceed to present download
        }
      }
      // fallback: open download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voicevault.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not capture audio: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {messages.length === 0 && <div className="small">No messages yet</div>}
      {messages.map(m => (
        <div key={m.id} className="message glass">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>Anonymous</div>
              <div className="small">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btn btn-ghost" onClick={() => {
                if (onDelete) onDelete(m.id);
              }}>🗑 Delete</button>
              <button className="btn btn-primary" onClick={() => handleShare(m)} disabled={loadingId===m.id}>
                {loadingId===m.id ? 'Recording…' : 'Share'}
              </button>
            </div>
          </div>

          <audio
            ref={(el) => audioRefs.current[m.id] = el}
            controls
            src={m.url}
            style={{ marginTop: 12, width: '100%' }}
          />
        </div>
      ))}
    </div>
  );
}
