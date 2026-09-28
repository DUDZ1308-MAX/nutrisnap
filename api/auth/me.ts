import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, signToken, setAuthCookie, eq, normalizeUnits } from "../_lib.js";
import { usersTable } from "../../lib/db/src/schema/index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const user = requireAuth(req, res);
    if (!user) return;

    // Read the consent receipt separately from the JWT payload so it can change
    // without forcing a re-login. This is on the auth path, so a failure here
    // must never block the session from loading; reporting "no consent" simply
    // re-shows the disclosure.
    let photoAnalysisConsentAt: Date | null = null;
    try {
      const rows = await getDb()
        .select({ photoAnalysisConsentAt: usersTable.photoAnalysisConsentAt })
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .limit(1);
      photoAnalysisConsentAt = rows[0]?.photoAnalysisConsentAt ?? null;
    } catch (error) {
      console.error("Could not read photo analysis consent:", error);
    }

    return res.status(200).json({ user, photoAnalysisConsentAt });
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

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
