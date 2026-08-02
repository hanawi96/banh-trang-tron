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
  // One round-trip batch for cold isolate — avoid N sequential Turso calls
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        items_json TEXT NOT NULL,
        total INTEGER NOT NULL,
        note TEXT,
        customer TEXT,
        phone TEXT,
        delivery_slot TEXT,
        delivery_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        cost INTEGER NOT NULL DEFAULT 0,
        price_large INTEGER NOT NULL DEFAULT 0,
        cost_large INTEGER NOT NULL DEFAULT 0,
        image TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date)`,
    ],
    "write",
  );
  for (const col of [
    "phone TEXT",
    "delivery_slot TEXT",
    "delivery_date TEXT",
    "status TEXT NOT NULL DEFAULT 'pending'",
  ]) {
    try {
      await db.execute(`ALTER TABLE orders ADD COLUMN ${col}`);
    } catch {
      // column already exists
    }
  }
  ready = true;
}

export type OrderSize = "nho" | "to";

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  size?: OrderSize;
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
  delivery_date: string | null;
  status: string | null;
  created_at: number;
};

const VN_WEEKDAY_LABEL = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
] as const;

/** YYYY-MM-DD in Asia/Ho_Chi_Minh */
export function vnYmd(now = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

/** 0=Sun … 6=Sat in Vietnam wall clock */
export function vnWeekday(now = Date.now()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    weekday: "short",
  }).format(new Date(now));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

/** Hour 0–23 in Vietnam */
export function vnHour(now = Date.now()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(new Date(now))
    .find((p) => p.type === "hour")?.value;
  return Number(h) || 0;
}

export function addDaysYmd(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T12:00:00+07:00`) + days * DAY_MS;
  return vnYmd(t);
}

export function weekdayLabelVn(ymd: string): string {
  const t = Date.parse(`${ymd}T12:00:00+07:00`);
  return VN_WEEKDAY_LABEL[vnWeekday(t)] || ymd;
}

/** Hôm nay / Ngày mai / Thứ … */
export function deliveryOptionLabel(ymd: string, now = Date.now()): string {
  const today = vnYmd(now);
  if (ymd === today) return "Hôm nay";
  if (ymd === addDaysYmd(today, 1)) return "Ngày mai";
  return weekdayLabelVn(ymd);
}

export type DeliveryDateOption = { ymd: string; label: string };

/**
 * Mon–Sat: today → Sunday this week.
 * Sunday before 17:00: Hôm nay + next Mon–Sun.
 * Sunday from 17:00: next Mon–Sun only (no hôm nay).
 */
export function deliveryDateOptions(now = Date.now()): DeliveryDateOption[] {
  const today = vnYmd(now);
  const wd = vnWeekday(now);
  const hour = vnHour(now);
  const opts: DeliveryDateOption[] = [];

  if (wd === 0) {
    // Sunday
    if (hour < 17) {
      opts.push({ ymd: today, label: deliveryOptionLabel(today, now) });
    }
    for (let i = 1; i <= 7; i++) {
      const ymd = addDaysYmd(today, i);
      opts.push({ ymd, label: deliveryOptionLabel(ymd, now) });
    }
    return opts;
  }

  const daysUntilSunday = 7 - wd;
  for (let i = 0; i <= daysUntilSunday; i++) {
    const ymd = addDaysYmd(today, i);
    opts.push({
      ymd,
      label: deliveryOptionLabel(ymd, now),
    });
  }
  return opts;
}

/**
 * Before 17:00 → today (first option).
 * From 17:00 → tomorrow if listed; on Sunday evening opts[0] is already Monday.
 */
export function defaultDeliveryYmd(now = Date.now()): string {
  const opts = deliveryDateOptions(now);
  if (!opts.length) return vnYmd(now);
  if (vnHour(now) < 17) return opts[0].ymd;
  const today = vnYmd(now);
  if (opts[0].ymd === today && opts[1]) return opts[1].ymd;
  return opts[0].ymd;
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDeliveryDate(
  raw: string | null | undefined,
  now = Date.now(),
  allowExtra?: string | null,
): string | null {
  const ymd = String(raw || "").trim();
  if (!YMD_RE.test(ymd)) return null;
  const allowed = new Set(deliveryDateOptions(now).map((o) => o.ymd));
  if (allowExtra && YMD_RE.test(allowExtra)) allowed.add(allowExtra);
  return allowed.has(ymd) ? ymd : null;
}

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

/** Digits-only phone for matching (VN numbers). */
export function normalizePhone(phone: string | null | undefined): string {
  return String(phone || "").replace(/\D/g, "");
}

/**
 * Customer identity for order-count: prefer phone (≥8 digits), else name.
 * Empty string = cannot attribute.
 */
export function customerIdentityKey(
  customer: string | null | undefined,
  phone: string | null | undefined,
): string {
  const p = normalizePhone(phone);
  if (p.length >= 8) return `p:${p}`;
  const n = String(customer || "").trim().toLowerCase();
  return n ? `n:${n}` : "";
}
