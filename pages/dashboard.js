import { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendingProgress, setSendingProgress] = useState(0);
  const audioRef = useRef(null);

  // ---------------- Load user from localStorage ----------------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('voiceVaultUser'));
    if (stored) setUser(stored);
  }, []);

  // ---------------- Fetch messages ----------------
  const fetchMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `/api/messages?userLink=${user.userLink}&adminToken=${user.adminToken}`
      );
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  // ---------------- Recording ----------------
  const startRecording = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => setAudioChunks(chunks);
    recorder.start();
  };

  const stopRecording = () => {
    setRecording(false);
    mediaRecorder.stop();
  };

  // ---------------- Send voice ----------------
  const sendVoice = async () => {
    if (!audioChunks.length || !user) return;

    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const arrayBuffer = await blob.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    setSendingProgress(0);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');

      // Track upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setSendingProgress((e.loaded / e.total) * 100);
      };

      xhr.onload = async () => {
        if (xhr.status === 201) {
          setAudioChunks([]);
          setSendingProgress(100);
          await fetchMessages();
        } else {
          console.error('Failed to send message:', xhr.responseText);
        }
      };

      xhr.onerror = () => console.error('Network error during sending');
      xhr.send(
        JSON.stringify({
          userLink: user.userLink,
          audioBase64: base64Audio,
        })
      );
    } catch (err) {
      console.error('Error sending voice:', err);
    }
  };

  // ---------------- Render ----------------

  // If no user vault, show Create Vault button
  if (!user)
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: '#555',
        }}
      >
        No vault found.
        <br />
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'AnonymousUser' }),
              });
              const newUser = await res.json();
              localStorage.setItem(
                'voiceVaultUser',
                JSON.stringify(newUser)
              );
              setUser(newUser);
            } catch (err) {
              console.error('Error creating vault:', err);
            }
          }}
          style={{
            marginTop: 10,
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Create Vault
        </button>
      </div>
    );

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 600,
        margin: '0 auto',
        backgroundColor: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        borderRadius: 8,
      }}
    >
      <h1 style={{ textAlign: 'center', fontSize: 24, marginBottom: 20 }}>
        VoiceVault Dashboard
      </h1>

      {/* Recording Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            color: '#fff',
            backgroundColor: recording ? '#e74c3c' : '#2ecc71',
            cursor: 'pointer',
          }}
        >
          {recording ? 'Stop' : 'Record'}
        </button>

        {audioChunks.length > 0 && (
          <button
            onClick={sendVoice}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              color: '#fff',
              backgroundColor: '#3498db',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        )}
      </div>

      {/* Sending Progress Bar */}
      {sendingProgress > 0 && sendingProgress < 100 && (
        <div
          style={{
            width: '100%',
            height: 8,
            backgroundColor: '#ddd',
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: `${sendingProgress}%`,
              height: '100%',
              backgroundColor: '#3498db',
              borderRadius: 4,
            }}
          ></div>
        </div>
      )}

      {/* Conversation Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              padding: 10,
              backgroundColor: '#f7f7f7',
              borderRadius: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: '#888' }}>{m.user}</span>
            <audio
              ref={audioRef}
              controls
              src={m.url}
              style={{
                width: '100%',
                borderRadius: 4,
                border: '1px solid #ccc',
              }}
            ></audio>
          </div>
        ))}
      </div>
    </div>
  );
}
