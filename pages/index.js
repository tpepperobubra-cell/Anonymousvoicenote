import { useState } from "react";

export default function Home() {
  const [vault, setVault] = useState(null);

  const createVault = async () => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Anonymous" })
    });
    const data = await res.json();
    setVault(data);
  };

  return (
    <div style={{ padding: "20px" }}>
      {!vault ? (
        <div>
          <h2>Welcome to Anonymous Voice Notes 🔒</h2>
          <p>Create your own vault to receive anonymous voice notes.</p>
          <button onClick={createVault}>Create My Vault</button>
        </div>
      ) : (
        <div>
          <h3>Your Vault Created 🎉</h3>
          <p>Share this link with friends:</p>
          <code>{`${typeof window !== "undefined" ? window.location.origin : ""}/vault/${vault.id}`}</code>
        </div>
      )}
    </div>
  );
}
