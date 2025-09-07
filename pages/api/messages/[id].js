import { getMessageById } from "../../../lib/store";

export default function handler(req, res) {
  const { id } = req.query;
  const msg = getMessageById(id);

  if (!msg) {
    return res.status(404).json({ error: "Message not found" });
  }

  return res.status(200).json(msg);
}
