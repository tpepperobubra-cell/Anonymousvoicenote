import { useEffect, useState } from "react";

export default function Dashboard() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch("/api/messages")
      .then(res => res.json())
      .then(setMessages);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>My Vault Dashboard 📂</h2>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} style={{ border: "1px solid #ddd", margin: "10px", padding: "10px" }}>
            <audio controls src={`data:audio/webm;base64,${msg.content}`}></audio>
            <p><small>{new Date(msg.createdAt).toLocaleString()}</small></p>
          </div>
        ))
      )}
    </div>
  );
}
