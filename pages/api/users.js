import { getUsers, addUser } from "../../lib/store";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(getUsers());
  }

  if (req.method === "POST") {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const user = addUser(name);
    return res.status(201).json(user);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
