import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, signToken, setAuthCookie, eq } from "../lib.js";
import { usersTable } from "../../lib/db/src/schema/index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const user = requireAuth(req, res);
    if (!user) return;
    return res.status(200).json({ user });
  }

  if (req.method === "PUT") {
    const user = requireAuth(req, res);
    if (!user) return;
    const { age, height, weight } = req.body;
    const db = getDb();
    await db.update(usersTable).set({
      age: age != null ? Number(age) : null,
      height: height != null ? Number(height) : null,
      weight: weight != null ? Number(weight) : null,
    }).where(eq(usersTable.id, user.id));
    const updatedUser = { ...user, age: age != null ? Number(age) : null, height: height != null ? Number(height) : null, weight: weight != null ? Number(weight) : null };
    const token = signToken(updatedUser);
    setAuthCookie(res, token);
    return res.status(200).json({ user: updatedUser });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
