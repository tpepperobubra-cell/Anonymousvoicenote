import { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [recording, setRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendingProgress, setSendingProgress] = useState(0);
  const audioRef = useRef(null);

  // ---------------- Load user from localStorage ----------------
  useEffect(() => {
    const stored = localStorage.getItem('voiceVaultUser');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoadingUser(false);
  }, []);

  // ---------------- Fetch messages ----------------
  const fetchMessages = async (vaultUser) => {
    if (!vaultUser) return;
    try {
      const res = await fetch(
        `/api/messages?userLink=${vaultUser.userLink}&adminToken=${vaultUser.adminToken}`
      );
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (user) fetchMessages(user);
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

  // ---------------- Robotic voice conversion ----------------
  const makeRobotic = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const offlineCtx = new OfflineAudioContext(
      decoded.numberOfChannels,
      decoded.length,
      decoded.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;

    // ---------------- Robotic effect: pitch + tremolo ----------------
    const gainNode = offlineCtx.createGain();
    const oscillator = offlineCtx.createOscillator();
    oscillator.type = 'square'; // adds metallic/robotic texture
    oscillator.frequency.value = 30; // low frequency modulation
    oscillator.connect(gainNode.gain);

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start(0);
    oscillator.start(0);
    oscillator.stop(offlineCtx.length / offlineCtx.sampleRate);

    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to WAV
    const wavBuffer = audioBufferToWav(renderedBuffer);
    return new Blob([wavBuffer], { type: 'audio/webm' });
  };

  // ---------------- Helper: AudioBuffer -> WAV ----------------
  function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    let offset = 0;

    const writeString = (str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };

    writeString('RIFF');
    view.setUint32(offset, length - 8, true);
    offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numOfChan, true);
    offset += 2;
    view.setUint32(offset, buffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, buffer.sampleRate * 2 * numOfChan, true);
    offset += 4;
    view.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString('data');
    view.setUint32(offset, length - offset - 4, true);
    offset += 4;

    // Write PCM samples
    const interleaved = [];
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        let sample = buffer.getChannelData(channel)[i] * 32767;
        if (sample > 32767) sample = 32767;
        if (sample < -32768) sample = -32768;
        interleaved.push(sample);
      }
    }

    for (let i = 0; i < interleaved.length; i++) {
      view.setInt16(offset, interleaved[i], true);
      offset += 2;
    }

    return bufferArray;
  }

  // ---------------- Send voice ----------------
  const sendVoice = async () => {
    if (!audioChunks.length || !user) return;

    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const roboticBlob = await makeRobotic(blob);

    const arrayBuffer = await roboticBlob.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    setSendingProgress(0);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setSendingProgress((e.loaded / e.total) * 100);
      };

      xhr.onload = async () => {
        if (xhr.status === 201) {
          setAudioChunks([]);
          setSendingProgress(100);
          await fetchMessages(user);
        } else {
          console.error('Failed to send message:', xhr.responseText);
        }
      };

      xhr.onerror = () => console.error('Network error during sending');
      xhr.send(
        JSON.stringify({
          userLink: user.userLink, // anonymous
          audioBase64: base64Audio,
        })
      );
    } catch (err) {
      console.error('Error sending voice:', err);
    }
  };

  // ---------------- Create Vault ----------------
  const createVault = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'AnonymousUser' }),
      });
      if (!res.ok) throw new Error('Failed to create vault');

      const newUser = await res.json();
      localStorage.setItem('voiceVaultUser', JSON.stringify(newUser));
      setUser(newUser);

      await fetchMessages(newUser);
    } catch (err) {
      console.error('Error creating vault:', err);
      alert('Failed to create vault. Try again.');
    }
  };

  // ---------------- Render ----------------
  if (loadingUser)
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>
        Loading dashboard...
      </div>
    );

  if (!user)
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>
        No vault found.
        <br />
        <button
          onClick={createVault}
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
            {/* Anonymous label */}
            <span style={{ fontSize: 12, color: '#888' }}>Anonymous</span>
            
            {/* Audio player */}
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
