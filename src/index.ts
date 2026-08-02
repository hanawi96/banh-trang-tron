import { Hono } from "hono";
import type { Env } from "./env";
import {
  customerIdentityKey,
  defaultDeliveryYmd,
  ensureSchema,
  getDb,
  nowMs,
  parseDateRangeKey,
  parseDeliveryDate,
  rangeVn,
  type OrderItem,
} from "./db";
import { getProduct, listProducts } from "./products";

const app = new Hono<{ Bindings: Env }>();

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/avif",
]);

function extFromType(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/avif") return "avif";
  return "webp";
}

app.get("/api/products", async (c) => {
  const db = getDb(c.env);
  await ensureSchema(db);
  // Sold counts are derived client-side from today's orders — keep this endpoint light
  const products = await listProducts(db);
  return c.json({ products });
});

app.put("/api/products/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await ensureSchema(db);
  const existing = await getProduct(db, id);
  if (!existing) return c.json({ error: "Không tìm thấy sản phẩm" }, 404);

  const contentType = c.req.header("content-type") || "";
  let name = existing.name;
  let price = existing.price;
  let cost = existing.cost;
  let price_large = existing.price_large;
  let cost_large = existing.cost_large;
  let image = existing.image;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    if (typeof body.name === "string") name = body.name.trim();
    if (typeof body.price === "string" || typeof body.price === "number") {
      price = Math.floor(Number(body.price));
    }
    if (typeof body.cost === "string" || typeof body.cost === "number") {
      cost = Math.floor(Number(body.cost));
    }
    if (
      typeof body.price_large === "string" ||
      typeof body.price_large === "number"
    ) {
      price_large = Math.floor(Number(body.price_large));
    }
    if (
      typeof body.cost_large === "string" ||
      typeof body.cost_large === "number"
    ) {
      cost_large = Math.floor(Number(body.cost_large));
    }
    if (body.image instanceof File && body.image.size > 0) {
      file = body.image;
    }
  } else {
    const body = await c.req
      .json<{
        name?: string;
        price?: number;
        cost?: number;
        price_large?: number;
        cost_large?: number;
      }>()
      .catch(() => null);
    if (!body) return c.json({ error: "Dữ liệu không hợp lệ" }, 400);
    if (typeof body.name === "string") name = body.name.trim();
    if (body.price !== undefined) price = Math.floor(Number(body.price));
    if (body.cost !== undefined) cost = Math.floor(Number(body.cost));
    if (body.price_large !== undefined) {
      price_large = Math.floor(Number(body.price_large));
    }
    if (body.cost_large !== undefined) {
      cost_large = Math.floor(Number(body.cost_large));
    }
  }

  if (!name || name.length > 120) {
    return c.json({ error: "Tên sản phẩm không hợp lệ" }, 400);
  }
  if (!Number.isFinite(price) || price < 0 || price > 50_000_000) {
    return c.json({ error: "Giá size nhỏ không hợp lệ" }, 400);
  }
  if (!Number.isFinite(cost) || cost < 0 || cost > 50_000_000) {
    return c.json({ error: "Giá vốn size nhỏ không hợp lệ" }, 400);
  }
  if (
    !Number.isFinite(price_large) ||
    price_large < 0 ||
    price_large > 50_000_000
  ) {
    return c.json({ error: "Giá size to không hợp lệ" }, 400);
  }
  if (
    !Number.isFinite(cost_large) ||
    cost_large < 0 ||
    cost_large > 50_000_000
  ) {
    return c.json({ error: "Giá vốn size to không hợp lệ" }, 400);
  }

  if (file) {
    if (file.size > MAX_IMAGE_BYTES) {
      return c.json({ error: "Ảnh tối đa 2MB" }, 400);
    }
    const type = file.type || "image/webp";
    if (!ALLOWED_IMAGE.has(type)) {
      return c.json({ error: "Chỉ nhận ảnh webp/jpg/png" }, 400);
    }
    const key = `products/${id}-${Date.now()}.${extFromType(type)}`;
    await c.env.IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type },
    });
    // Best-effort cleanup of previous managed image
    if (existing.image.startsWith("products/")) {
      c.env.IMAGES.delete(existing.image).catch(() => {});
    }
    image = key;
  }

  const updated_at = Date.now();
  await db.execute({
    sql: `UPDATE products
          SET name = ?, price = ?, cost = ?, price_large = ?, cost_large = ?, image = ?, updated_at = ?
          WHERE id = ?`,
    args: [name, price, cost, price_large, cost_large, image, updated_at, id],
  });

  return c.json({
    product: {
      id,
      name,
      price,
      cost,
      price_large,
      cost_large,
      image,
      sort_order: existing.sort_order,
      updated_at,
    },
  });
});

