import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, bcrypt, signToken, setAuthCookie, requireAuth } from "../lib";
import { usersTable, goalsTable } from "../../lib/db/src/schema";
import { eq } from "drizzle-orm";
import { registerSchema } from "../../lib/db/src/schema/users";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const user = requireAuth(req, res);
    if (!user) return;
    return res.status(200).json({ user });
  }

  if (req.method === "POST") {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { email, username, password } = parsed.data;
    const db = getDb();

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = `user-${crypto.randomUUID().slice(0, 12)}`;

    await db.insert(usersTable).values({ id, email, username, passwordHash });

    // Create default goals for new user
    await db.insert(goalsTable).values({
      id: `goals-${crypto.randomUUID().slice(0, 12)}`,
      userId: id,
      calories: 2100,
      protein: 120,
      carbs: 230,
      fat: 70,
    });

    const token = signToken({ id, email, username });
    setAuthCookie(res, token);

    return res.status(201).json({ user: { id, email, username } });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
