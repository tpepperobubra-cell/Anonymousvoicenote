import { useState, useRef } from "react";

export default function VoiceRecorder({ onSave }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      if (onSave) {
        onSave(audioBlob);
      }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div style={{ margin: "20px", padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>Anonymous Voice Recorder</h3>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          background: isRecording ? "red" : "green",
          color: "#fff",
          padding: "10px 20px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          marginBottom: "10px"
        }}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      {audioUrl && (
        <div>
          <audio controls src={audioUrl}></audio>
          <br />
          <a href={audioUrl} download="anonymous-voice-note.webm">
            Download Voice Note
          </a>
        </div>
      )}
    </div>
  );
}
