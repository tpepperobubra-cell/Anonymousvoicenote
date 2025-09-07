import { useRouter } from "next/router";
import { useState } from "react";
import VoiceRecorder from "../../components/VoiceRecorder";

export default function VaultPage() {
  const router = useRouter();
  const { id } = router.query;
  const [status, setStatus] = useState("");

  const handleSave = async (audioBlob) => {
    const base64 = await blobToBase64(audioBlob);

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: base64, userId: id })
    });

    if (res.ok) {
      setStatus("✅ Voice note sent anonymously!");
    } else {
      setStatus("❌ Error sending note.");
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Screen recording share
  const shareNote = async () => {
    const audio = document.querySelector("audio");
    if (!audio) return alert("Play a voice note first!");

    const stream = audio.captureStream();
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const file = new File([blob], "voice-note.webm", { type: "video/webm" });

      if (navigator.share) {
        await navigator.share({
          title: "Anonymous Voice Note",
          files: [file]
        });
      } else {
        alert("Sharing not supported in this browser.");
      }
    };

    recorder.start();
    audio.play();
    setTimeout(() => recorder.stop(), audio.duration * 1000);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Send an Anonymous Voice Note 🎤</h2>
      <VoiceRecorder onSave={handleSave} />
      <p>{status}</p>
      <button onClick={shareNote}>📤 Share Played Note</button>
    </div>
  );
}
