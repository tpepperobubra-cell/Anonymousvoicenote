import { getUserById } from "../../../lib/store";

export default function handler(req, res) {
  const { id } = req.query;
  const user = getUserById(id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json(user);
}
