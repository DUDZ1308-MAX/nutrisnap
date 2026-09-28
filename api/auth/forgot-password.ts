import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, eq, generateResetToken, hashResetToken, sendPasswordResetEmail, RESET_TOKEN_TTL_MS } from "../lib.js";
import { usersTable, passwordResetTokensTable } from "../../lib/db/src/schema/index.js";
import crypto from "crypto";

const GENERIC_MESSAGE = "If an account exists for that email, a reset link is on its way.";

// Best-effort throttle. Serverless instances are not shared, so this only limits
// bursts against a single warm instance; it is a layer of defence, not the primary control.
const attempts = new Map<string, { count: number; windowStart: number }>();
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isThrottled(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.windowStart >= THROTTLE_WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const key = `${email}:${req.headers["x-forwarded-for"] ?? "unknown"}`;

  if (email.length === 0 || !email.includes("@") || isThrottled(key)) {
    // Same response as the success path so the endpoint cannot be used to probe
    // which addresses have accounts.
    return res.status(200).json({ ok: true, message: GENERIC_MESSAGE });
  }

  try {
    const db = getDb();
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (users.length > 0) {
      const user = users[0];
      const token = generateResetToken();

      // Only one active link per account: requesting a new one invalidates the old.
      await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, user.id));

      await db.insert(passwordResetTokensTable).values({
        id: `prt-${crypto.randomUUID().slice(0, 12)}`,
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });

      const origin = process.env.PASSWORD_RESET_ORIGIN || `https://${req.headers.host ?? ""}`;
      await sendPasswordResetEmail(user.email, `${origin}/reset-password?token=${token}`);
    }
  } catch (error) {
    // Never surface delivery failures to the caller; the response stays identical.
    console.error("Password reset request failed:", error);
  }

  return res.status(200).json({ ok: true, message: GENERIC_MESSAGE });
}
