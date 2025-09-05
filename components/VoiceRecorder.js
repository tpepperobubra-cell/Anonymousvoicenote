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

  // Convert AudioBuffer to WAV
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
    writeUint32(0x20746d66); // "fmt "
    writeUint32(16);
    writeUint16(1);
    writeUint16(numOfChan);
    writeUint32(buffer.sampleRate);
    writeUint32(buffer.sampleRate * 2 * numOfChan);
    writeUint16(numOfChan * 2);
    writeUint16(16);
    writeUint32(0x61746164); // "data"
    writeUint32(length - offset - 4);

    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }
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
