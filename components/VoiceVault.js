import { useState, useEffect, useRef } from 'react';

export default function VoiceVault({ userLink, adminToken }) {
  const [recording, setRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendingProgress, setSendingProgress] = useState(0);
  const audioRef = useRef(null);

  // ---------------- Fetch messages ----------------
  const fetchMessages = async () => {
    if (!userLink || !adminToken) return;
    try {
      const res = await fetch(`/api/messages?userLink=${userLink}&adminToken=${adminToken}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // ---------------- Recording ----------------
  const startRecording = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);

    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => setAudioChunks(chunks);
    recorder.start();
  };

  const stopRecording = () => {
    setRecording(false);
    mediaRecorder.stop();
  };

  // ---------------- Send voice ----------------
  const sendVoice = async () => {
    if (!audioChunks.length) return;

    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const arrayBuffer = await blob.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    setSendingProgress(0);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');

      // Track upload progress
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          setSendingProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 201) {
          setAudioChunks([]);
          setSendingProgress(100);
          await fetchMessages(); // refresh conversation feed
        } else {
          console.error('Failed to send message:', xhr.responseText);
        }
      };

      xhr.onerror = () => console.error('Network error during sending');
      xhr.send(JSON.stringify({ userLink, audioBase64 }));
    } catch (err) {
      console.error('Error sending voice:', err);
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="p-4 max-w-md mx-auto bg-white shadow rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Voice Conversation</h2>

      {/* Recording Controls */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded ${recording ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
        >
          {recording ? 'Stop' : 'Record'}
        </button>
        {audioChunks.length > 0 && (
          <button onClick={sendVoice} className="px-4 py-2 rounded bg-blue-500 text-white">
            Send
          </button>
        )}
      </div>

      {/* Sending Progress Bar */}
      {sendingProgress > 0 && sendingProgress < 100 && (
        <div className="w-full bg-gray-200 h-2 rounded mb-4">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${sendingProgress}%` }}
          ></div>
        </div>
      )}

      {/* Conversation / Messages */}
      <div className="space-y-4">
        {messages.map(m => (
          <div key={m.id} className="p-2 bg-gray-50 rounded shadow-sm flex items-center gap-2">
            <span className="text-xs text-gray-400">{m.user}</span>
            <audio
              ref={audioRef}
              controls
              src={m.url}
              className="w-full rounded border border-gray-300"
            ></audio>
          </div>
        ))}
      </div>
    </div>
  );
}