app.delete("/api/products/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await ensureSchema(db);
  const existing = await getProduct(db, id);
  if (!existing) return c.json({ error: "Không tìm thấy sản phẩm" }, 404);

  await db.execute({
    sql: `DELETE FROM products WHERE id = ?`,
    args: [id],
  });

  if (existing.image.startsWith("products/")) {
    c.env.IMAGES.delete(existing.image).catch(() => {});
  }

  return c.json({ ok: true, id });
});

app.get("/api/orders", async (c) => {
  const db = getDb(c.env);
  await ensureSchema(db);
  const rangeKey = parseDateRangeKey(c.req.query("range"));
  const { start, end } = rangeVn(rangeKey);
  const limit = rangeKey === "today" || rangeKey === "yesterday" ? 200 : 2000;
  const result = await db.execute({
    sql: `SELECT id, items_json, total, note, customer, phone, delivery_slot, delivery_date, status, created_at
          FROM orders
          WHERE created_at >= ? AND created_at < ?
          ORDER BY
            CASE WHEN delivery_date IS NULL OR delivery_date = '' THEN 1 ELSE 0 END ASC,
            delivery_date ASC,
            CASE delivery_slot
              WHEN 'trua' THEN 0
              WHEN 'chieu' THEN 1
              ELSE 2
            END ASC,
            created_at ASC
          LIMIT ?`,
    args: [start, end, limit],
  });

  const orders = result.rows.map((row) => ({
    id: String(row.id),
    items: JSON.parse(String(row.items_json)) as OrderItem[],
    total: Number(row.total),
    note: row.note ? String(row.note) : "",
    customer: row.customer ? String(row.customer) : "",
    phone: row.phone ? String(row.phone) : "",
    delivery_slot: row.delivery_slot ? String(row.delivery_slot) : "",
    delivery_date: row.delivery_date ? String(row.delivery_date) : "",
    status: String(row.status || "pending") === "done" ? "done" : "pending",
    created_at: Number(row.created_at),
  }));

  // All-time order counts per customer (phone first, else name)
  const countRows = await db.execute(
    `SELECT customer, phone, COUNT(*) AS cnt FROM orders GROUP BY customer, phone`,
  );
  const countByKey = new Map<string, number>();
  for (const row of countRows.rows) {
    const key = customerIdentityKey(
      row.customer ? String(row.customer) : "",
      row.phone ? String(row.phone) : "",
    );
    if (!key) continue;
    countByKey.set(key, (countByKey.get(key) || 0) + Number(row.cnt || 0));
  }
  const ordersWithCount = orders.map((o) => ({
    ...o,
    order_count:
      countByKey.get(customerIdentityKey(o.customer, o.phone)) || 0,
  }));

  return c.json({
    orders: ordersWithCount,
    range: rangeKey,
    start,
    end,
    tz: "Asia/Ho_Chi_Minh",
  });
});

