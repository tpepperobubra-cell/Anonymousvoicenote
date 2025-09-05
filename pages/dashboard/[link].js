import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import MessageList from "../../components/MessageList";

export default function DashboardPage() {
  const router = useRouter();
  const { link } = router.query;
  const [messages, setMessages] = useState([]);

  const fetchMessages = async () => {
    if (!link) return;
    const adminToken =
      typeof window !== "undefined"
        ? localStorage.getItem(`adminToken-${link}`)
        : null;

    if (!adminToken) {
      alert("⚠️ No admin token found for this vault.");
      return;
    }

    const res = await fetch(
      `/api/messages?userLink=${link}&adminToken=${adminToken}`
    );
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
  }, [link]);

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">📂 Vault Dashboard</h1>
      {messages.length > 0 ? (
        <MessageList
          messages={messages}
          onDelete={fetchMessages}
          userLink={link}
        />
      ) : (
        <p className="text-gray-600">No messages yet...</p>
      )}
    </div>
  );
}
