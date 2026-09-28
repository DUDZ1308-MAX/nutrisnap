import type { VercelRequest, VercelResponse } from "@vercel/node";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.js";
import { eq, and, isNull, gt } from "drizzle-orm";
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
  age: number | null;
  height: number | null;
  weight: number | null;
  units: "kg" | "lb";
}

export function normalizeUnits(value: unknown): "kg" | "lb" {
  return value === "lb" ? "lb" : "kg";
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, username: user.username, age: user.age, height: user.height, weight: user.weight, units: user.units }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; username: string; age: number | null; height: number | null; weight: number | null; units?: string };
    return { id: payload.sub, email: payload.email, username: payload.username, age: payload.age ?? null, height: payload.height ?? null, weight: payload.weight ?? null, units: normalizeUnits(payload.units) };
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

/**
 * Password reset helpers.
 *
 * The raw token is only ever emailed to the account owner; the database stores
 * a SHA-256 hash of it, so a leaked table cannot be used to reset any account.
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No provider configured. The link is written to the function log only and is
    // never returned to the caller, so this cannot be used to hijack an account.
    console.log(`[password-reset] RESEND_API_KEY not set. Reset link for ${to}: ${resetUrl}`);
    return;
  }

  const from = process.env.RESEND_FROM || "NutriSnap <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your NutriSnap password",
      text: [
        "We received a request to reset your NutriSnap password.",
        "",
        `Open this link to choose a new password (valid for 1 hour):`,
        resetUrl,
        "",
        "If you did not request this, you can ignore this email — your password will not change.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(`Reset email delivery failed with status ${response.status}`);
  }
}

export { getDb, bcrypt, eq, and, isNull, gt, sendPasswordResetEmail };
