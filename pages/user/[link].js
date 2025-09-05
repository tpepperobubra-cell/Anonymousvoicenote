import { useRouter } from "next/router";
import Recorder from "../../components/Recorder";
import { useState } from "react";

export default function UserPage() {
  const router = useRouter();
  const { link } = router.query;
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Send an Anonymous Voice Note</h1>
      {!sent ? (
        <Recorder userLink={link} onSent={() => setSent(true)} />
      ) : (
        <p className="text-green-600">✅ Your note has been sent!</p>
      )}
    </div>
  );
}
