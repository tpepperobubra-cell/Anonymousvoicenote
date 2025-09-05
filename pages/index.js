import React, { useState, useRef } from 'react';

export default function VoiceRecorder({ recipientLink, onSent }) {
  const [recording, setRecording] = useState(false);
  const [base64, setBase64] = useState('');
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];
      const base64Data = await blobToBase64(blob);
      setBase64(base64Data);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const blobToBase64 = blob =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const sendRecording = async () => {
    if (!base64) return alert('No recording to send!');

    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/messages', true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status === 201) {
        setBase64('');
        setProgress(100);
        if (onSent) onSent(base64); // call parent sendHandler
      } else {
        alert('Failed to send message!');
      }
      setTimeout(() => setProgress(0), 1000);
    };

    xhr.send(JSON.stringify({
      userLink: recipientLink,
      audioBase64: base64,
      mime: 'audio/webm'
    }));
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {!recording ? (
          <button className="btn btn-primary" onClick={startRecording}>Record</button>
        ) : (
          <button className="btn btn-warning" onClick={stopRecording}>Stop</button>
        )}
        <button className="btn btn-success" onClick={sendRecording} disabled={!base64}>Send</button>
      </div>
      {progress > 0 && <progress value={progress} max="100" style={{ width: '100%' }} />}
    </div>
  );
}
