import { useEffect, useState } from "react";

export default function Dashboard() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch("/api/messages")
      .then(res => res.json())
      .then(setMessages);
  }, []);

  return (
    <div className="container">
      <h2>My Vault Dashboard 📂</h2>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className="card">
              <audio controls src={msg.content}></audio>
              <p className="timestamp">{new Date(msg.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
