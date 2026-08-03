import type { Client } from "@libsql/client/web";

export type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  price_large: number;
  cost_large: number;
  image: string;
  sort_order: number;
  /** Tổng số phần đã đặt (mọi đơn) — không phụ thuộc đã giao */
  sold_count: number;
  updated_at: number;
};

/** Cộng qty theo product id từ dòng món */
export function qtyByProductId(
  items: { id?: string; qty?: number }[] | null | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!Array.isArray(items)) return map;
  for (const item of items) {
    const id = String(item?.id || "").slice(0, 64);
    const qty = Math.floor(Number(item?.qty)) || 0;
    if (!id || qty < 1) continue;
    map.set(id, (map.get(id) || 0) + qty);
  }
  return map;
}

/** Áp delta sold_count (có thể âm). Không cho xuống dưới 0. */
export async function applySoldDeltas(
  db: Client,
  deltas: Map<string, number>,
): Promise<void> {
  if (!deltas.size) return;
  await ensureProducts(db);
  for (const [id, delta] of deltas) {
    const n = Math.trunc(Number(delta)) || 0;
    if (!id || !n) continue;
    await db.execute({
      sql: `UPDATE products
            SET sold_count = MAX(0, COALESCE(sold_count, 0) + ?)
            WHERE id = ?`,
      args: [n, id],
    });
  }
}

const SEED: Omit<Product, "updated_at" | "sold_count">[] = [
  {
    id: "bt-tron",
    name: "Bánh tráng cuộn",
    price: 25000,
    cost: 12000,
    price_large: 30000,
    cost_large: 15000,
    image: "bt-tron.webp",
    sort_order: 1,
  },
  {
    id: "bt-bo",
    name: "Bánh tráng bò khô",
    price: 30000,
    cost: 15000,
    price_large: 35000,
    cost_large: 18000,
    image: "bt-bo.webp",
    sort_order: 2,
  },
  {
    id: "bt-tac",
    name: "Bánh tráng tắc",
    price: 20000,
    cost: 10000,
    price_large: 25000,
    cost_large: 12000,
    image: "bt-tac.webp",
    sort_order: 3,
  },
  {
    id: "bt-xoai",
    name: "Bánh tráng xoài",
    price: 25000,
    cost: 12000,
    price_large: 30000,
    cost_large: 15000,
    image: "bt-xoai.webp",
    sort_order: 4,
  },
];

const DEFAULT_COST: Record<string, number> = Object.fromEntries(
  SEED.map((p) => [p.id, p.cost]),
);

const DEFAULT_LARGE: Record<string, { price_large: number; cost_large: number }> =
  Object.fromEntries(
    SEED.map((p) => [
      p.id,
      { price_large: p.price_large, cost_large: p.cost_large },
    ]),
  );

let productsReady = false;

