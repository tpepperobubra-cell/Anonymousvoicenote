import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [vault, setVault] = useState(null);

  const createVault = async () => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();

    if (data.adminToken) {
      // Save the admin token locally
      localStorage.setItem(`adminToken-${data.userLink}`, data.adminToken);
      setVault(data);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">🎙️ Anonymous Voice Notes</h1>

      {!vault ? (
        <div className="w-full max-w-md space-y-4">
          <input
            type="text"
            placeholder="Enter a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded p-2"
          />
          <button
            onClick={createVault}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Create Vault
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <p className="text-green-600 font-semibold">✅ Vault created!</p>
          <p>
            Share this link for others to send you notes:
            <br />
            <a
              href={`/user/${vault.userLink}`}
              className="text-blue-500 underline break-all"
            >
              {typeof window !== "undefined" &&
                `${window.location.origin}/user/${vault.userLink}`}
            </a>
          </p>
          <p>
            Manage your vault here:
            <br />
            <a
              href={`/dashboard/${vault.userLink}`}
              className="text-purple-500 underline break-all"
            >
              {typeof window !== "undefined" &&
                `${window.location.origin}/dashboard/${vault.userLink}`}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
