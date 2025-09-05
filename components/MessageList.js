export default function MessageList({ messages, onDelete, userLink }) {
  const handleDelete = async (id) => {
    const adminToken = localStorage.getItem(`adminToken-${userLink}`);
    await fetch(`/api/messages/${id}?adminToken=${adminToken}`, {
      method: "DELETE",
    });
    onDelete();
  };

  const handleShare = async (id) => {
    try {
      // Select audio element
      const audio = document.getElementById(`audio-${id}`);
      if (!audio) return;

      // Ask for screen + audio recording permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        // Create a download link
        const a = document.createElement("a");
        a.href = url;
        a.download = `voice-note-${id}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();

      // Play the audio while recording
      audio.play();

      // Stop recording after audio finishes
      audio.onended = () => {
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (err) {
      alert("⚠️ Screen/audio recording failed: " + err.message);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-md">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="border rounded p-3 flex flex-col gap-2"
        >
          <audio id={`audio-${msg.id}`} controls src={`/api/messages/${msg.id}`} />
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(msg.id)}
              className="bg-red-500 text-white px-2 py-1 rounded text-sm"
            >
              Delete
            </button>
            <button
              onClick={() => handleShare(msg.id)}
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
            >
              Share Recording
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
