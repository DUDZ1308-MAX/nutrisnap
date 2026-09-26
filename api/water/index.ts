import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq, and } from "../lib.js";
import { waterLogsTable } from "../../lib/db/src/schema/index.js";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(waterLogsTable)
      .where(and(eq(waterLogsTable.userId, user.id), eq(waterLogsTable.date, date)));
    const totalMl = rows.reduce((sum, r) => sum + r.amountMl, 0);
    return res.status(200).json({ entries: rows, totalMl });
  }

  if (req.method === "POST") {
    const { date, amountMl } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });
    const id = `water-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(waterLogsTable).values({
      id,
      userId: user.id,
      date,
      amountMl: Number(amountMl) || 250,
    });
    return res.status(201).json({ id });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
