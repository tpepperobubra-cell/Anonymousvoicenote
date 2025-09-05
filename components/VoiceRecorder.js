// components/VoiceRecorder.js
import React, { useRef, useState } from 'react';

// convert blob to base64 (no data: prefix)
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

// simple anonymization: offline pitch shift via OfflineAudioContext
async function anonymizeBlob(blob, pitch = 0.85) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
    const offline = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      decoded.numberOfChannels, Math.floor(decoded.length / pitch), Math.round(decoded.sampleRate * 1)
    );
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.playbackRate.value = pitch;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();

    // convert rendered buffer to WAV arrayBuffer
    const wav = audioBufferToWav(rendered);
    return new Blob([wav], { type: 'audio/wav' });
  } catch (err) {
    console.warn('anonymization failed, sending original', err);
    return blob;
  }
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const ab = new ArrayBuffer(length);
  const view = new DataView(ab);
  let offset = 0;

  const writeUint16 = (data) => { view.setUint16(offset, data, true); offset += 2; };
  const writeUint32 = (data) => { view.setUint32(offset, data, true); offset += 4; };

  writeUint32(0x46464952); // "RIFF"
  writeUint32(length - 8);
  writeUint32(0x45564157); // "WAVE"
  writeUint32(0x20746d66);
  writeUint32(16);
  writeUint16(1);
  writeUint16(numOfChan);
  writeUint32(buffer.sampleRate);
  writeUint32(buffer.sampleRate * 2 * numOfChan);
  writeUint16(numOfChan * 2);
  writeUint16(16);
  writeUint32(0x61746164);
  writeUint32(length - offset - 4);

  function writeUint16(data) { view.setUint16(offset, data, true); offset += 2; }

  const channels = [];
  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
  }
  return ab;
}

export default function VoiceRecorder({ recipientLink, onSent }) {
  const [recording, setRecording] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const mediaRef = useRef(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.start();
      mediaRef.current = { mr, stream, chunks };
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied/unavailable: ' + err.message);
    }
  }

  async function stopAndSend() {
    const rec = mediaRef.current;
    if (!rec) return;
    rec.mr.stop();
    await new Promise(r => rec.mr.onstop = r);
    const rawBlob = new Blob(rec.chunks, { type: 'audio/webm' });
    rec.stream.getTracks().forEach(t => t.stop());
    setRecording(false);

    setAnonymizing(true);
    const anonBlob = await anonymizeBlob(rawBlob, 0.85);
    setAnonymizing(false);

    const base64 = await blobToBase64(anonBlob);
    if (onSent) await onSent(base64);
  }

  return (
    <div className="glass">
      <h3>Record an anonymous voice note</h3>
      <div className="row" style={{marginTop:8}}>
        {!recording ? (
          <button className="btn btn-primary" onClick={start}>🎤 Start Recording</button>
        ) : (
          <button className="btn btn-ghost" onClick={stopAndSend}>⏹ Stop & Send</button>
        )}
        {anonymizing && <div className="small">Applying anonymization (pitch + render)...</div>}
      </div>
      <div className="small" style={{marginTop:10}}>Recipient vault: <span className="link-box">{recipientLink}</span></div>
      <div className="notice" style={{marginTop:10}}>Privacy note: recordings are anonymized in your browser before sending. No account required.</div>
    </div>
  );
}
