import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, bcrypt, eq, and, isNull, gt, hashResetToken, clearAuthCookie } from "../lib.js";
import { usersTable, passwordResetTokensTable } from "../../lib/db/src/schema/index.js";

const INVALID_LINK = "This reset link is invalid or has expired.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (token.length < 32) {
    return res.status(400).json({ error: INVALID_LINK });
  }
  if (password.length < 8 || password.length > 100) {
    return res.status(400).json({ error: "Password must be between 8 and 100 characters" });
  }

  const db = getDb();
  const now = new Date();

  const matches = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, hashResetToken(token)),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (matches.length === 0) {
    return res.status(400).json({ error: INVALID_LINK });
  }

  const record = matches[0];

  await db
    .update(usersTable)
    .set({ passwordHash: await bcrypt.hash(password, 12) })
    .where(eq(usersTable.id, record.userId));

  // Burn the token and drop any other outstanding links for this account.
  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, record.userId));

  // The password changed, so drop this browser's session cookie.
  clearAuthCookie(res);

  return res.status(200).json({ ok: true });
}
