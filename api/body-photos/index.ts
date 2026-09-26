import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib.js";
import { bodyPhotosTable } from "../../lib/db/src/schema/index.js";
import { and } from "drizzle-orm";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const rows = await db.select().from(bodyPhotosTable)
      .where(eq(bodyPhotosTable.userId, user.id));
    const photos = rows.map((p) => ({
      ...p,
      imageDataUrl: p.imageDataUrl ?? undefined,
      notes: p.notes ?? undefined,
      weight: p.weight ?? undefined,
    }));
    return res.status(200).json({ photos });
  }

  if (req.method === "POST") {
    const { date, weight, imageDataUrl, notes } = req.body;
    if (!date || !imageDataUrl) {
      return res.status(400).json({ error: "date and imageDataUrl are required" });
    }
    const id = `photo-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(bodyPhotosTable).values({
      id, userId: user.id, date,
      weight: weight ? Number(weight) : null,
      imageDataUrl: imageDataUrl || null,
      notes: notes || null,
    });
    return res.status(201).json({ id });
  }

  if (req.method === "DELETE") {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: "id is required" });
    await db.delete(bodyPhotosTable).where(and(eq(bodyPhotosTable.id, id), eq(bodyPhotosTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
