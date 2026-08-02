import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "./env";

const COOKIE = "bt_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(password: string): Promise<string> {
  return hmacHex(password, "banh-trang-tron-session");
}

export async function isAuthed(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const token = getCookie(c, COOKIE);
  if (!token || !c.env.APP_PASSWORD) return false;
  const expected = await createSessionToken(c.env.APP_PASSWORD);
  return token === expected;
}

export async function requireAuth(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  if (await isAuthed(c)) return null;
  return c.json({ error: "Unauthorized" }, 401);
}

export function setSessionCookie(c: Context<{ Bindings: Env }>, token: string) {
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(c: Context<{ Bindings: Env }>) {
  deleteCookie(c, COOKIE, { path: "/" });
}
