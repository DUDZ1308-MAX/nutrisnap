import type { VercelRequest, VercelResponse } from "@vercel/node";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { parse, serialize } from "cookie";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const JWT_SECRET = process.env.JWT_SECRET || "nutrisnap-dev-secret-change-in-production";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(pool, { schema });
  return _db;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; username: string };
    return { id: payload.sub, email: payload.email, username: payload.username };
  } catch {
    return null;
  }
}

export function setAuthCookie(res: VercelResponse, token: string) {
  res.setHeader("Set-Cookie", serialize("ns_token", token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  }));
}

export function clearAuthCookie(res: VercelResponse) {
  res.setHeader("Set-Cookie", serialize("ns_token", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  }));
}

export function getUserFromRequest(req: VercelRequest): AuthUser | null {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parse(cookieHeader);
  const token = cookies.ns_token;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: VercelRequest, res: VercelResponse): AuthUser | null {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return user;
}

export { getDb, bcrypt, eq };
