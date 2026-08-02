import { createClient, type Client } from "@libsql/client/web";
import type { Env } from "./env";

let ready = false;

export function getDb(env: Env): Client {
  return createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

export async function ensureSchema(db: Client): Promise<void> {
  if (ready) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      items_json TEXT NOT NULL,
      total INTEGER NOT NULL,
      note TEXT,
      customer TEXT,
      phone TEXT,
      delivery_slot TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )
  `);
  // Existing DBs: add columns if missing
  for (const col of [
    "phone TEXT",
    "delivery_slot TEXT",
    "status TEXT NOT NULL DEFAULT 'pending'",
  ]) {
    try {
      await db.execute(`ALTER TABLE orders ADD COLUMN ${col}`);
    } catch {
      // column already exists
    }
  }
  await db.execute(
    `UPDATE orders SET status = 'pending' WHERE status IS NULL OR status = ''`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
  );
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      cost INTEGER NOT NULL DEFAULT 0,
      image TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);
  ready = true;
}

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
};

export type DeliverySlot = "trua" | "chieu";

export type OrderRow = {
  id: string;
  items_json: string;
  total: number;
  note: string | null;
  customer: string | null;
  phone: string | null;
  delivery_slot: string | null;
  status: string | null;
  created_at: number;
};

export type OrderStatus = "pending" | "done";

export const VN_TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRangeKey = "today" | "yesterday" | "7d" | "30d";

/** Calendar day start (00:00) in Vietnam as unix ms. Instant itself is timezone-agnostic. */
export function dayStartVn(now = Date.now()): number {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD in VN
  // Fixed UTC+7, no DST
  return Date.parse(`${day}T00:00:00+07:00`);
}

/** Start/end of "today" in Asia/Ho_Chi_Minh as unix ms [start, end) */
export function todayRangeVn(now = Date.now()): { start: number; end: number } {
  const start = dayStartVn(now);
  return { start, end: start + DAY_MS };
}

/** Inclusive calendar-day ranges in Asia/Ho_Chi_Minh → half-open [start, end) unix ms */
export function rangeVn(
  key: DateRangeKey,
  now = Date.now(),
): { start: number; end: number } {
  const todayStart = dayStartVn(now);
  const tomorrow = todayStart + DAY_MS;
  switch (key) {
    case "yesterday":
      return { start: todayStart - DAY_MS, end: todayStart };
    case "7d":
      return { start: todayStart - 6 * DAY_MS, end: tomorrow };
    case "30d":
      return { start: todayStart - 29 * DAY_MS, end: tomorrow };
    case "today":
    default:
      return { start: todayStart, end: tomorrow };
  }
}

export function parseDateRangeKey(raw: string | undefined | null): DateRangeKey {
  if (raw === "yesterday" || raw === "7d" || raw === "30d" || raw === "today") {
    return raw;
  }
  return "today";
}

/** Wall-clock "now" as unix ms — same everywhere; pair with VN_TZ when formatting. */
export function nowMs(): number {
  return Date.now();
}
