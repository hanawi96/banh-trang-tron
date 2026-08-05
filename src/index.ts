import { Hono } from "hono";
import type { Env } from "./env";
import {
  defaultDeliveryYmd,
  ensureSchema,
  getDb,
  nowMs,
  parseDateRangeKey,
  parseStatsRangeKey,
  applyOrdersStatus,
  parseDeliveryDate,
  parseOrderStatus,
  parseTs,
  rangeVn,
  todayRangeVn,
  upcomingDeliveryYmdRange,
  type OrderItem,
  type OrderSize,
} from "./db";
import {
  applySoldDeltas,
  getProduct,
  listProducts,
  qtyByProductId,
} from "./products";

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
      sold_count: existing.sold_count,
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

/** Aggregate stats by delivery-success day (delivered_at), VN calendar window */
app.get("/api/stats", async (c) => {
  const db = getDb(c.env);
  await ensureSchema(db);
  const rangeKey = parseStatsRangeKey(c.req.query("range"));
  const { start, end } = rangeVn(rangeKey);

  const [deliveredRes, receivedRes, openRes, products] = await Promise.all([
    db.execute({
      sql: `SELECT id, items_json, total, customer, phone, delivery_slot, delivery_date,
                   delivered_at, printed_at, created_at
            FROM orders
            WHERE status = 'done'
              AND COALESCE(delivered_at, printed_at, created_at) >= ?
              AND COALESCE(delivered_at, printed_at, created_at) < ?
            ORDER BY COALESCE(delivered_at, printed_at, created_at) DESC`,
      args: [start, end],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM orders
            WHERE created_at >= ? AND created_at < ?`,
      args: [start, end],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM orders
            WHERE status IS NULL OR status = '' OR status = 'pending' OR status = 'printed'`,
    }),
    listProducts(db),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const unitCost = (productId: string, size: OrderSize, price: number) => {
    const catalog = productMap.get(productId);
    if (!catalog) return Math.round(price * 0.55);
    return size === "to"
      ? Number(catalog.cost_large ?? catalog.cost) || 0
      : Number(catalog.cost) || 0;
  };
  const sizeLabel = (size: OrderSize) => (size === "to" ? "To" : "Nhỏ");

  let revenue = 0;
  let profit = 0;
  let countTrua = 0;
  let countChieu = 0;
  let countOther = 0;
  let revTrua = 0;
  let revChieu = 0;
  let revOther = 0;
  /** @type {Map<string, {id:string, name:string, size:OrderSize, qty:number, revenue:number, image:string}>} */
  const byProduct = new Map<
    string,
    {
      id: string;
      name: string;
      size: OrderSize;
      qty: number;
      revenue: number;
      image: string;
    }
  >();

  for (const row of deliveredRes.rows) {
    const total = Number(row.total) || 0;
    revenue += total;
    const slot = row.delivery_slot ? String(row.delivery_slot) : "";
    if (slot === "trua") {
      countTrua += 1;
      revTrua += total;
    } else if (slot === "chieu") {
      countChieu += 1;
      revChieu += total;
    } else {
      countOther += 1;
      revOther += total;
    }

    let items: OrderItem[] = [];
    try {
      items = JSON.parse(String(row.items_json || "[]")) as OrderItem[];
    } catch {
      items = [];
    }
    for (const item of items) {
      const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
      if (qty < 1) continue;
      const price = Number(item.price) || 0;
      const size: OrderSize = item.size === "to" ? "to" : "nho";
      const productId = String(item.id || "");
      const cost = unitCost(productId, size, price);
      profit += qty * (price - cost);
      const catalog = productId ? productMap.get(productId) : undefined;
      const key = `${productId || item.name}:${size}`;
      const prev = byProduct.get(key) || {
        id: productId,
        name: String(item.name || catalog?.name || "Món").trim() || "Món",
        size,
        qty: 0,
        revenue: 0,
        image: String(catalog?.image || item.image || ""),
      };
      if (!prev.image) {
        prev.image = String(catalog?.image || item.image || "");
      }
      prev.qty += qty;
      prev.revenue += qty * price;
      byProduct.set(key, prev);
    }
  }

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      sizeLabel: sizeLabel(p.size),
      qty: p.qty,
      revenue: p.revenue,
      image: p.image,
    }));

  const deliveredOrders = deliveredRes.rows.map((row) => {
    let items: OrderItem[] = [];
    try {
      items = JSON.parse(String(row.items_json || "[]")) as OrderItem[];
    } catch {
      items = [];
    }
    return {
      id: String(row.id),
      customer: row.customer ? String(row.customer) : "",
      phone: row.phone ? String(row.phone) : "",
      total: Number(row.total) || 0,
      delivery_slot: row.delivery_slot ? String(row.delivery_slot) : "",
      delivery_date: row.delivery_date ? String(row.delivery_date) : "",
      delivered_at: parseTs(
        row.delivered_at ?? row.printed_at ?? row.created_at,
      ),
      items: items.map((i) => ({
        name: String(i.name || "Món"),
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        size: i.size === "to" ? "to" : "nho",
      })),
    };
  });

  const deliveredCount = deliveredOrders.length;
  const receivedCount = Number(receivedRes.rows[0]?.cnt || 0);
  const openCount = Number(openRes.rows[0]?.cnt || 0);

  return c.json({
    range: rangeKey,
    tz: "Asia/Ho_Chi_Minh",
    revenue,
    profit,
    deliveredCount,
    receivedCount,
    openCount,
    bySlot: {
      trua: { count: countTrua, revenue: revTrua },
      chieu: { count: countChieu, revenue: revChieu },
      other: { count: countOther, revenue: revOther },
    },
    topProducts,
    deliveredOrders,
  });
});