app.post("/api/orders", async (c) => {
  const body = await c.req
    .json<{
      items?: OrderItem[];
      note?: string;
      customer?: string;
      phone?: string;
      delivery_slot?: string;
      delivery_date?: string;
    }>()
    .catch(() => null);

  if (!body?.items?.length) {
    return c.json({ error: "Đơn trống" }, 400);
  }

  const delivery_slot = body.delivery_slot === "chieu" ? "chieu" : body.delivery_slot === "trua" ? "trua" : "";
  if (!delivery_slot) {
    return c.json({ error: "Chọn giao trưa hoặc giao chiều" }, 400);
  }
  const created_at = nowMs();
  const delivery_date =
    parseDeliveryDate(body.delivery_date, created_at) ||
    defaultDeliveryYmd(created_at);

  const parsedCreate = parseOrderItems(body.items);
  if (parsedCreate instanceof Response) return parsedCreate;
  const items = parsedCreate;
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const note = (body.note ?? "").trim().slice(0, 300);
  const customer = (body.customer ?? "").trim().slice(0, 120);
  const phone = (body.phone ?? "").trim().slice(0, 20);
  if (!customer) {
    return c.json({ error: "Nhập tên khách hàng" }, 400);
  }
  const id = crypto.randomUUID();

  const db = getDb(c.env);
  await ensureSchema(db);
  await db.execute({
    sql: `INSERT INTO orders (id, items_json, total, note, customer, phone, delivery_slot, delivery_date, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [
      id,
      JSON.stringify(items),
      total,
      note || null,
      customer || null,
      phone || null,
      delivery_slot,
      delivery_date,
      created_at,
    ],
  });

  return c.json(
    {
      ok: true,
      id,
      total,
      delivery_slot,
      delivery_date,
      status: "pending",
      created_at,
    },
    201,
  );
});

function parseOrderItems(rawItems: OrderItem[]): OrderItem[] | Response {
  const items: OrderItem[] = [];
  for (const raw of rawItems) {
    const qty = Math.floor(Number(raw.qty));
    const price = Math.floor(Number(raw.price));
    if (!raw.id || !raw.name || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return new Response(JSON.stringify({ error: "Món không hợp lệ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(price) || price < 0) {
      return new Response(JSON.stringify({ error: "Giá không hợp lệ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const image =
      typeof raw.image === "string" ? String(raw.image).trim().slice(0, 200) : "";
    const size = raw.size === "to" ? "to" : "nho";
    items.push({
      id: String(raw.id).slice(0, 64),
      name: String(raw.name).slice(0, 120),
      qty,
      price,
      size,
      ...(image && !image.includes("..") ? { image } : {}),
    });
  }
  return items;
}

app.put("/api/orders/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{
      items?: OrderItem[];
      note?: string;
      customer?: string;
      phone?: string;
      delivery_slot?: string;
      delivery_date?: string;
    }>()
    .catch(() => null);

  if (!body?.items?.length) {
    return c.json({ error: "Đơn trống" }, 400);
  }

  const delivery_slot =
    body.delivery_slot === "chieu"
      ? "chieu"
      : body.delivery_slot === "trua"
        ? "trua"
        : "";
  if (!delivery_slot) {
    return c.json({ error: "Chọn giao trưa hoặc giao chiều" }, 400);
  }

  const parsed = parseOrderItems(body.items);
  if (parsed instanceof Response) return parsed;
  const items = parsed;
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const note = (body.note ?? "").trim().slice(0, 300);
  const customer = (body.customer ?? "").trim().slice(0, 120);
  const phone = (body.phone ?? "").trim().slice(0, 20);
  if (!customer) {
    return c.json({ error: "Nhập tên khách hàng" }, 400);
  }

  const db = getDb(c.env);
  await ensureSchema(db);
  const existing = await db.execute({
    sql: `SELECT id, delivery_date FROM orders WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (!existing.rows.length) {
    return c.json({ error: "Không tìm thấy đơn" }, 404);
  }
  const prevDate = existing.rows[0]?.delivery_date
    ? String(existing.rows[0].delivery_date)
    : "";
  const delivery_date =
    parseDeliveryDate(body.delivery_date, nowMs(), prevDate) ||
    prevDate ||
    defaultDeliveryYmd();

  await db.execute({
    sql: `UPDATE orders
          SET items_json = ?, total = ?, note = ?, customer = ?, phone = ?, delivery_slot = ?, delivery_date = ?
          WHERE id = ?`,
    args: [
      JSON.stringify(items),
      total,
      note || null,
      customer || null,
      phone || null,
      delivery_slot,
      delivery_date,
      id,
    ],
  });

  return c.json({
    ok: true,
    order: {
      id,
      items,
      total,
      note,
      customer,
      phone,
      delivery_slot,
      delivery_date,
    },
  });
});

app.patch("/api/orders/:id/status", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ status?: string }>().catch(() => null);
  const status = body?.status === "done" ? "done" : body?.status === "pending" ? "pending" : "";
  if (!status) {
    return c.json({ error: "Trạng thái không hợp lệ" }, 400);
  }

  const db = getDb(c.env);
  await ensureSchema(db);
  const result = await db.execute({
    sql: `UPDATE orders SET status = ? WHERE id = ?`,
    args: [status, id],
  });
  if (result.rowsAffected === 0) {
    return c.json({ error: "Không tìm thấy đơn" }, 404);
  }

  return c.json({ ok: true, id, status });
});

