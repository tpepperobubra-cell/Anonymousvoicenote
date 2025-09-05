import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [vault, setVault] = useState(null);

  const createVault = async () => {
    if (!username.trim()) return alert("Please enter a username");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();

    if (data.adminToken) {
      localStorage.setItem(`adminToken-${data.userLink}`, data.adminToken);
      setVault(data);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>🎙️ Anonymous Voice Notes</h1>

        {!vault ? (
          <>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
            />
            <button onClick={createVault} className="button">
              Create Vault
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "green", fontWeight: "600" }}>
              ✅ Vault created!
            </p>

            <div className="link-box">
              <strong>🔗 Share this link:</strong>
              <br />
              <a href={`/user/${vault.userLink}`}>
                {typeof window !== "undefined" &&
                  `${window.location.origin}/user/${vault.userLink}`}
              </a>
            </div>

            <div className="link-box">
              <strong>📂 Manage your vault:</strong>
              <br />
              <a href={`/dashboard/${vault.userLink}`}>
                {typeof window !== "undefined" &&
                  `${window.location.origin}/dashboard/${vault.userLink}`}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