export async function ensureProducts(db: Client): Promise<void> {
  if (productsReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      cost INTEGER NOT NULL DEFAULT 0,
      price_large INTEGER NOT NULL DEFAULT 0,
      cost_large INTEGER NOT NULL DEFAULT 0,
      image TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      sold_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);

  for (const col of [
    "cost INTEGER NOT NULL DEFAULT 0",
    "price_large INTEGER NOT NULL DEFAULT 0",
    "cost_large INTEGER NOT NULL DEFAULT 0",
    "sold_count INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      await db.execute(`ALTER TABLE products ADD COLUMN ${col}`);
      // Cột sold_count mới → backfill từ đơn hiện có
      if (col.startsWith("sold_count")) {
        const result = await db.execute(`SELECT items_json FROM orders`);
        const totals = new Map<string, number>();
        for (const row of result.rows) {
          let items: { id?: string; qty?: number }[] = [];
          try {
            items = JSON.parse(String(row.items_json || "[]")) as {
              id?: string;
              qty?: number;
            }[];
          } catch {
            items = [];
          }
          for (const [id, qty] of qtyByProductId(items)) {
            totals.set(id, (totals.get(id) || 0) + qty);
          }
        }
        for (const [id, n] of totals) {
          await db.execute({
            sql: `UPDATE products SET sold_count = ? WHERE id = ?`,
            args: [n, id],
          });
        }
      }
    } catch {
      // exists
    }
  }

  const count = await db.execute(`SELECT COUNT(*) AS n FROM products`);
  const n = Number(count.rows[0]?.n ?? 0);
  if (n === 0) {
    const now = Date.now();
    for (const p of SEED) {
      await db.execute({
        sql: `INSERT INTO products
              (id, name, price, cost, price_large, cost_large, image, sort_order, sold_count, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        args: [
          p.id,
          p.name,
          p.price,
          p.cost,
          p.price_large,
          p.cost_large,
          p.image,
          p.sort_order,
          now,
        ],
      });
    }
    productsReady = true;
    return;
  }

  // Đổi tên thương hiệu sản phẩm seed (một lần khi còn tên cũ)
  await db.execute({
    sql: `UPDATE products SET name = ? WHERE id = ? AND name = ?`,
    args: ["Bánh tráng cuộn", "bt-tron", "Bánh tráng trộn"],
  });

  for (const [id, cost] of Object.entries(DEFAULT_COST)) {
    await db.execute({
      sql: `UPDATE products SET cost = ? WHERE id = ? AND (cost IS NULL OR cost = 0)`,
      args: [cost, id],
    });
  }

  // Backfill large size from seed or +5k/+2k when missing (once per isolate)
  const rows = await db.execute(
    `SELECT id, price, cost, price_large, cost_large FROM products`,
  );
  for (const row of rows.rows) {
    const id = String(row.id);
    const price = Number(row.price) || 0;
    const cost = Number(row.cost) || 0;
    let priceLarge = Number(row.price_large) || 0;
    let costLarge = Number(row.cost_large) || 0;
    const seeded = DEFAULT_LARGE[id];
    if (priceLarge <= 0) {
      priceLarge = seeded?.price_large ?? price + 5000;
    }
    if (costLarge <= 0) {
      costLarge = seeded?.cost_large ?? Math.max(0, cost + 2000);
    }
    if (
      priceLarge !== Number(row.price_large) ||
      costLarge !== Number(row.cost_large)
    ) {
      await db.execute({
        sql: `UPDATE products SET price_large = ?, cost_large = ? WHERE id = ?`,
        args: [priceLarge, costLarge, id],
      });
    }
  }
  productsReady = true;
}

export function mapProduct(row: Record<string, unknown>): Product {
  const price = Number(row.price);
  const cost = Number(row.cost ?? 0);
  const priceLarge = Number(row.price_large ?? 0);
  const costLarge = Number(row.cost_large ?? 0);
  return {
    id: String(row.id),
    name: String(row.name),
    price,
    cost,
    price_large: priceLarge > 0 ? priceLarge : price + 5000,
    cost_large: costLarge > 0 ? costLarge : Math.max(0, cost + 2000),
    image: String(row.image),
    sort_order: Number(row.sort_order ?? 0),
    sold_count: Math.max(0, Math.floor(Number(row.sold_count ?? 0)) || 0),
    updated_at: Number(row.updated_at ?? 0),
  };
}

export async function listProducts(db: Client): Promise<Product[]> {
  await ensureProducts(db);
  const result = await db.execute(
    `SELECT id, name, price, cost, price_large, cost_large, image, sort_order, sold_count, updated_at
     FROM products
     ORDER BY sold_count DESC, sort_order ASC, name ASC`,
  );
  return result.rows.map((row) => mapProduct(row as Record<string, unknown>));
}

export async function getProduct(db: Client, id: string): Promise<Product | null> {
  await ensureProducts(db);
  const result = await db.execute({
    sql: `SELECT id, name, price, cost, price_large, cost_large, image, sort_order, sold_count, updated_at
          FROM products WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapProduct(row as Record<string, unknown>) : null;
}