app.post("/api/orders/status-bulk", async (c) => {
  const body = await c.req
    .json<{ ids?: string[]; status?: string }>()
    .catch(() => null);
  const status = body?.status === "done" ? "done" : body?.status === "pending" ? "pending" : "";
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.map((id) => String(id).slice(0, 64)).filter(Boolean))].slice(0, 100)
    : [];
  if (!status || !ids.length) {
    return c.json({ error: "Dữ liệu không hợp lệ" }, 400);
  }

  const db = getDb(c.env);
  await ensureSchema(db);
  const placeholders = ids.map(() => "?").join(", ");
  await db.execute({
    sql: `UPDATE orders SET status = ? WHERE id IN (${placeholders})`,
    args: [status, ...ids],
  });

  return c.json({ ok: true, status, ids });
});

app.delete("/api/orders/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await ensureSchema(db);
  const result = await db.execute({
    sql: `DELETE FROM orders WHERE id = ?`,
    args: [id],
  });
  if (result.rowsAffected === 0) {
    return c.json({ error: "Không tìm thấy đơn" }, 404);
  }
  return c.json({ ok: true, id });
});

app.post("/api/orders/delete-bulk", async (c) => {
  const body = await c.req.json<{ ids?: string[] }>().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.map((id) => String(id).slice(0, 64)).filter(Boolean))].slice(0, 100)
    : [];
  if (!ids.length) {
    return c.json({ error: "Chưa chọn đơn" }, 400);
  }

  const db = getDb(c.env);
  await ensureSchema(db);
  const placeholders = ids.map(() => "?").join(", ");
  await db.execute({
    sql: `DELETE FROM orders WHERE id IN (${placeholders})`,
    args: ids,
  });

  return c.json({ ok: true, ids });
});

const IMAGE_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
};

app.get("/images/:key{.+}", async (c) => {
  let key = c.req.param("key") || "";
  try {
    key = decodeURIComponent(key);
  } catch {
    return c.text("Not found", 404);
  }
  key = key.replace(/^\/+/, "");
  if (!key || key.includes("..")) {
    return c.text("Not found", 404);
  }

  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.text("Not found", 404);

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType =
    obj.httpMetadata?.contentType || IMAGE_TYPES[ext] || "application/octet-stream";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=604800, immutable");
  if (obj.httpEtag) headers.set("ETag", obj.httpEtag);

  return new Response(obj.body, { headers });
});

export default app;
