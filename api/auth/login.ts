import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, bcrypt, signToken, setAuthCookie } from "../lib.js";
import { usersTable } from "../../lib/db/src/schema/index.js";
import { eq } from "drizzle-orm";
import { loginSchema } from "../../lib/db/src/schema/users.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (users.length === 0) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = users[0];
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const profile = { id: user.id, email: user.email, username: user.username, age: user.age ?? null, height: user.height ?? null, weight: user.weight ?? null };
  const token = signToken(profile);
  setAuthCookie(res, token);

  return res.status(200).json({ user: profile });
}
