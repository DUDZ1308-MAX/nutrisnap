import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, signToken, setAuthCookie, clearAuthCookie, eq, normalizeUnits } from "../_lib.js";
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
    const { age, height, weight, units } = req.body;
    const db = getDb();
    await db.update(usersTable).set({
      age: age != null ? Number(age) : null,
      height: height != null ? Number(height) : null,
      weight: weight != null ? Number(weight) : null,
      units: normalizeUnits(units),
    }).where(eq(usersTable.id, user.id));
    const updatedUser = { ...user, age: age != null ? Number(age) : null, height: height != null ? Number(height) : null, weight: weight != null ? Number(weight) : null, units: normalizeUnits(units) };
    const token = signToken(updatedUser);
    setAuthCookie(res, token);
    return res.status(200).json({ user: updatedUser });
  }

  if (req.method === "DELETE") {
    const user = requireAuth(req, res);
    if (!user) return;
    const db = getDb();
    // Every table that references users cascades on delete, so this one row
    // removes the account along with its meals, workouts, goals, photos,
    // saved meals, water logs and reset tokens.
    await db.delete(usersTable).where(eq(usersTable.id, user.id));
    clearAuthCookie(res);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
