import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const { userId } = router.query;

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);

  useEffect(() => {
    fetch('/api/messages')
      .then((res) => res.json())
      .then(setMessages);
  }, []);

  const handleSendMessage = async () => {
    if (!content) return alert('Enter a message');
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, userId })
    });
    const message = await res.json();
    setMessages([message, ...messages]);
    setContent('');
  };

  // 🔴 Start screen recording
  const startRecording = async (textToRead) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setChunks([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Download the screen recording automatically
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voicevault-share.webm';
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      setRecording(true);

      // Read the note aloud while recording
      if (textToRead) {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        speechSynthesis.speak(utterance);
      }

      // Stop after 10 seconds
      setTimeout(() => {
        recorder.stop();
        setRecording(false);
      }, 10000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Screen recording failed.');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📋 Dashboard</h1>

      <textarea
        placeholder="Type your anonymous voice note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={styles.textarea}
      />
      <button onClick={handleSendMessage} style={styles.button}>
        Share Note
      </button>

      <h2 style={{ marginTop: '2rem' }}>All Messages</h2>
      <ul>
        {messages.map((m) => (
          <li key={m.id} style={styles.messageItem}>
            <strong>{m.content}</strong> <br />
            <small>Posted {new Date(m.createdAt).toLocaleString()}</small>
            <br />
            <button
              onClick={() => startRecording(m.content)}
              style={styles.shareButton}
              disabled={recording}
            >
              {recording ? 'Recording...' : '📹 Share Voice Note'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: '2rem' },
  title: { fontSize: '2rem', marginBottom: '1rem' },
  textarea: { width: '100%', height: '100px', marginBottom: '1rem' },
  button: { padding: '0.5rem 1rem', background: 'black', color: 'white', border: 'none' },
  messageItem: { marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '6px' },
  shareButton: { marginTop: '0.5rem', padding: '0.4rem 0.8rem', background: 'blue', color: 'white', border: 'none' }
};
