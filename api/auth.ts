import type { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "nutrisnap-dev-secret-change-in-production";

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

export function setAuthCookie(res: ServerResponse, token: string) {
  const cookie = `ns_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res: ServerResponse) {
  res.setHeader("Set-Cookie", "ns_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}

export function getUserFromRequest(req: IncomingMessage): AuthUser | null {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parse(cookieHeader);
  const token = cookies.ns_token;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: IncomingMessage, res: ServerResponse): AuthUser | null {
  const user = getUserFromRequest(req);
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not authenticated" }));
    return null;
  }
  return user;
}

export function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
