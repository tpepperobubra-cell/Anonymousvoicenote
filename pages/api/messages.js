import { getMessages, addMessage, getUserById } from "../../lib/store";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(getMessages());
  }

  if (req.method === "POST") {
    const { content, userId } = req.body;
    if (!content || !userId) {
      return res.status(400).json({ error: "Content and userId are required" });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "Recipient not found. Create a vault first." });
    }

    const msg = addMessage(content, userId);
    return res.status(201).json(msg);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
