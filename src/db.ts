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

/** Start/end of "today" in Asia/Ho_Chi_Minh as unix ms */
export function todayRangeVn(now = Date.now()): { start: number; end: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = fmt.format(now); // YYYY-MM-DD
  // VN is UTC+7, no DST
  const start = Date.parse(`${day}T00:00:00+07:00`);
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}
