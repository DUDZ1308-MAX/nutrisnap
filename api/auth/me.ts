import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  return res.status(200).json({ user });
}
