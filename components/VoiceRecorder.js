import React, { useRef, useState } from 'react';

// helper: base64 from blob
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

// very simple anonymization: offline pitch shift by changing playbackRate, render to WAV
async function applyAnonymization(blob, pitch=0.85) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const offline = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(decoded.numberOfChannels, decoded.length, decoded.sampleRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.playbackRate.value = pitch;
    const gain = offline.createGain();
    src.connect(gain);
    gain.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    // convert to WAV
    const wav = audioBufferToWav(rendered);
    return new Blob([wav], { type: 'audio/wav' });
  } catch (err) {
    console.warn('anonymize failed', err);
    return blob;
  }
}

function audioBufferToWav(buffer) {
  // from earlier function — convert AudioBuffer to WAV ArrayBuffer
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  let offset = 0;

  function setUint16(data) { view.setUint16(offset, data, true); offset += 2; }
  function setUint32(data) { view.setUint32(offset, data, true); offset += 4; }

  // RIFF identifier
  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16); // size
  setUint16(1);  // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - offset - 4);

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
  return bufferArray;
}

export default function VoiceRecorder({ onSent, apiBase }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const recorderRef = useRef(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.start();
      recorderRef.current = { mr, stream, chunks };
      setIsRecording(true);
    } catch (err) {
      alert('Could not start recording: ' + err.message);
    }
  }

  async function stopRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.mr.stop();
    await new Promise(r => rec.mr.onstop = r);
    const blob = new Blob(rec.chunks, { type: 'audio/webm' });
    // stop tracks
    rec.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);

    // anonymize
    setIsAnonymizing(true);
    const anon = await applyAnonymization(blob, 0.85);
    setIsAnonymizing(false);

    // convert to base64 and send
    const base64 = await blobToBase64(anon);
    if (onSent) await onSent(base64);
  }

  return (
    <div className="glass">
      <h3>Record anonymous voice note</h3>
      <div className="row">
        {!isRecording ? (
          <button className="btn btn-primary" onClick={startRecording}>🎤 Start Recording</button>
        ) : (
          <button className="btn btn-ghost" onClick={stopRecording}>⏹ Stop & Send</button>
        )}
        {isAnonymizing && <div className="small">Anonymizing...</div>}
      </div>
      <div className="small" style={{marginTop:8}}>Your recording will be anonymized (pitch shift + render)</div>
    </div>
  );
}