app.get("/api/orders", async (c) => {
  const db = getDb(c.env);
  await ensureSchema(db);
  const rangeKey = parseDateRangeKey(c.req.query("range"));
  // `upcoming` = home board by delivery day (yesterday → last picker day).
  // `done` = mọi đơn đã giao (mới giao trước).
  // today/yesterday/7d/30d = by created_at (legacy list; stats uses /api/stats).
  const limit =
    rangeKey === "today" ||
    rangeKey === "yesterday" ||
    rangeKey === "upcoming"
      ? 200
      : 2000;

  let result;
  if (rangeKey === "done") {
    result = await db.execute({
      sql: `SELECT id, items_json, total, note, customer, phone, delivery_slot, delivery_date, status, printed_at, delivered_at, created_at
            FROM orders
            WHERE status = 'done'
            ORDER BY COALESCE(delivered_at, printed_at, created_at) DESC
            LIMIT ?`,
      args: [limit],
    });
  } else if (rangeKey === "upcoming") {
    const { startYmd, endYmdExclusive } = upcomingDeliveryYmdRange();
    const { start: createdStart, end: createdEnd } = todayRangeVn();
    result = await db.execute({
      sql: `SELECT id, items_json, total, note, customer, phone, delivery_slot, delivery_date, status, printed_at, delivered_at, created_at
            FROM orders
            WHERE
              (delivery_date >= ? AND delivery_date < ?)
              OR (
                (delivery_date IS NULL OR delivery_date = '')
                AND created_at >= ? AND created_at < ?
              )
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
      args: [startYmd, endYmdExclusive, createdStart, createdEnd, limit],
    });
  } else {
    const { start, end } = rangeVn(rangeKey);
    result = await db.execute({
      sql: `SELECT id, items_json, total, note, customer, phone, delivery_slot, delivery_date, status, printed_at, delivered_at, created_at
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
  }

  const orders = result.rows.map((row) => ({
    id: String(row.id),
    items: JSON.parse(String(row.items_json)) as OrderItem[],
    total: Number(row.total),
    note: row.note ? String(row.note) : "",
    customer: row.customer ? String(row.customer) : "",
    phone: row.phone ? String(row.phone) : "",
    delivery_slot: row.delivery_slot ? String(row.delivery_slot) : "",
    delivery_date: row.delivery_date ? String(row.delivery_date) : "",
    status: parseOrderStatus(row.status),
    printed_at: parseTs(row.printed_at),
    delivered_at: parseTs(row.delivered_at),
    created_at: Number(row.created_at),
  }));

  return c.json({
    orders,
    range: rangeKey,
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
  await applySoldDeltas(db, qtyByProductId(items));

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
    sql: `SELECT id, delivery_date, items_json FROM orders WHERE id = ? LIMIT 1`,
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

  let oldItems: OrderItem[] = [];
  try {
    oldItems = JSON.parse(String(existing.rows[0]?.items_json || "[]")) as OrderItem[];
  } catch {
    oldItems = [];
  }
  const deltas = new Map<string, number>();
  for (const [pid, qty] of qtyByProductId(oldItems)) {
    deltas.set(pid, (deltas.get(pid) || 0) - qty);
  }
  for (const [pid, qty] of qtyByProductId(items)) {
    deltas.set(pid, (deltas.get(pid) || 0) + qty);
  }

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
  await applySoldDeltas(db, deltas);

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
  const body = await c.req
    .json<{ status?: string; setPrinted?: boolean }>()
    .catch(() => null);
  const raw = body?.status;
  const status =
    raw === "done" || raw === "printed" || raw === "pending"
      ? raw
      : "";
  if (!status) {
    return c.json({ error: "Trạng thái không hợp lệ" }, 400);
  }
  const setPrinted = Boolean(body?.setPrinted) && status === "done";

  const db = getDb(c.env);
  await ensureSchema(db);
  const existing = await db.execute({
    sql: `SELECT id, printed_at, delivered_at FROM orders WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (!existing.rows.length) {
    return c.json({ error: "Không tìm thấy đơn" }, 404);
  }
  const { at } = await applyOrdersStatus(db, [id], status, { setPrinted });
  const prevPrinted = parseTs(existing.rows[0]?.printed_at);
  const printed_at =
    status === "pending"
      ? null
      : status === "printed" || setPrinted
        ? prevPrinted || at
        : prevPrinted;
  const delivered_at = status === "done" ? at : null;

  return c.json({ ok: true, id, status, printed_at, delivered_at, at });
});

app.post("/api/orders/status-bulk", async (c) => {
  const body = await c.req
    .json<{ ids?: string[]; status?: string; setPrinted?: boolean }>()
    .catch(() => null);
  const raw = body?.status;
  const status =
    raw === "done" || raw === "printed" || raw === "pending"
      ? raw
      : "";
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.map((id) => String(id).slice(0, 64)).filter(Boolean))].slice(0, 100)
    : [];
  if (!status || !ids.length) {
    return c.json({ error: "Dữ liệu không hợp lệ" }, 400);
  }
  const setPrinted = Boolean(body?.setPrinted) && status === "done";

  const db = getDb(c.env);
  await ensureSchema(db);
  const { at } = await applyOrdersStatus(db, ids, status, { setPrinted });

  return c.json({ ok: true, status, ids, at, setPrinted });
});

app.delete("/api/orders/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await ensureSchema(db);
  const existing = await db.execute({
    sql: `SELECT items_json FROM orders WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (!existing.rows.length) {
    return c.json({ error: "Không tìm thấy đơn" }, 404);
  }
  let oldItems: OrderItem[] = [];
  try {
    oldItems = JSON.parse(String(existing.rows[0]?.items_json || "[]")) as OrderItem[];
  } catch {
    oldItems = [];
  }
  const deltas = new Map<string, number>();
  for (const [pid, qty] of qtyByProductId(oldItems)) {
    deltas.set(pid, -(qty));
  }
  await db.execute({
    sql: `DELETE FROM orders WHERE id = ?`,
    args: [id],
  });
  await applySoldDeltas(db, deltas);
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
  const existing = await db.execute({
    sql: `SELECT items_json FROM orders WHERE id IN (${placeholders})`,
    args: ids,
  });
  const deltas = new Map<string, number>();
  for (const row of existing.rows) {
    let oldItems: OrderItem[] = [];
    try {
      oldItems = JSON.parse(String(row.items_json || "[]")) as OrderItem[];
    } catch {
      oldItems = [];
    }
    for (const [pid, qty] of qtyByProductId(oldItems)) {
      deltas.set(pid, (deltas.get(pid) || 0) - qty);
    }
  }
  await db.execute({
    sql: `DELETE FROM orders WHERE id IN (${placeholders})`,
    args: ids,
  });
  await applySoldDeltas(db, deltas);

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
