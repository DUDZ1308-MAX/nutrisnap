import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq, and } from "../lib.js";
import { savedMealsTable } from "../../lib/db/src/schema/index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();
  const id = req.query.id as string;

  if (req.method === "DELETE") {
    await db.delete(savedMealsTable).where(and(eq(savedMealsTable.id, id), eq(savedMealsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
