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
      // Save the admin token locally
      localStorage.setItem(`adminToken-${data.userLink}`, data.adminToken);
      setVault(data);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">
          🎙️ Anonymous Voice Notes
        </h1>

        {!vault ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={createVault}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              Create Vault
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-green-600 font-semibold text-lg">
              ✅ Vault created!
            </p>

            <div className="bg-gray-100 p-3 rounded-lg text-sm break-words">
              <p className="font-medium">🔗 Share this link:</p>
              <a
                href={`/user/${vault.userLink}`}
                className="text-blue-600 underline"
              >
                {typeof window !== "undefined" &&
                  `${window.location.origin}/user/${vault.userLink}`}
              </a>
            </div>

            <div className="bg-gray-100 p-3 rounded-lg text-sm break-words">
              <p className="font-medium">📂 Manage your vault:</p>
              <a
                href={`/dashboard/${vault.userLink}`}
                className="text-purple-600 underline"
              >
                {typeof window !== "undefined" &&
                  `${window.location.origin}/dashboard/${vault.userLink}`}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
