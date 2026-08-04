const $ = (id) => document.getElementById(id);

const appEl = $("app");
const menuEl = $("menu");
const ordersEl = $("orders");
const orderModal = $("order-modal");
const editOrderModal = $("edit-order-modal");
const editModal = $("edit-modal");
const deleteModal = $("delete-modal");
const deleteOrderModal = $("delete-order-modal");
const printConfirmModal = $("print-confirm-modal");
const deliverConfirmModal = $("deliver-confirm-modal");
const toastEl = $("toast");
const viewTitle = $("view-title");
const ordersBadge = $("orders-badge");
const saveBtn = $("save-order");
const saveEditOrderBtn = $("save-edit-order");
const saveProductBtn = $("save-product");
const confirmDeleteBtn = $("confirm-delete");
const editPreview = $("edit-preview");
const editImageInput = $("edit-image");
const editOrderMeta = $("edit-order-meta");
const orderMenuEl = $("order-menu");
const orderCartLinesEl = $("order-cart-lines");
const editOrderMenuEl = $("edit-order-menu");

const PRODUCT_CACHE_KEY = "bt_products_v3";
const ORDERS_CACHE_KEY = "bt_orders_board_v3";

/** @type {Map<string, number>} */
const qtyMap = new Map();
/** @type {Map<string, 'nho'|'to'>} */
const sizeMap = new Map();
/** @type {Array<{key:string,id:string,name:string,size:'nho'|'to',qty:number,price:number,image:string}>} */
let cart = [];
/** @type {Array<any>} */
let products = [];
/** @type {Array<any>} */
let ordersCache = [];
/** Mọi đơn đã giao (lịch sử) — tab Đã giao */
let doneOrdersCache = [];
let doneOrdersLoadPromise = null;
/** @type {Array<any>} */
let statsOrders = [];
/** @type {'today'|'yesterday'|'7d'|'30d'} */
let statsRange = "today";
/** @type {'pending'|'done'|'all'} — pending filter = chưa giao (pending|printed) */
let orderFilter = "pending";
/** @type {Set<string>} */
const statusBusy = new Set();
/** @type {Set<string>} */
const selectedOrderIds = new Set();
const PRINT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" /></svg>`;
/** @type {any} */
let editingProduct = null;
/** @type {any} */
let deletingProduct = null;
/** @type {any} */
let editingOrder = null;
/** @type {Array<{id:string,name:string,size:'nho'|'to',qty:number,price:number,image?:string}>} */
let editOrderItems = [];
/** @type {string[]} */
let pendingDeleteOrderIds = [];
/** @type {string[]} */
let pendingPrintIds = [];
/** @type {string[]} */
let pendingDeliverIds = [];
/** @type {File|null} */
let pendingImageFile = null;
let previewObjectUrl = "";

const EDIT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
const PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`;

const vndNum = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** @param {number|string|null|undefined} n */
function formatVnd(n) {
  return `${vndNum.format(Math.round(Number(n) || 0))}đ`;
}

const vnd = { format: formatVnd };

const VN_TZ = "Asia/Ho_Chi_Minh";

const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Ngày + giờ VN (dùng cho mốc in / giao) */
const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** @param {number|string|null|undefined} ts */
function formatVnDateTime(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  return dateTimeFmt.format(n);
}

/** Cập nhật mốc giờ local theo quy tắc server (unix ms → format VN)
 * @param {{ setPrinted?: boolean }} [opts]
 */
function applyLocalTimeline(order, nextStatus, opts = {}) {
  const next = normalizeStatus(nextStatus);
  const at = Date.now();
  order.status = next;
  if (next === "pending") {
    order.printed_at = null;
    order.delivered_at = null;
  } else if (next === "printed") {
    order.printed_at = Number(order.printed_at) > 0 ? order.printed_at : at;
    order.delivered_at = null;
  } else {
    order.delivered_at = at;
    // In = giao: ghi cả giờ in; giao tay nhanh: không invent giờ in
    if (opts.setPrinted && !(Number(order.printed_at) > 0)) {
      order.printed_at = at;
    }
  }
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Viết hoa chữ cái đầu mỗi từ — hiển thị / lưu tên khách */
function formatCustomerName(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const first = word.charAt(0).toLocaleUpperCase("vi-VN");
      const rest = word.slice(1).toLocaleLowerCase("vi-VN");
      return `${first}${rest}`;
    })
    .join(" ");
}

function imagesPath(key) {
  const clean = String(key || "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return clean ? `/images/${clean}` : "";
}

function imageUrl(product) {
  const bust = product.updated_at ? `?v=${product.updated_at}` : "";
  const path = imagesPath(product.image);
  return path ? `${path}${bust}` : "";
}

function vnDayKey(ts = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

function readProductCache() {
  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function writeProductCache(list) {
  try {
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

function readOrdersCache() {
  try {
    const raw = localStorage.getItem(ORDERS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.day !== vnDayKey() || !Array.isArray(data.orders)) {
      return null;
    }
    return data.orders;
  } catch {
    return null;
  }
}

/** VN day the in-memory orders list belongs to — blocks midnight cache poison */
let ordersFetchedDay = "";

function writeOrdersCache(list) {
  try {
    const day = vnDayKey();
    if (ordersFetchedDay && ordersFetchedDay !== day) return;
    localStorage.setItem(
      ORDERS_CACHE_KEY,
      JSON.stringify({ day, orders: list }),
    );
  } catch {
    /* quota / private mode */
  }
}

/** If calendar day rolled over while app stayed open, refetch delivery-today list */
function refreshOrdersIfDayChanged() {
  if (!ordersFetchedDay || ordersFetchedDay === vnDayKey()) return;
  ordersFetchedDay = "";
  loadOrders().catch(() => {});
  loadDoneOrders().catch(() => {});
}

function showOrdersSkeleton() {
  if (!ordersEl) return;
  ordersEl.setAttribute("aria-busy", "true");
  ordersEl.innerHTML = `
    <div class="order-skeleton" aria-hidden="true">
      <div class="order-skeleton-card"></div>
      <div class="order-skeleton-card"></div>
      <div class="order-skeleton-card"></div>
    </div>`;
}

/** Consume early prefetch from index.html, if present */
async function takePrefetch(key) {
  const bag = typeof window !== "undefined" ? window.__BT_PREFETCH : null;
  if (!bag || !bag[key]) return null;
  const pending = bag[key];
  bag[key] = null;
  try {
    return await pending;
  } catch {
    return null;
  }
}

function finishBoot() {
  document.documentElement.classList.remove("booting");
}

function revealApp() {
  appEl.classList.remove("hidden");
  setTab("orders");
  finishBoot();
}

const STATS_RANGE_LABEL = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
};

function normalizeSize(size) {
  return size === "to" ? "to" : "nho";
}

function sizeLabel(size) {
  return normalizeSize(size) === "to" ? "To" : "Nhỏ";
}

function getSize(id) {
  return normalizeSize(sizeMap.get(id) || "nho");
}

function setSize(id, size) {
  const next = normalizeSize(size);
  sizeMap.set(id, next);
  const product = products.find((p) => p.id === id);
  document
    .querySelectorAll(`[data-product-id="${CSS.escape(id)}"]`)
    .forEach((card) => {
      card.querySelectorAll("[data-size]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-size") === next);
      });
      const priceEl = card.querySelector("[data-price]");
      if (product && priceEl) {
        priceEl.textContent = vnd.format(productUnitPrice(product, next));
      }
    });
}

function productUnitPrice(product, size) {
  return normalizeSize(size) === "to"
    ? Number(product.price_large ?? product.price) || 0
    : Number(product.price) || 0;
}

function productUnitCost(product, size) {
  return normalizeSize(size) === "to"
    ? Number(product.cost_large ?? product.cost) || 0
    : Number(product.cost) || 0;
}

function computeStats(list) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  let revenue = 0;
  let revenueDone = 0;
  let profit = 0;
  let profitDone = 0;
  let pending = 0;
  let done = 0;
  let revTrua = 0;
  let revChieu = 0;
  let countTrua = 0;
  let countChieu = 0;
  /** @type {Map<string, {name:string, qty:number, revenue:number}>} */
  const byProduct = new Map();

  for (const o of list) {
    const status = normalizeStatus(o.status);
    const total = Number(o.total) || 0;
    revenue += total;
    if (status === "done") {
      done += 1;
      revenueDone += total;
    } else {
      pending += 1;
    }
    if (o.delivery_slot === "trua") {
      revTrua += total;
      countTrua += 1;
    } else if (o.delivery_slot === "chieu") {
      revChieu += total;
      countChieu += 1;
    }

    for (const item of o.items || []) {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      const size = normalizeSize(item.size);
      const catalog = productMap.get(item.id);
      const cost = catalog
        ? productUnitCost(catalog, size)
        : Math.round(price * 0.55);
      const lineRev = qty * price;
      const lineProfit = qty * (price - cost);
      profit += lineProfit;
      if (status === "done") profitDone += lineProfit;
      const key = `${item.id}:${size}`;
      const prev = byProduct.get(key) || {
        name: `${item.name} (${sizeLabel(size)})`,
        qty: 0,
        revenue: 0,
      };
      prev.qty += qty;
      prev.revenue += lineRev;
      byProduct.set(key, prev);
    }
  }

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    totalOrders: list.length,
    pending,
    done,
    revenue,
    revenueDone,
    profit,
    profitDone,
    revTrua,
    revChieu,
    countTrua,
    countChieu,
    topProducts,
  };
}

function renderStats() {
  const root = $("stats");
  if (!root) return;
  const label = STATS_RANGE_LABEL[statsRange] || "Hôm nay";
  const s = computeStats(statsOrders);
  if (!s.totalOrders) {
    root.innerHTML = `<p class="empty">Chưa có đơn trong khoảng “${escapeHtml(label)}”.</p>`;
    return;
  }

  const topHtml = s.topProducts.length
    ? s.topProducts
        .map(
          (p, i) => `
        <div class="stats-rank-row">
          <span class="stats-rank">#${i + 1}</span>
          <div class="stats-rank-info">
            <strong>${escapeHtml(p.name)}</strong>
            <span>${p.qty} phần · ${vnd.format(p.revenue)}</span>
          </div>
        </div>`,
        )
        .join("")
    : `<p class="empty">Chưa có dữ liệu món.</p>`;

  root.innerHTML = `
    <p class="stats-kicker">${escapeHtml(label)} · theo ngày nhận đơn · giờ VN</p>
    <div class="stats-hero">
      <article class="stats-card stats-card-lg">
        <span>Doanh thu</span>
        <strong>${vnd.format(s.revenue)}</strong>
        <small>Đã giao: ${vnd.format(s.revenueDone)}</small>
      </article>
      <article class="stats-card stats-card-lg stats-card-accent">
        <span>Lãi ước tính</span>
        <strong>${vnd.format(s.profit)}</strong>
        <small>Đã giao: ${vnd.format(s.profitDone)}</small>
      </article>
    </div>
    <div class="stats-grid">
      <article class="stats-card">
        <span>Tổng đơn</span>
        <strong>${s.totalOrders}</strong>
      </article>
      <article class="stats-card">
        <span>Đã giao</span>
        <strong class="ok">${s.done}</strong>
      </article>
      <article class="stats-card">
        <span>Chưa giao</span>
        <strong class="warn">${s.pending}</strong>
      </article>
    </div>
    <div class="stats-section">
      <h3>Theo ca giao</h3>
      <div class="stats-slot-grid">
        <article class="stats-card">
          <span>Giao trưa</span>
          <strong>${vnd.format(s.revTrua)}</strong>
          <small>${s.countTrua} đơn</small>
        </article>
        <article class="stats-card">
          <span>Giao chiều</span>
          <strong>${vnd.format(s.revChieu)}</strong>
          <small>${s.countChieu} đơn</small>
        </article>
      </div>
    </div>
    <div class="stats-section">
      <h3>Món bán chạy</h3>
      <div class="stats-rank-list">${topHtml}</div>
    </div>
  `;
}

function getQty(id) {
  return qtyMap.get(id) || 1;
}

function setQty(id, next) {
  const q = Math.max(1, Math.min(99, next));
  qtyMap.set(id, q);
  document.querySelectorAll(`[data-qty="${CSS.escape(id)}"]`).forEach((span) => {
    span.textContent = String(q);
  });
}

function anyModalOpen() {
  return (
    !orderModal.classList.contains("hidden") ||
    !editOrderModal.classList.contains("hidden") ||
    !editModal.classList.contains("hidden") ||
    !deleteModal.classList.contains("hidden") ||
    !deleteOrderModal.classList.contains("hidden") ||
    !printConfirmModal?.classList.contains("hidden") ||
    !deliverConfirmModal?.classList.contains("hidden")
  );
}

function lockBody(lock) {
  document.body.style.overflow = lock || anyModalOpen() ? "hidden" : "";
}

function buildProductCard(p, { manage, sold = 0 }) {
  if (!qtyMap.has(p.id)) qtyMap.set(p.id, 1);
  if (!sizeMap.has(p.id)) sizeMap.set(p.id, "nho");
  const q = getQty(p.id);
  const size = getSize(p.id);
  const unit = productUnitPrice(p, size);
  const row = document.createElement("article");
  row.className = manage ? "product product-manage" : "product";
  row.dataset.productId = p.id;
  if (manage) {
    row.innerHTML = `
      <div class="product-fabs">
        <button type="button" class="fab" data-edit="${escapeHtml(p.id)}" aria-label="Sửa ${escapeHtml(p.name)}">
          ${EDIT_ICON}
        </button>
        <button type="button" class="fab danger" data-delete="${escapeHtml(p.id)}" aria-label="Xóa ${escapeHtml(p.name)}">
          ${DELETE_ICON}
        </button>
      </div>
      <img class="product-thumb" src="${imageUrl(p)}" alt="" width="92" height="92" decoding="async" />
      <div class="product-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="price">Nhỏ ${vnd.format(p.price)} · To ${vnd.format(p.price_large ?? p.price)}</p>
        <p class="sold">${sold} lượt bán</p>
      </div>
    `;
    return row;
  }
  row.innerHTML = `
    <img class="product-thumb" src="${imageUrl(p)}" alt="" width="92" height="92" decoding="async" />
    <div class="product-body">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="price" data-price>${vnd.format(unit)}</p>
      <p class="sold">${sold} lượt bán</p>
    </div>
    <div class="product-controls">
      <div class="product-pick-row">
        <div class="qty">
          <button type="button" data-minus="${escapeHtml(p.id)}" aria-label="Giảm">−</button>
          <span data-qty="${escapeHtml(p.id)}">${q}</span>
          <button type="button" data-plus="${escapeHtml(p.id)}" aria-label="Tăng">+</button>
        </div>
        <div class="size-seg" role="group" aria-label="Chọn size">
          <button type="button" data-size-for="${escapeHtml(p.id)}" data-size="nho" class="${size === "nho" ? "active" : ""}">Nhỏ</button>
          <button type="button" data-size-for="${escapeHtml(p.id)}" data-size="to" class="${size === "to" ? "active" : ""}">To</button>
        </div>
      </div>
      <button type="button" class="btn add" data-add="${escapeHtml(p.id)}">${PLUS_ICON}<span>Thêm vào đơn</span></button>
    </div>
  `;
  return row;
}

function renderProductList(root, { manage }) {
  if (!root) return;
  // API đã sort sold_count DESC; client giữ thứ tự đó (và khi cache cũ thiếu field)
  const list = [...products].sort((a, b) => {
    const diff =
      (Math.max(0, Number(b.sold_count) || 0)) -
      (Math.max(0, Number(a.sold_count) || 0));
    if (diff !== 0) return diff;
    const so = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
    if (so !== 0) return so;
    return String(a.name || "").localeCompare(String(b.name || ""), "vi");
  });
  const frag = document.createDocumentFragment();
  for (const p of list) {
    frag.appendChild(
      buildProductCard(p, {
        manage,
        sold: Math.max(0, Math.floor(Number(p.sold_count) || 0)),
      }),
    );
  }
  root.replaceChildren(frag);
}

function renderMenu() {
  renderProductList(menuEl, { manage: true });
  if (orderMenuEl && !orderModal.classList.contains("hidden")) {
    renderProductList(orderMenuEl, { manage: false });
  }
  if (editOrderMenuEl && !editOrderModal.classList.contains("hidden")) {
    renderProductList(editOrderMenuEl, { manage: false });
  }
}

function lineKey(id, size) {
  return `${id}:${normalizeSize(size)}`;
}

function cartTotals(list = cart) {
  let parts = 0;
  let total = 0;
  for (const line of list) {
    const qty = Number(line.qty) || 0;
    parts += qty;
    total += qty * (Number(line.price) || 0);
  }
  return { parts, total, lines: list.length };
}

function renderLineRow(line, { prefix, sizeToggle = false }) {
  const el = document.createElement("div");
  el.className = sizeToggle ? "cart-line cart-line-edit" : "cart-line";
  const key = line.key || lineKey(line.id, line.size);
  el.dataset.lineKey = key;
  const size = normalizeSize(line.size);
  const sizeHtml = sizeToggle
    ? `<div class="size-seg cart-line-size" role="group" aria-label="Size">
        <button type="button" data-${prefix}-size="${escapeHtml(key)}" data-size="nho" class="${size === "nho" ? "active" : ""}">Nhỏ</button>
        <button type="button" data-${prefix}-size="${escapeHtml(key)}" data-size="to" class="${size === "to" ? "active" : ""}">To</button>
      </div>`
    : `<span class="order-size">${escapeHtml(sizeLabel(size))}</span>`;
  el.innerHTML = `
    <div class="cart-line-info">
      <strong>${escapeHtml(line.name)}</strong>
      <span class="cart-line-meta">${sizeHtml}<span class="cart-line-price">${vnd.format(line.price)}</span></span>
    </div>
    <div class="qty">
      <button type="button" data-${prefix}-minus="${escapeHtml(key)}" aria-label="Giảm">−</button>
      <span>${line.qty}</span>
      <button type="button" data-${prefix}-plus="${escapeHtml(key)}" aria-label="Tăng">+</button>
    </div>
    <button type="button" class="cart-line-remove" data-${prefix}-remove="${escapeHtml(key)}" aria-label="Xóa dòng">
      ${DELETE_ICON}
    </button>
  `;
  return el;
}

function updateComposeMeta() {
  const { parts, total, lines } = cartTotals();
  const meta = $("modal-meta");
  if (meta) {
    meta.textContent = lines
      ? `${lines} món · ${parts} phần · ${formatVnd(total)}`
      : "Chưa có món";
  }
  $("cart-clear")?.classList.toggle("hidden", !lines);
  const label = saveBtn?.querySelector(".btn-label");
  if (label && !saveBtn.classList.contains("is-busy")) {
    label.textContent = lines
      ? `Tạo đơn hàng (${formatVnd(total)})`
      : "Tạo đơn hàng";
  }
}

function renderCartLines() {
  if (!orderCartLinesEl) return;
  const section = $("order-cart-section");
  if (!cart.length) {
    orderCartLinesEl.replaceChildren();
    section?.classList.add("hidden");
    updateComposeMeta();
    return;
  }
  section?.classList.remove("hidden");
  section?.classList.remove("is-invalid");
  const frag = document.createDocumentFragment();
  for (const line of cart) frag.appendChild(renderLineRow(line, { prefix: "cart" }));
  orderCartLinesEl.replaceChildren(frag);
  updateComposeMeta();
}

function addToCart(product) {
  const size = getSize(product.id);
  const addQty = getQty(product.id);
  const price = productUnitPrice(product, size);
  const key = lineKey(product.id, size);
  const existing = cart.find((l) => l.key === key);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + addQty);
    existing.price = price;
    existing.name = product.name;
    existing.image = product.image;
  } else {
    cart.push({
      key,
      id: product.id,
      name: product.name,
      size,
      qty: addQty,
      price,
      image: product.image,
    });
  }
  setQty(product.id, 1);
  renderCartLines();
  toast(`+${addQty} ${product.name} (${sizeLabel(size)})`);
}

function updateCartLine(key, delta) {
  const line = cart.find((l) => l.key === key);
  if (!line) return;
  line.qty += delta;
  if (line.qty < 1) cart = cart.filter((l) => l.key !== key);
  else if (line.qty > 99) line.qty = 99;
  renderCartLines();
}

function removeCartLine(key) {
  cart = cart.filter((l) => l.key !== key);
  renderCartLines();
}

function clearCart() {
  cart = [];
  renderCartLines();
}

/** Toast + highlight + smooth scroll to the first invalid compose control */
function showComposeIssue(el, message) {
  toast(message);
  const root = el?.closest?.(".modal") || orderModal;
  root?.querySelectorAll(".is-invalid").forEach((n) => n.classList.remove("is-invalid"));
  const wrap =
    el instanceof HTMLElement
      ? el.closest(".field") || el.closest(".compose-section") || el
      : null;
  wrap?.classList.add("is-invalid");
  const focusEl =
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el
      : wrap?.querySelector("input, textarea");
  requestAnimationFrame(() => {
    (wrap || el)?.scrollIntoView({ behavior: "smooth", block: "center" });
    focusEl?.focus?.({ preventScroll: true });
  });
}

function clearComposeInvalid(root = orderModal) {
  root?.querySelectorAll(".is-invalid").forEach((n) => n.classList.remove("is-invalid"));
}

const OPTIONAL_FIELDS = {
  create: {
    actions: "order-optional-actions",
    phoneBtn: "show-order-phone",
    noteBtn: "show-order-note",
    phoneField: "order-phone-field",
    noteField: "order-note-field",
    phoneInput: "customer-phone",
    noteInput: "order-note",
  },
  edit: {
    actions: "edit-order-optional-actions",
    phoneBtn: "show-edit-order-phone",
    noteBtn: "show-edit-order-note",
    phoneField: "edit-order-phone-field",
    noteField: "edit-order-note-field",
    phoneInput: "edit-order-phone",
    noteInput: "edit-order-note",
  },
};

/** Ẩn/hiện SĐT + note theo dữ liệu sẵn có */
function syncOptionalFields(scope, { phone = "", note = "" } = {}) {
  const cfg = OPTIONAL_FIELDS[scope];
  if (!cfg) return;
  const phoneVal = String(phone || "").trim();
  const noteVal = String(note || "").trim();
  const phoneInput = $(cfg.phoneInput);
  const noteInput = $(cfg.noteInput);
  if (phoneInput) phoneInput.value = phoneVal;
  if (noteInput) noteInput.value = noteVal;

  const showPhone = Boolean(phoneVal);
  const showNote = Boolean(noteVal);
  $(cfg.phoneField)?.classList.toggle("hidden", !showPhone);
  $(cfg.noteField)?.classList.toggle("hidden", !showNote);
  $(cfg.phoneBtn)?.classList.toggle("hidden", showPhone);
  $(cfg.noteBtn)?.classList.toggle("hidden", showNote);
  $(cfg.actions)?.classList.toggle("hidden", showPhone && showNote);
}

function revealOptionalField(scope, kind) {
  const cfg = OPTIONAL_FIELDS[scope];
  if (!cfg) return;
  if (kind === "phone") {
    $(cfg.phoneField)?.classList.remove("hidden");
    $(cfg.phoneBtn)?.classList.add("hidden");
    requestAnimationFrame(() => $(cfg.phoneInput)?.focus());
  } else if (kind === "note") {
    $(cfg.noteField)?.classList.remove("hidden");
    $(cfg.noteBtn)?.classList.add("hidden");
    requestAnimationFrame(() => $(cfg.noteInput)?.focus());
  }
  const phoneHidden = $(cfg.phoneBtn)?.classList.contains("hidden");
  const noteHidden = $(cfg.noteBtn)?.classList.contains("hidden");
  if (phoneHidden && noteHidden) $(cfg.actions)?.classList.add("hidden");
}

function resetOrderOptionalFields() {
  syncOptionalFields("create", { phone: "", note: "" });
}

function revealOrderOptionalField(kind) {
  revealOptionalField("create", kind);
}

function openCreateOrder() {
  cart = [];
  clearComposeInvalid(orderModal);
  $("modal-title").textContent = "Thêm đơn hàng";
  $("customer-name").value = "";
  resetOrderOptionalFields();
  renderDeliveryDateOptions(
    "delivery-date-options",
    "delivery_date",
    defaultDeliveryYmd(),
  );
  const chieu = document.querySelector('input[name="delivery_slot"][value="chieu"]');
  if (chieu instanceof HTMLInputElement) chieu.checked = true;
  renderCartLines();
  renderProductList(orderMenuEl, { manage: false });
  orderModal.classList.remove("hidden");
  orderModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("customer-name")?.focus());
}

function closeOrderModal() {
  orderModal.classList.add("hidden");
  orderModal.setAttribute("aria-hidden", "true");
  lockBody(false);
}

function setProducts(list, { render = true, cache = true } = {}) {
  products = list;
  if (cache) writeProductCache(list);
  if (render) renderMenu();
  // Order thumbs prefer live catalog images — refresh when products change
  if (ordersCache.length) renderOrders(ordersCache);
}

/** Prefer current product catalog image so order thumbs follow avatar updates */
function resolveItemImage(item) {
  const p = products.find((x) => x.id === item.id);
  if (p?.image) return p.image;
  return item.image || "";
}

function itemImageUrl(item) {
  const p = products.find((x) => x.id === item.id);
  const path = imagesPath(resolveItemImage(item));
  if (!path) return "";
  const bust = p?.updated_at ? `?v=${p.updated_at}` : "";
  return `${path}${bust}`;
}

/** @returns {'pending'|'printed'|'done'} */
function normalizeStatus(status) {
  if (status === "done") return "done";
  if (status === "printed") return "printed";
  return "pending";
}

function isOpenStatus(status) {
  const s = normalizeStatus(status);
  return s === "pending" || s === "printed";
}

function matchesOrderFilter(status, filter = orderFilter) {
  const s = normalizeStatus(status);
  if (filter === "all") return true;
  if (filter === "done") return s === "done";
  // "Chưa giao" = chưa in + đã in (chưa mang đi)
  return isOpenStatus(s);
}

function statusLabel(status) {
  const s = normalizeStatus(status);
  if (s === "done") return "Đã giao";
  if (s === "printed") return "Đã in";
  return "Chưa in";
}

function statusRank(status) {
  const s = normalizeStatus(status);
  if (s === "pending") return 0;
  if (s === "printed") return 1;
  return 2;
}

/** Đơn chưa giao đang hiện trên board — chọn hàng loạt */
function openVisibleIds() {
  return ordersCache
    .filter((o) => isOpenStatus(o.status))
    .filter((o) => matchesOrderFilter(o.status))
    .map((o) => o.id);
}

/** Thanh bánh tráng / suất theo size */
const BARS_PER_NHO = 2.5;
const BARS_PER_TO = 5;

/** @param {number} n */
function formatBars(n) {
  const rounded = Math.round(Number(n) * 2) / 2;
  if (!Number.isFinite(rounded) || rounded <= 0) return "0";
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** @param {'nho'|'to'|string} size */
function barsPerServing(size) {
  return normalizeSize(size) === "to" ? BARS_PER_TO : BARS_PER_NHO;
}

/** Tổng suất theo tên món + size từ danh sách đơn
 * @param {Array<{items?: unknown}>} orders
 */
function summarizeOrderServings(orders) {
  /** @type {Map<string, {name:string,size:'nho'|'to',qty:number}>} */
  const map = new Map();
  let total = 0;
  let bars = 0;
  for (const order of orders) {
    if (!order || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
      if (qty < 1) continue;
      const size = normalizeSize(item.size);
      const name = String(item.name || "Món").trim() || "Món";
      const key = `${String(item.id || name)}\0${size}`;
      const prev = map.get(key);
      if (prev) prev.qty += qty;
      else map.set(key, { name, size, qty });
      total += qty;
      bars += qty * barsPerServing(size);
    }
  }
  const rows = [...map.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "vi");
    if (byName) return byName;
    return a.size === b.size ? 0 : a.size === "nho" ? -1 : 1;
  });
  const parts = rows.map(
    (p) => `${p.qty} suất ${p.name} size ${sizeLabel(p.size).toLowerCase()}`,
  );
  return { total, rows, parts, bars };
}

/** Tổng suất từ các đơn đang checkbox */
function summarizeSelectedServings() {
  const orders = [];
  for (const id of selectedOrderIds) {
    const order = ordersCache.find((o) => o.id === id);
    if (order) orders.push(order);
  }
  return summarizeOrderServings(orders);
}

function updateBulkBar() {
  const bulk = $("order-bulk");
  const selectAllBtn = $("bulk-select-all");
  const countEl = $("bulk-selected-count");
  const servingsEl = $("bulk-servings-summary");
  if (!bulk || !selectAllBtn || !countEl) return;

  const openIds = openVisibleIds();
  for (const id of [...selectedOrderIds]) {
    if (!openIds.includes(id)) selectedOrderIds.delete(id);
  }

  const n = selectedOrderIds.size;
  const show = n > 0 && orderFilter !== "done";
  bulk.classList.toggle("hidden", !show);
  bulk.setAttribute("aria-hidden", show ? "false" : "true");
  document.body.classList.toggle("bulk-open", show);
  countEl.textContent = String(n);
  selectAllBtn.textContent =
    n > 0 && n === openIds.length ? "Bỏ chọn" : "Chọn tất cả";

  if (servingsEl) {
    if (!show) {
      servingsEl.hidden = true;
      servingsEl.textContent = "";
    } else {
      const { total, parts, bars } = summarizeSelectedServings();
      servingsEl.hidden = false;
      servingsEl.textContent = parts.length
        ? `Tổng ${total} suất · ${formatBars(bars)} thanh bánh tráng (${parts.join(" + ")})`
        : `Tổng 0 suất · 0 thanh bánh tráng`;
    }
  }
}

/** A6 half-slip HTML for one order (2 slips / sheet, cut in half)
 * @param {'top'|'bottom'} half
 */
function buildOrderSlipHtml(order, index, total, half) {
  const customer = formatCustomerName(order.customer) || "Khách";
  const phone = (order.phone || "").trim();
  const note = (order.note || "").trim();
  const slot = order.delivery_slot === "chieu" ? "chieu" : order.delivery_slot === "trua" ? "trua" : "";
  const when = [deliveryDateLabel(order.delivery_date || ""), slotLabel(slot)]
    .filter(Boolean)
    .join(" · ");
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items.length
    ? items
        .map((i) => {
          const qty = Math.max(1, Number(i.qty) || 1);
          const size = sizeLabel(i.size);
          const name = escapeHtml(i.name || "Món");
          const sizeBit = size
            ? `<span class="sz">Size: ${escapeHtml(size)}</span>`
            : "";
          return `<li><span class="qty">${qty}×</span><span class="nm">${name}</span>${sizeBit}</li>`;
        })
        .join("")
    : `<li class="empty-line">Chưa có món</li>`;
  const dense = items.length >= 4 ? " slip-dense" : "";
  const halfClass = half === "bottom" ? "slip-bottom" : "slip-top";
  const qrSrc = `${location.origin}/img/qr_code.jpg`;

  return `<article class="slip ${halfClass}${dense}">
  <div class="slip-who">
    <div class="slip-when">${when ? escapeHtml(when) : "Chưa chọn giao"}</div>
    <div class="slip-customer">
      <div class="slip-name">${escapeHtml(customer)}</div>
      ${phone ? `<div class="slip-phone">${escapeHtml(phone)}</div>` : ""}
    </div>
  </div>
  <ul class="slip-items">${itemsHtml}</ul>
  ${note ? `<div class="slip-note"><span>Lưu ý</span>${escapeHtml(note)}</div>` : ""}
  <footer class="slip-foot">
    <span>Tổng tiền:</span>
    <strong>${escapeHtml(formatVnd(order.total))}</strong>
  </footer>
  <div class="slip-pay">
    <img class="slip-qr" src="${escapeHtml(qrSrc)}" alt="QR chuyển khoản" width="180" height="180" />
    <div class="slip-pay-info">
      <div class="slip-pay-title">Thanh toán qua CK — vui lòng CK vào</div>
      <div class="slip-pay-acc">1903 6266 5600 15</div>
      <div class="slip-pay-bank">Techcombank</div>
      <div class="slip-pay-name">Lê Thị Ánh</div>
    </div>
  </div>
</article>`;
}

/** Trang A6 đầu: tổng kết suất cần làm (to, rõ) */
function buildPrintSummaryPageHtml(list) {
  const { total, rows, bars } = summarizeOrderServings(list);
  const printedLabel = formatVnDateTime(Date.now());
  const dense = rows.length >= 8 ? " sum-dense" : rows.length >= 5 ? " sum-mid" : "";
  const barsText = formatBars(bars);
  const rowsHtml = rows.length
    ? rows
        .map(
          (r) => `<li>
      <span class="sum-qty">${r.qty}</span>
      <span class="sum-name">${escapeHtml(r.name)}</span>
      <span class="sum-size">Size ${escapeHtml(sizeLabel(r.size))}</span>
    </li>`,
        )
        .join("")
    : `<li class="sum-empty">Chưa có suất</li>`;

  return `<section class="page page-summary${dense}">
  <div class="sum-brand">Bánh tráng cuộn</div>
  <h1 class="sum-title">Tổng kết làm bánh</h1>
  <p class="sum-meta">${list.length} đơn${printedLabel ? ` · In ${escapeHtml(printedLabel)}` : ""} · Nhỏ ${BARS_PER_NHO} thanh · To ${BARS_PER_TO} thanh</p>
  <div class="sum-stats">
    <div class="sum-total">
      <span class="sum-total-label">Tổng</span>
      <strong class="sum-total-num">${total}</strong>
      <span class="sum-total-unit">suất</span>
    </div>
    <div class="sum-total sum-bars">
      <span class="sum-total-label">Cần</span>
      <strong class="sum-total-num">${escapeHtml(barsText)}</strong>
      <span class="sum-total-unit">thanh</span>
    </div>
  </div>
  <ul class="sum-list">${rowsHtml}</ul>
</section>`;
}

/** Group slips into A6 pages — bulk: summary first; single: slips only */
function buildPrintPagesHtml(list) {
  const total = list.length;
  const pages = [];
  if (total > 1) pages.push(buildPrintSummaryPageHtml(list));
  for (let i = 0; i < total; i += 2) {
    const top = buildOrderSlipHtml(list[i], i, total, "top");
    const bottom =
      i + 1 < total
        ? buildOrderSlipHtml(list[i + 1], i + 1, total, "bottom")
        : `<article class="slip slip-bottom slip-blank" aria-hidden="true"></article>`;
    pages.push(
      `<section class="page">${top}<div class="cut-guide" aria-hidden="true"></div>${bottom}</section>`,
    );
  }
  return pages.join("\n");
}

const A6_PRINT_CSS = `@page{size:A6 portrait;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:105mm;background:#fff;color:#111;
font-family:"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif;
-webkit-print-color-adjust:exact;print-color-adjust:exact}
/* Một .page = đúng 1 tờ A6; 2 slip absolute nửa trên/dưới — tránh flex min-height đẩy sang tờ 2 */
.page{
position:relative;width:105mm;height:148mm;overflow:hidden;
break-inside:avoid;page-break-inside:avoid
}
.page+.page{break-before:page;page-break-before:always}
.page-summary{
padding:6mm 5.5mm 5mm;display:flex;flex-direction:column;gap:2.8mm;
box-sizing:border-box
}
.sum-brand{font-size:11pt;font-weight:800;letter-spacing:-.02em}
.sum-title{font-size:18pt;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.sum-meta{font-size:9pt;font-weight:700;color:#333}
.sum-stats{display:flex;flex-direction:column;gap:2.2mm}
.sum-total{
display:flex;align-items:baseline;justify-content:center;gap:2.5mm;
padding:3.5mm 2.5mm;border:2.2pt solid #111;border-radius:2mm;text-align:center
}
.sum-total-label{font-size:12pt;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.sum-total-num{font-size:30pt;font-weight:800;letter-spacing:-.04em;line-height:1}
.sum-total-unit{font-size:13pt;font-weight:800}
.sum-list{
list-style:none;flex:1;min-height:0;overflow:hidden;
display:flex;flex-direction:column;justify-content:flex-start;gap:2mm;
padding-top:1mm
}
.sum-list li{
display:grid;grid-template-columns:16mm 1fr auto;align-items:center;gap:2.5mm;
padding:2.4mm 1.5mm;border-bottom:1pt solid #ccc
}
.sum-list .sum-qty{font-size:22pt;font-weight:800;letter-spacing:-.03em;line-height:1;text-align:right}
.sum-list .sum-name{font-size:13pt;font-weight:800;letter-spacing:-.02em;min-width:0;word-break:break-word;line-height:1.15}
.sum-list .sum-size{
font-size:11pt;font-weight:800;white-space:nowrap;
padding:1.4mm 2.4mm;border:1.4pt solid #111;border-radius:1.2mm
}
.sum-list .sum-empty{display:block;text-align:center;color:#666;font-size:11pt;border:0}
.sum-mid .sum-title{font-size:16pt}
.sum-mid .sum-total-num{font-size:26pt}
.sum-mid .sum-total-label{font-size:11pt}
.sum-mid .sum-total-unit{font-size:12pt}
.sum-mid .sum-list{gap:1.5mm}
.sum-mid .sum-list li{padding:1.8mm 1.2mm}
.sum-mid .sum-list .sum-qty{font-size:18pt}
.sum-mid .sum-list .sum-name{font-size:11.5pt}
.sum-mid .sum-list .sum-size{font-size:10pt;padding:1.2mm 2mm}
.sum-dense .sum-title{font-size:14pt}
.sum-dense .sum-total{padding:2.5mm 2mm}
.sum-dense .sum-total-num{font-size:22pt}
.sum-dense .sum-total-label{font-size:10pt}
.sum-dense .sum-total-unit{font-size:11pt}
.sum-dense .sum-list{gap:1.2mm}
.sum-dense .sum-list li{padding:1.4mm 1mm;gap:2mm;grid-template-columns:14mm 1fr auto}
.sum-dense .sum-list .sum-qty{font-size:16pt}
.sum-dense .sum-list .sum-name{font-size:10.5pt}
.sum-dense .sum-list .sum-size{font-size:9pt;padding:1mm 1.6mm}
.slip{
position:absolute;left:0;right:0;width:105mm;height:73mm;
padding:2.5mm 4.5mm 2mm;
display:flex;flex-direction:column;gap:.8mm;min-height:0;overflow:hidden
}
.slip-top{top:0}
.slip-bottom{top:75mm}
.slip-blank{visibility:hidden}
.cut-guide{
position:absolute;left:0;right:0;top:74mm;z-index:2;
height:0;border-top:1.6pt solid #111;pointer-events:none
}
.slip-who{
display:flex;align-items:center;justify-content:center;gap:2.5mm;
flex:0 0 auto;min-width:0;margin-bottom:1.2mm
}
.slip-when{
font-size:8pt;font-weight:800;flex:0 0 auto;white-space:nowrap;
padding:.8mm 1.8mm;border:1pt solid #111;border-radius:1.1mm;
letter-spacing:.01em;line-height:1.15
}
.slip-customer{text-align:left;padding:0;min-width:0;flex:0 1 auto}
.slip-name{font-size:11pt;font-weight:800;letter-spacing:-.02em;line-height:1.1;word-break:break-word}
.slip-phone{margin-top:.2mm;font-size:7.5pt;font-weight:700;color:#222}
.slip-items{
flex:1 1 auto;list-style:none;border-top:0.7pt dashed #999;border-bottom:0.7pt dashed #999;
padding:1.5mm 0;display:flex;flex-direction:column;justify-content:center;gap:.8mm;
min-height:0;overflow:hidden
}
.slip-items li{display:flex;align-items:baseline;gap:1.5mm;font-size:11pt;line-height:1.12}
.slip-items .qty{font-weight:800;min-width:6.5mm;flex:0 0 auto}
.slip-items .nm{flex:1;font-weight:800;min-width:0;word-break:break-word}
.slip-items .sz{flex:0 0 auto;font-size:8.5pt;font-weight:800;color:#111;white-space:nowrap}
.slip-items .empty-line{color:#666;font-size:8.5pt;justify-content:center}
.slip-note{font-size:7pt;line-height:1.15;padding:.6mm 1mm;background:#f3f3f3;border-radius:1mm;flex:0 0 auto;overflow:hidden}
.slip-note span{display:block;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:.2mm}
.slip-foot{
display:flex;align-items:baseline;justify-content:space-between;gap:2mm;
font-size:9.5pt;font-weight:700;flex:0 0 auto
}
.slip-foot strong{font-size:14pt;font-weight:800;letter-spacing:-.02em}
.slip-pay{
display:flex;align-items:center;gap:3mm;flex:0 0 auto;
padding-top:1mm;border-top:0.7pt solid #bbb
}
.slip-qr{
width:32mm;height:32mm;object-fit:contain;flex:0 0 auto;
border:0.4pt solid #ccc;border-radius:1mm
}
.slip-pay-info{min-width:0;flex:1;line-height:1.2}
.slip-pay-title{
font-size:6.5pt;font-weight:800;text-transform:uppercase;
letter-spacing:.03em;color:#333
}
.slip-pay-acc{
font-size:10pt;font-weight:800;letter-spacing:.05em;
margin-top:.5mm;font-variant-numeric:tabular-nums
}
.slip-pay-bank{font-size:8pt;font-weight:700;margin-top:.4mm}
.slip-pay-name{font-size:8pt;font-weight:600;color:#222}
.slip-dense .slip-name{font-size:10pt}
.slip-dense .slip-items{gap:.5mm}
.slip-dense .slip-items li{font-size:9.5pt}
.slip-dense .slip-items .sz{font-size:7.5pt}
.slip-dense .slip-foot strong{font-size:12pt}
.slip-dense .slip-qr{width:28mm;height:28mm}
.slip-dense .slip-pay-acc{font-size:9pt}
.slip-dense .slip-pay-title{font-size:6pt}
@media screen{
body{margin:12px auto}
.page{outline:1px dashed #ccc;margin:0 auto 12px;box-shadow:0 0 0 1px #ddd}
}`;

/**
 * In phiếu A6 qua iframe ẩn (không mở tab — tránh Chrome blank about:blank).
 * 2 đơn / tờ A6 (cắt đôi).
 * @param {string[]} ids
 * @returns {string[]|null}
 */
function exportOrdersPdfA6(ids) {
  const idSet = new Set(ids);
  const list = ordersCache.filter((o) => idSet.has(o.id));
  if (!list.length) {
    toast("Không tìm thấy đơn đã chọn");
    return null;
  }

  const orderSheets = Math.ceil(list.length / 2);
  const hasSummary = list.length > 1;
  const sheets = orderSheets + (hasSummary ? 1 : 0);
  const pages = buildPrintPagesHtml(list);
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/>
<title>Phiếu giao A6 (${list.length} đơn · ${sheets} tờ)</title>
<style>${A6_PRINT_CSS}</style>
</head><body>${pages}</body></html>`;

  let iframe = document.getElementById("print-frame");
  if (!(iframe instanceof HTMLIFrameElement)) {
    iframe = document.createElement("iframe");
    iframe.id = "print-frame";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("title", "In phiếu");
    iframe.style.cssText =
      "position:fixed;width:0;height:0;border:0;clip:rect(0,0,0,0);overflow:hidden";
    document.body.appendChild(iframe);
  }

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    toast("Không mở được bản in");
    return null;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const waitImages = () => {
    const imgs = [...(doc.images || [])];
    if (!imgs.length) return Promise.resolve();
    return Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }),
      ),
    );
  };

  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      toast("Không in được — thử lại");
    }
  };
  // Đợi QR/layout xong rồi mới print
  requestAnimationFrame(() => {
    waitImages().then(() => setTimeout(runPrint, 80));
  });

  toast(
    list.length > 1
      ? `${list.length} đơn · ${sheets} tờ A6 (1 tổng kết + ${orderSheets} phiếu)`
      : "In phiếu đơn A6",
  );
  return list.map((o) => o.id);
}

function openPrintConfirm(ids) {
  pendingPrintIds = [...new Set(ids.filter(Boolean))];
  if (!pendingPrintIds.length) return;
  const n = pendingPrintIds.length;
  const orderSheets = Math.ceil(n / 2);
  const title = $("print-confirm-title");
  const text = $("print-confirm-text");
  if (title) title.textContent = n > 1 ? `In ${n} phiếu đơn?` : "In phiếu đơn?";
  if (text) {
    text.textContent =
      n > 1
        ? `Xác nhận in ${n} đơn đã chọn (1 tờ tổng kết + ${orderSheets} tờ phiếu). In xong sẽ chuyển sang Đã giao.`
        : "Xác nhận in phiếu đơn. In xong sẽ chuyển sang Đã giao.";
  }
  document.body.classList.add("confirm-open");
  printConfirmModal?.classList.remove("hidden");
  printConfirmModal?.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("confirm-print-order")?.focus());
}

function closePrintConfirm() {
  pendingPrintIds = [];
  printConfirmModal?.classList.add("hidden");
  printConfirmModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-open");
  lockBody(false);
}

let printBusy = false;

/** In phiếu rồi chuyển đơn chưa giao → đã giao (in = giao) */
async function printOrdersAndMarkDone(ids) {
  if (printBusy) return;
  printBusy = true;
  try {
    const printedIds = exportOrdersPdfA6(ids);
    if (!printedIds?.length) return;
    const toMark = printedIds.filter((id) => {
      const o = ordersCache.find((x) => x.id === id);
      return o && isOpenStatus(o.status);
    });
    if (!toMark.length) return;
    // Trì hoãn cập nhật status/render — tránh đụng lúc iframe đang in
    await new Promise((r) => setTimeout(r, 400));
    await setOrdersStatusBulk(toMark, "done", { silent: true, setPrinted: true });
    toast(
      toMark.length > 1
        ? `Đã in · ${toMark.length} đơn sang Đã giao`
        : "Đã in · đơn sang Đã giao",
    );
  } finally {
    printBusy = false;
  }
}

function updateOrderFilterCounts() {
  const open = ordersCache.filter((o) => isOpenStatus(o.status)).length;
  const done = doneOrdersCache.length;
  const openIds = new Set(
    ordersCache.filter((o) => isOpenStatus(o.status)).map((o) => o.id),
  );
  let all = open;
  for (const o of doneOrdersCache) {
    if (!openIds.has(o.id)) all += 1;
  }
  const countPending = $("count-pending");
  const countDone = $("count-done");
  const countAll = $("count-all");
  if (countPending) countPending.textContent = String(open);
  if (countDone) countDone.textContent = String(done);
  if (countAll) countAll.textContent = String(all);
  if (open > 0) {
    ordersBadge.textContent = String(open);
    ordersBadge.classList.remove("hidden");
  } else {
    ordersBadge.classList.add("hidden");
  }
  document.querySelectorAll("#tab-orders .order-filter").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-order-filter") === orderFilter,
    );
  });
  updateBulkBar();
}

function slotRank(slot) {
  if (slot === "trua") return 0;
  if (slot === "chieu") return 1;
  return 2;
}

function sortOrders(list) {
  return [...list].sort((a, b) => {
    const da = String(a.delivery_date || "");
    const db = String(b.delivery_date || "");
    if (da !== db) {
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    }
    // Trưa trước, chiều sau
    const slotDiff = slotRank(a.delivery_slot) - slotRank(b.delivery_slot);
    if (slotDiff !== 0) return slotDiff;
    // Chưa giao (pending/printed) trước, đã giao sau
    const st = statusRank(a.status) - statusRank(b.status);
    if (st !== 0) return st;
    // Trong cùng trạng thái: đơn sớm nhất lên trên
    return Number(a.created_at) - Number(b.created_at);
  });
}

/** Mới giao trước (delivered_at → printed_at → created_at) */
function sortDoneOrders(list) {
  return [...list].sort((a, b) => {
    const ta =
      Number(a.delivered_at) ||
      Number(a.printed_at) ||
      Number(a.created_at) ||
      0;
    const tb =
      Number(b.delivered_at) ||
      Number(b.printed_at) ||
      Number(b.created_at) ||
      0;
    return tb - ta;
  });
}

function findOrder(id) {
  return (
    ordersCache.find((o) => o.id === id) ||
    doneOrdersCache.find((o) => o.id === id) ||
    null
  );
}

/** Đồng bộ một đơn vào doneOrdersCache theo status hiện tại */
function syncDoneOrdersCache(order) {
  if (!order?.id) return;
  if (normalizeStatus(order.status) === "done") {
    doneOrdersCache = sortDoneOrders([
      order,
      ...doneOrdersCache.filter((o) => o.id !== order.id),
    ]);
  } else {
    doneOrdersCache = doneOrdersCache.filter((o) => o.id !== order.id);
  }
}

/** Đưa đơn pending trở lại board upcoming nếu chưa có */
function ensureOrderOnBoard(order) {
  if (!order?.id) return;
  const idx = ordersCache.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    ordersCache[idx] = order;
    ordersCache = sortOrders(ordersCache);
    return;
  }
  if (isOpenStatus(order.status)) {
    ordersCache = sortOrders([...ordersCache, order]);
  }
}

/** Danh sách hiển thị theo tab lọc */
function boardOrdersForFilter() {
  if (orderFilter === "done") return doneOrdersCache;
  if (orderFilter === "pending") {
    return ordersCache.filter((o) => isOpenStatus(o.status));
  }
  const open = sortOrders(ordersCache.filter((o) => isOpenStatus(o.status)));
  const openIds = new Set(open.map((o) => o.id));
  return [...open, ...doneOrdersCache.filter((o) => !openIds.has(o.id))];
}

/** Cập nhật board upcoming (nếu có list) rồi vẽ lại */
function renderOrders(orders) {
  const day = vnDayKey();
  if (ordersFetchedDay && ordersFetchedDay !== day) {
    ordersFetchedDay = "";
    loadOrders().catch(() => {});
    loadDoneOrders().catch(() => {});
    return;
  }
  if (orders) {
    ordersCache = sortOrders(
      orders.map((o) => ({
        ...o,
        status: normalizeStatus(o.status),
      })),
    );
    if (!ordersFetchedDay) ordersFetchedDay = day;
    writeOrdersCache(ordersCache);
  }
  paintOrdersBoard();
}

function paintOrdersBoard() {
  updateOrderFilterCounts();
  ordersEl?.removeAttribute("aria-busy");

  const visible = boardOrdersForFilter();
  const hasAny =
    ordersCache.some((o) => isOpenStatus(o.status)) || doneOrdersCache.length > 0;

  if (!hasAny) {
    ordersEl.innerHTML = `<p class="empty">Chưa có đơn cần giao.</p>`;
    return;
  }
  if (!visible.length) {
    ordersEl.innerHTML = `<p class="empty">${
      orderFilter === "pending"
        ? "Không còn đơn chưa giao."
        : orderFilter === "done"
          ? "Chưa có đơn đã giao."
          : "Chưa có đơn cần giao."
    }</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const o of visible) {
    const el = document.createElement("article");
    const status = normalizeStatus(o.status);
    el.className = `order order-${status}`;
    el.dataset.orderId = o.id;
    const customerName = formatCustomerName(o.customer);
    const receiver = [customerName, o.phone].filter(Boolean).join(" · ");
    const orderCount = Math.max(0, Math.floor(Number(o.order_count) || 0));
    const note = (o.note || "").trim();
    const itemsHtml = (o.items || [])
      .map((i, idx) => {
        const sizeText = sizeLabel(i.size);
        const imgSrc = itemImageUrl(i);
        const thumb = imgSrc
          ? `<img class="order-item-thumb" src="${imgSrc}" alt="" width="48" height="48" decoding="async" loading="lazy" />`
          : `<div class="order-item-thumb order-item-thumb-empty" aria-hidden="true"></div>`;
        return `<div class="order-item-row">
          ${thumb}
          <div class="order-item-block">
            <p class="order-line"><span class="order-qty">${i.qty}×</span> <span class="order-name">${escapeHtml(i.name)}</span>${
              sizeText ? `<span class="order-size">${escapeHtml(sizeText)}</span>` : ""
            }</p>
            ${
              idx === 0 && note
                ? `<p class="order-meta-line"><span class="order-note">${escapeHtml(note)}</span></p>`
                : ""
            }
          </div>
        </div>`;
      })
      .join("");
    const slot = o.delivery_slot === "chieu" ? "chieu" : o.delivery_slot === "trua" ? "trua" : "";
    const slotText = slotLabel(slot);
    const dateText = deliveryDateLabel(o.delivery_date || "");
    const whenText = [dateText, slotText].filter(Boolean).join(" · ");
    const statusText = statusLabel(status);
    const checked = selectedOrderIds.has(o.id) ? "checked" : "";
    const actionBtn =
      status === "done"
        ? "Hoàn tác · Chưa giao"
        : status === "printed"
          ? `${CHECK_ICON}<span>Đánh dấu đã giao</span>`
          : `${PRINT_ICON}<span>In đơn</span>`;
    const quickDeliverBtn =
      status === "pending"
        ? `<button type="button" class="order-status-btn order-deliver-btn" data-quick-deliver="${escapeHtml(o.id)}">
            ${CHECK_ICON}<span>Đã giao</span>
          </button>`
        : "";
    const printedAtText = formatVnDateTime(o.printed_at);
    const deliveredAtText = formatVnDateTime(o.delivered_at);
    const sameStamp =
      printedAtText &&
      deliveredAtText &&
      Number(o.printed_at) > 0 &&
      Number(o.delivered_at) > 0 &&
      Math.abs(Number(o.printed_at) - Number(o.delivered_at)) < 2000;
    const timelineHtml = sameStamp
      ? `<div class="order-timeline"><span class="order-timeline-item"><em>In/Giao</em> ${escapeHtml(printedAtText)}</span></div>`
      : printedAtText || deliveredAtText
        ? `<div class="order-timeline">${
            printedAtText
              ? `<span class="order-timeline-item"><em>In</em> ${escapeHtml(printedAtText)}</span>`
              : ""
          }${
            deliveredAtText
              ? `<span class="order-timeline-item"><em>Giao</em> ${escapeHtml(deliveredAtText)}</span>`
              : ""
          }</div>`
        : "";
    el.innerHTML = `
      <header class="order-head">
        <div class="order-head-left">
          ${
            isOpenStatus(status)
              ? `<label class="order-check">
                  <input type="checkbox" data-select-order="${escapeHtml(o.id)}" ${checked} />
                  <span></span>
                </label>`
              : ""
          }
          <span class="time" title="Giờ nhận đơn">${timeFmt.format(o.created_at)}</span>
          <div class="order-badges">
            <span class="order-status order-status-${status}">${statusText}</span>
            ${
              whenText
                ? `<span class="order-slot order-slot-${slot || "none"}">${escapeHtml(whenText)}</span>`
                : ""
            }
          </div>
        </div>
        <div class="order-head-right">
          <span class="total">${vnd.format(o.total)}</span>
        </div>
      </header>
      <div class="order-main">
        <p class="order-receiver">${
          receiver
            ? `<span class="order-receiver-dot" aria-hidden="true"></span><span class="order-receiver-text">${escapeHtml(receiver)}</span>${
                orderCount > 0
                  ? `<span class="order-buy-count" title="Số lần đặt hàng">${
                      orderCount === 1 ? "lần đầu" : `${orderCount} lần`
                    }</span>`
                  : ""
              }`
            : `<span class="order-receiver-empty">Chưa có tên / SĐT</span>`
        }</p>
        <div class="order-items">${itemsHtml}</div>
        ${timelineHtml}
      </div>
      <div class="order-actions-wrap">
        <div class="order-actions${status === "pending" ? " order-actions-pending" : ""}">
          <button type="button" class="order-status-btn order-status-btn-${status}" data-toggle-status="${escapeHtml(o.id)}">
            ${actionBtn}
          </button>
          ${quickDeliverBtn}
          <button type="button" class="order-edit-icon" data-edit-order="${escapeHtml(o.id)}" aria-label="Sửa đơn">
            ${EDIT_ICON}
          </button>
          <button type="button" class="order-delete-icon" data-delete-order="${escapeHtml(o.id)}" aria-label="Xóa đơn">
            ${DELETE_ICON}
          </button>
        </div>
      </div>
    `;
    frag.appendChild(el);
  }
  ordersEl.replaceChildren(frag);
  updateBulkBar();
}

async function setOrderStatus(id, status, opts = {}) {
  if (statusBusy.has(id)) return;
  const prev = findOrder(id);
  if (!prev) return;
  const old = normalizeStatus(prev.status);
  const next = normalizeStatus(status);
  if (old === next) return;
  const setPrinted = Boolean(opts.setPrinted) && next === "done";

  const snap = {
    status: prev.status,
    printed_at: prev.printed_at ?? null,
    delivered_at: prev.delivered_at ?? null,
  };
  statusBusy.add(id);
  applyLocalTimeline(prev, next, { setPrinted });
  if (next === "done") selectedOrderIds.delete(id);
  syncDoneOrdersCache(prev);
  ensureOrderOnBoard(prev);
  if (next === "done") {
    // Board upcoming vẫn có thể giữ bản ghi done trong cửa sổ ngày — ok
    const idx = ordersCache.findIndex((o) => o.id === id);
    if (idx >= 0) ordersCache[idx] = prev;
  }
  paintOrdersBoard();

  try {
    const data = await api(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next, setPrinted }),
    });
    if (data && "printed_at" in data) prev.printed_at = data.printed_at;
    if (data && "delivered_at" in data) prev.delivered_at = data.delivered_at;
    syncDoneOrdersCache(prev);
    ensureOrderOnBoard(prev);
    paintOrdersBoard();
  } catch (err) {
    prev.status = snap.status;
    prev.printed_at = snap.printed_at;
    prev.delivered_at = snap.delivered_at;
    syncDoneOrdersCache(prev);
    ensureOrderOnBoard(prev);
    paintOrdersBoard();
    toast(err.message || "Không cập nhật được");
  } finally {
    statusBusy.delete(id);
  }
}

function openDeleteOrderModal(ids) {
  pendingDeleteOrderIds = [...new Set(ids.filter(Boolean))];
  if (!pendingDeleteOrderIds.length) return;
  const n = pendingDeleteOrderIds.length;
  $("delete-order-title").textContent = n > 1 ? `Xóa ${n} đơn` : "Xóa đơn hàng";
  $("delete-order-text").textContent =
    n > 1
      ? `Bạn sắp xóa ${n} đơn đã chọn. Hành động này không hoàn tác.`
      : "Bạn sắp xóa đơn này. Hành động này không hoàn tác.";
  deleteOrderModal.classList.remove("hidden");
  deleteOrderModal.setAttribute("aria-hidden", "false");
  lockBody(true);
}

function closeDeleteOrderModal() {
  pendingDeleteOrderIds = [];
  deleteOrderModal.classList.add("hidden");
  deleteOrderModal.setAttribute("aria-hidden", "true");
  lockBody(false);
}

function removeOrdersFromCaches(ids) {
  const drop = new Set(ids);
  ordersCache = ordersCache.filter((o) => !drop.has(o.id));
  doneOrdersCache = doneOrdersCache.filter((o) => !drop.has(o.id));
  statsOrders = statsOrders.filter((o) => !drop.has(o.id));
  for (const id of drop) selectedOrderIds.delete(id);
}

async function deleteOrders(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return;
  const snapshot = ordersCache.slice();
  const doneSnapshot = doneOrdersCache.slice();
  const statsSnapshot = statsOrders.slice();
  removeOrdersFromCaches(unique);
  paintOrdersBoard();
  if (!$("tab-stats")?.classList.contains("hidden")) renderStats();

  try {
    if (unique.length === 1) {
      await api(`/api/orders/${encodeURIComponent(unique[0])}`, { method: "DELETE" });
    } else {
      await api("/api/orders/delete-bulk", {
        method: "POST",
        body: JSON.stringify({ ids: unique }),
      });
    }
    toast(unique.length > 1 ? `Đã xóa ${unique.length} đơn` : "Đã xóa đơn");
    loadProducts().catch(() => {});
  } catch (err) {
    ordersCache = snapshot;
    doneOrdersCache = doneSnapshot;
    statsOrders = statsSnapshot;
    paintOrdersBoard();
    if (!$("tab-stats")?.classList.contains("hidden")) renderStats();
    toast(err.message || "Không xóa được");
  }
}

/**
 * @param {string[]} ids
 * @param {string} status
 * @param {{ silent?: boolean, setPrinted?: boolean }} [opts]
 */
async function setOrdersStatusBulk(ids, status, opts = {}) {
  const next = normalizeStatus(status);
  const setPrinted = Boolean(opts.setPrinted) && next === "done";
  const targets = ids
    .map((id) => findOrder(id))
    .filter((o) => o && normalizeStatus(o.status) !== next);
  if (!targets.length) return;

  const snapshot = targets.map((o) => ({
    id: o.id,
    status: o.status,
    printed_at: o.printed_at ?? null,
    delivered_at: o.delivered_at ?? null,
  }));
  for (const o of targets) {
    applyLocalTimeline(o, next, { setPrinted });
    if (next === "done") selectedOrderIds.delete(o.id);
    syncDoneOrdersCache(o);
    ensureOrderOnBoard(o);
    const idx = ordersCache.findIndex((x) => x.id === o.id);
    if (idx >= 0) ordersCache[idx] = o;
  }
  paintOrdersBoard();

  try {
    const data = await api("/api/orders/status-bulk", {
      method: "POST",
      body: JSON.stringify({
        ids: targets.map((o) => o.id),
        status: next,
        setPrinted,
      }),
    });
    // Đồng bộ mốc giờ từ server (cùng unix ms) nếu client lệch giây
    if (data?.at && (next === "printed" || next === "done")) {
      for (const o of targets) {
        const snap = snapshot.find((s) => s.id === o.id);
        if (
          (next === "printed" || setPrinted) &&
          !(Number(snap?.printed_at) > 0)
        ) {
          o.printed_at = data.at;
        }
        if (next === "done") o.delivered_at = data.at;
        syncDoneOrdersCache(o);
      }
      paintOrdersBoard();
    }
    if (!opts.silent) {
      if (next === "done") toast(`Đã giao ${targets.length} đơn`);
      else if (next === "printed") toast(`Đã in ${targets.length} đơn`);
      else toast("Đã hoàn tác");
    }
  } catch (err) {
    for (const s of snapshot) {
      const o = findOrder(s.id);
      if (!o) continue;
      o.status = s.status;
      o.printed_at = s.printed_at;
      o.delivered_at = s.delivered_at;
      syncDoneOrdersCache(o);
      ensureOrderOnBoard(o);
    }
    paintOrdersBoard();
    toast(err.message || "Không cập nhật được");
  }
}

/** Tracks active tab so boot → setTab("orders") does not double-fetch */
let activeTab = "orders";

function setTab(tab) {
  const prev = activeTab;
  activeTab = tab;
  $("tab-products").classList.toggle("hidden", tab !== "products");
  $("tab-orders").classList.toggle("hidden", tab !== "orders");
  $("tab-stats")?.classList.toggle("hidden", tab !== "stats");
  viewTitle.textContent =
    tab === "products" ? "Sản phẩm" : tab === "orders" ? "Trang chủ" : "Thống kê";
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-go") === tab);
  });
  if (tab !== "orders") {
    selectedOrderIds.clear();
    updateBulkBar();
  }
  // Only refetch when user switches into the tab (not when already there / boot)
  if (tab === "orders") {
    if (prev !== "orders") loadOrders().catch(() => {});
  } else if (tab === "products") {
    renderProductList(menuEl, { manage: true });
  } else if (tab === "stats") {
    if (prev !== "stats") {
      loadStats().catch(() => {
        const root = $("stats");
        if (root) root.innerHTML = `<p class="empty">Không tải được thống kê.</p>`;
      });
    }
  }
}

const VN_WEEKDAY_LABEL = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];
const DAY_MS = 24 * 60 * 60 * 1000;

function vnYmd(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

function vnWeekday(now = Date.now()) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    weekday: "short",
  }).format(new Date(now));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

function vnHour(now = Date.now()) {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(new Date(now))
    .find((p) => p.type === "hour")?.value;
  return Number(h) || 0;
}

function addDaysYmd(ymd, days) {
  const t = Date.parse(`${ymd}T12:00:00+07:00`) + days * DAY_MS;
  return vnYmd(t);
}

function weekdayLabelVn(ymd) {
  const t = Date.parse(`${ymd}T12:00:00+07:00`);
  return VN_WEEKDAY_LABEL[vnWeekday(t)] || ymd;
}

/** Hôm nay / Ngày mai / Thứ … */
function deliveryOptionLabel(ymd, now = Date.now()) {
  const today = vnYmd(now);
  if (ymd === today) return "Hôm nay";
  if (ymd === addDaysYmd(today, 1)) return "Ngày mai";
  return weekdayLabelVn(ymd);
}

/**
 * Mon–Sat: today → Sunday this week.
 * Sunday before 17:00: Hôm nay + next Mon–Sun.
 * Sunday from 17:00: next Mon–Sun only.
 */
function deliveryDateOptions(now = Date.now()) {
  const today = vnYmd(now);
  const wd = vnWeekday(now);
  const hour = vnHour(now);
  /** @type {Array<{ymd:string,label:string}>} */
  const opts = [];

  if (wd === 0) {
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
    opts.push({ ymd, label: deliveryOptionLabel(ymd, now) });
  }
  return opts;
}

/**
 * Before 17:00 → today.
 * From 17:00 → tomorrow if still in the list (Sunday evening → Monday).
 */
function defaultDeliveryYmd(now = Date.now()) {
  const opts = deliveryDateOptions(now);
  if (!opts.length) return vnYmd(now);
  if (vnHour(now) < 17) return opts[0].ymd;
  const today = vnYmd(now);
  if (opts[0].ymd === today && opts[1]) return opts[1].ymd;
  return opts[0].ymd;
}

function deliveryDateLabel(ymd, now = Date.now()) {
  if (!ymd) return "";
  return deliveryOptionLabel(ymd, now);
}

function slotLabel(slot) {
  if (slot === "trua") return "Trưa";
  if (slot === "chieu") return "Chiều";
  return "";
}

function selectedDeliverySlot(name = "delivery_slot") {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el instanceof HTMLInputElement ? el.value : "";
}

function setDeliverySlot(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el instanceof HTMLInputElement) el.checked = true;
}

function selectedDeliveryDate(name = "delivery_date") {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el instanceof HTMLInputElement ? el.value : "";
}

function renderDeliveryDateOptions(rootId, inputName, selectedYmd, extraYmd) {
  const root = $(rootId);
  if (!root) return;
  const opts = deliveryDateOptions();
  const chosen =
    selectedYmd ||
    defaultDeliveryYmd();
  const list = [...opts];
  if (extraYmd && /^\d{4}-\d{2}-\d{2}$/.test(extraYmd) && !list.some((o) => o.ymd === extraYmd)) {
    list.unshift({
      ymd: extraYmd,
      label: deliveryDateLabel(extraYmd),
    });
  }
  const active = list.some((o) => o.ymd === chosen) ? chosen : list[0]?.ymd || "";
  const hasRelLabel = list.some(
    (o) => o.label === "Hôm nay" || o.label === "Ngày mai",
  );
  root.innerHTML = list
    .map((o) => {
      const isSun = vnWeekday(Date.parse(`${o.ymd}T12:00:00+07:00`)) === 0;
      const wide =
        o.label === "Hôm nay" || o.label === "Ngày mai"
          ? " date-preset-wide"
          : !hasRelLabel && isSun
            ? " date-preset-wide"
            : "";
      return `<label class="slot-option date-preset${wide}">
        <input type="radio" name="${escapeHtml(inputName)}" value="${escapeHtml(o.ymd)}" ${
          o.ymd === active ? "checked" : ""
        } />
        <span>${escapeHtml(o.label)}</span>
      </label>`;
    })
    .join("");
}

function refreshEditOrderMeta() {
  const { parts, total, lines } = cartTotals(editOrderItems);
  if (editOrderMeta) {
    editOrderMeta.textContent = lines
      ? `${lines} món · ${parts} phần · ${formatVnd(total)}`
      : "Chưa có món";
  }
  const label = saveEditOrderBtn?.querySelector(".btn-label");
  if (label && !saveEditOrderBtn.classList.contains("is-busy")) {
    label.textContent = lines
      ? `Lưu thay đổi (${formatVnd(total)})`
      : "Lưu thay đổi";
  }
}

function renderEditOrderItems() {
  const root = $("edit-order-items");
  if (!root) return;
  if (!editOrderItems.length) {
    root.innerHTML = `<p class="empty compose-empty">Chưa có món — chọn bên dưới.</p>`;
    refreshEditOrderMeta();
    return;
  }
  root.closest(".compose-section")?.classList.remove("is-invalid");
  const frag = document.createDocumentFragment();
  for (const item of editOrderItems) {
    const line = {
      ...item,
      key: lineKey(item.id, item.size),
      size: normalizeSize(item.size),
    };
    frag.appendChild(renderLineRow(line, { prefix: "edit", sizeToggle: true }));
  }
  root.replaceChildren(frag);
  refreshEditOrderMeta();
}

function addToEditOrder(product) {
  const size = getSize(product.id);
  const addQty = getQty(product.id);
  const price = productUnitPrice(product, size);
  const key = lineKey(product.id, size);
  const existing = editOrderItems.find((l) => lineKey(l.id, l.size) === key);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + addQty);
    existing.price = price;
    existing.name = product.name;
    existing.image = product.image;
  } else {
    editOrderItems.push({
      id: product.id,
      name: product.name,
      size,
      qty: addQty,
      price,
      image: product.image,
    });
  }
  setQty(product.id, 1);
  renderEditOrderItems();
  toast(`+${addQty} ${product.name} (${sizeLabel(size)})`);
}

function setEditOrderLineSize(key, size) {
  const next = normalizeSize(size);
  const line = editOrderItems.find((l) => lineKey(l.id, l.size) === key);
  if (!line || normalizeSize(line.size) === next) return;
  const catalog = products.find((p) => p.id === line.id);
  const price = catalog
    ? productUnitPrice(catalog, next)
    : Number(line.price) || 0;
  const newKey = lineKey(line.id, next);
  const existing = editOrderItems.find((l) => lineKey(l.id, l.size) === newKey);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + line.qty);
    existing.price = price;
    editOrderItems = editOrderItems.filter((l) => lineKey(l.id, l.size) !== key);
  } else {
    line.size = next;
    line.price = price;
  }
  renderEditOrderItems();
}

function openEditOrderModal(order) {
  editingOrder = order;
  clearComposeInvalid(editOrderModal);
  const items = order.items || [];
  editOrderItems = items.map((item) => {
    const size = normalizeSize(item.size);
    const catalog = products.find((p) => p.id === item.id);
    return {
      id: item.id,
      name: item.name,
      size,
      qty: Math.max(1, Math.min(99, Number(item.qty) || 1)),
      price: catalog
        ? productUnitPrice(catalog, size)
        : Number(item.price) || 0,
      image: item.image || resolveItemImage(item),
    };
  });
  $("edit-order-title").textContent = "Sửa đơn hàng";
  $("edit-order-customer").value = formatCustomerName(order.customer);
  syncOptionalFields("edit", {
    phone: order.phone || "",
    note: order.note || "",
  });
  renderDeliveryDateOptions(
    "edit-delivery-date-options",
    "edit_delivery_date",
    order.delivery_date || defaultDeliveryYmd(),
    order.delivery_date || "",
  );
  setDeliverySlot(
    "edit_delivery_slot",
    order.delivery_slot === "chieu" ? "chieu" : "trua",
  );
  renderEditOrderItems();
  renderProductList(editOrderMenuEl, { manage: false });
  editOrderModal.classList.remove("hidden");
  editOrderModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("edit-order-customer")?.focus());
}

function closeEditOrderModal() {
  editingOrder = null;
  editOrderItems = [];
  if (editOrderMenuEl) editOrderMenuEl.replaceChildren();
  editOrderModal.classList.add("hidden");
  editOrderModal.setAttribute("aria-hidden", "true");
  lockBody(false);
}

function updateEditOrderLine(key, delta) {
  const line = editOrderItems.find((l) => lineKey(l.id, l.size) === key);
  if (!line) return;
  line.qty += delta;
  if (line.qty < 1) {
    editOrderItems = editOrderItems.filter((l) => lineKey(l.id, l.size) !== key);
  } else if (line.qty > 99) {
    line.qty = 99;
  }
  renderEditOrderItems();
}

function removeEditOrderLine(key) {
  editOrderItems = editOrderItems.filter((l) => lineKey(l.id, l.size) !== key);
  renderEditOrderItems();
}

function clearPreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }
}

function openEditModal(product) {
  editingProduct = product;
  pendingImageFile = null;
  clearPreviewUrl();
  editImageInput.value = "";
  $("edit-title").textContent = product.name;
  $("edit-name").value = product.name;
  $("edit-price").value = String(product.price);
  $("edit-cost").value = String(product.cost ?? 0);
  $("edit-price-large").value = String(
    product.price_large ?? product.price + 5000,
  );
  $("edit-cost-large").value = String(
    product.cost_large ?? Math.max(0, (product.cost ?? 0) + 2000),
  );
  editPreview.src = imageUrl(product);
  editModal.classList.remove("hidden");
  editModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("edit-name").focus());
}

function closeEditModal() {
  editingProduct = null;
  pendingImageFile = null;
  clearPreviewUrl();
  editModal.classList.add("hidden");
  editModal.setAttribute("aria-hidden", "true");
  lockBody(false);
}

function openDeleteModal(product) {
  deletingProduct = product;
  $("delete-title").textContent = product.name;
  $("delete-meta").textContent = `Nhỏ ${vnd.format(product.price)} · To ${vnd.format(product.price_large ?? product.price)}`;
  deleteModal.classList.remove("hidden");
  deleteModal.setAttribute("aria-hidden", "false");
  lockBody(true);
}

function closeDeleteModal() {
  deletingProduct = null;
  deleteModal.classList.add("hidden");
  deleteModal.setAttribute("aria-hidden", "true");
  lockBody(false);
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (!isForm && opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, {
    credentials: "same-origin",
    ...opts,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Lỗi mạng");
    err.status = res.status;
    throw err;
  }
  return data;
}

/** @type {Promise<void>|null} */
let productsLoadPromise = null;
/** @type {Promise<void>|null} */
let ordersLoadPromise = null;

async function loadProducts() {
  if (productsLoadPromise) return productsLoadPromise;
  productsLoadPromise = (async () => {
    const pre = await takePrefetch("products");
    const data =
      pre && Array.isArray(pre.products) ? pre : await api("/api/products");
    setProducts(data.products || []);
  })().finally(() => {
    productsLoadPromise = null;
  });
  return productsLoadPromise;
}

async function loadOrders() {
  if (ordersLoadPromise) return ordersLoadPromise;
  ordersLoadPromise = (async () => {
    const pre = await takePrefetch("orders");
    const data =
      pre && Array.isArray(pre.orders)
        ? pre
        : await api("/api/orders?range=upcoming");
    ordersFetchedDay = vnDayKey();
    renderOrders(data.orders || []);
    // Sold counts = delivery today only (not whole upcoming board)
    if (products.length) renderMenu();
  })().finally(() => {
    ordersLoadPromise = null;
  });
  return ordersLoadPromise;
}

/** Mọi đơn đã giao — tab Đã giao (mới giao lên đầu) */
async function loadDoneOrders() {
  if (doneOrdersLoadPromise) return doneOrdersLoadPromise;
  doneOrdersLoadPromise = (async () => {
    const data = await api("/api/orders?range=done");
    doneOrdersCache = sortDoneOrders(
      (data.orders || []).map((o) => ({
        ...o,
        status: normalizeStatus(o.status),
      })),
    );
    paintOrdersBoard();
  })().finally(() => {
    doneOrdersLoadPromise = null;
  });
  return doneOrdersLoadPromise;
}

function syncStatsRangeButtons() {
  document.querySelectorAll("[data-stats-range]").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-stats-range") === statsRange,
    );
  });
}

function statsLoadingHtml() {
  return `<div class="loading-state" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true"></span>
    <p>Đang tải thống kê...</p>
  </div>`;
}

async function loadStats() {
  const root = $("stats");
  if (root) root.innerHTML = statsLoadingHtml();
  syncStatsRangeButtons();
  const data = await api(`/api/orders?range=${encodeURIComponent(statsRange)}`);
  statsOrders = data.orders || [];
  renderStats();
}

function setStatsRange(next) {
  if (!STATS_RANGE_LABEL[next]) return;
  statsRange = next;
  document.querySelectorAll("[data-stats-range]").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-stats-range") === next,
    );
  });
  loadStats().catch(() => {
    const root = $("stats");
    if (root) root.innerHTML = `<p class="empty">Không tải được thống kê.</p>`;
  });
}

/** Show shell immediately; refresh data in background (never block paint on API) */
async function enterApp() {
  const cachedProducts = readProductCache();
  const cachedOrders = readOrdersCache();

  if (cachedProducts?.length) {
    setProducts(cachedProducts, { cache: false });
  }
  if (cachedOrders) {
    ordersFetchedDay = vnDayKey();
    renderOrders(cachedOrders);
  } else {
    showOrdersSkeleton();
  }

  revealApp();

  try {
    // Orders first for home; products in parallel (cached menu already painted)
    await Promise.all([loadOrders(), loadDoneOrders(), loadProducts()]);
  } catch {
    if (!ordersCache.length && !doneOrdersCache.length) {
      ordersEl.innerHTML = `<p class="empty">Không tải được đơn.</p>`;
    }
  }
}

async function refreshData() {
  const btn = $("refresh");
  if (btn?.disabled) return;
  const tab =
    document.querySelector(".tab.active")?.getAttribute("data-go") || "products";
  if (btn) {
    btn.disabled = true;
    btn.classList.add("is-loading");
  }
  try {
    if (tab === "stats") {
      await Promise.all([loadProducts(), loadStats()]);
    } else if (tab === "orders") {
      await Promise.all([loadOrders(), loadDoneOrders(), loadProducts()]);
    } else {
      await Promise.all([loadProducts(), loadOrders(), loadDoneOrders()]);
    }
    toast("Đã cập nhật");
  } catch (err) {
    toast(err.message || "Không tải được");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  }
}

function boot() {
  return enterApp();
}

$("refresh")?.addEventListener("click", () => {
  refreshData();
});

document.querySelector(".tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-go]");
  if (!btn) return;
  setTab(btn.getAttribute("data-go"));
});

document.querySelector(".stats-filters")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-stats-range]");
  if (!btn) return;
  setStatsRange(btn.getAttribute("data-stats-range"));
});

document.querySelector("#tab-orders .order-filters")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-order-filter]");
  if (!btn) return;
  const next = btn.getAttribute("data-order-filter");
  if (next !== "pending" && next !== "done" && next !== "all") return;
  orderFilter = next;
  if (next === "done") selectedOrderIds.clear();
  paintOrdersBoard();
});

$("bulk-select-all")?.addEventListener("click", () => {
  const openIds = openVisibleIds();
  const allSelected =
    openIds.length > 0 && openIds.every((id) => selectedOrderIds.has(id));
  if (allSelected) {
    selectedOrderIds.clear();
  } else {
    for (const id of openIds) selectedOrderIds.add(id);
  }
  paintOrdersBoard();
});

$("bulk-clear")?.addEventListener("click", () => {
  selectedOrderIds.clear();
  paintOrdersBoard();
});

$("bulk-export-pdf")?.addEventListener("click", () => {
  const ids = [...selectedOrderIds];
  if (!ids.length) {
    toast("Chọn ít nhất 1 đơn để in");
    return;
  }
  openPrintConfirm(ids);
});

$("bulk-deliver")?.addEventListener("click", () => {
  const ids = [...selectedOrderIds];
  if (!ids.length) return;
  const openIds = ids.filter((id) => {
    const o = findOrder(id);
    return o && isOpenStatus(o.status);
  });
  if (!openIds.length) {
    toast("Không có đơn chưa giao trong lựa chọn");
    return;
  }
  openDeliverConfirm(openIds);
});

function openDeliverConfirm(ids) {
  pendingDeliverIds = [...new Set(ids.filter(Boolean))];
  if (!pendingDeliverIds.length) return;
  const n = pendingDeliverIds.length;
  const title = $("deliver-confirm-title");
  const text = $("deliver-confirm-text");
  if (title) {
    title.textContent =
      n > 1 ? `Đánh dấu ${n} đơn đã giao?` : "Đánh dấu đã giao?";
  }
  if (text) {
    text.textContent =
      n > 1
        ? `Xác nhận đánh dấu ${n} đơn đã chọn là đã giao (không in phiếu).`
        : "Xác nhận đánh dấu đơn này là đã giao (không in phiếu).";
  }
  document.body.classList.add("confirm-open");
  deliverConfirmModal?.classList.remove("hidden");
  deliverConfirmModal?.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("confirm-deliver-order")?.focus());
}

function closeDeliverConfirm() {
  pendingDeliverIds = [];
  deliverConfirmModal?.classList.add("hidden");
  deliverConfirmModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-open");
  lockBody(false);
}

$("confirm-deliver-order")?.addEventListener("click", () => {
  const ids = pendingDeliverIds.slice();
  closeDeliverConfirm();
  if (ids.length) setOrdersStatusBulk(ids, "done");
});

deliverConfirmModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (
    t.hasAttribute("data-close-deliver-confirm") ||
    t.closest("[data-close-deliver-confirm]")
  ) {
    closeDeliverConfirm();
  }
});

$("confirm-print-order")?.addEventListener("click", async () => {
  const ids = pendingPrintIds.slice();
  closePrintConfirm();
  if (ids.length) await printOrdersAndMarkDone(ids);
});

printConfirmModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (
    t.hasAttribute("data-close-print-confirm") ||
    t.closest("[data-close-print-confirm]")
  ) {
    closePrintConfirm();
  }
});

$("bulk-delete")?.addEventListener("click", () => {
  const ids = [...selectedOrderIds];
  if (!ids.length) return;
  openDeleteOrderModal(ids);
});

$("confirm-delete-order")?.addEventListener("click", async () => {
  const ids = pendingDeleteOrderIds.slice();
  closeDeleteOrderModal();
  await deleteOrders(ids);
});

deleteOrderModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.hasAttribute("data-close-delete-order") || t.closest("[data-close-delete-order]")) {
    closeDeleteOrderModal();
  }
});

ordersEl.addEventListener("change", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || !t.matches("[data-select-order]")) return;
  const id = t.getAttribute("data-select-order");
  if (!id) return;
  if (t.checked) selectedOrderIds.add(id);
  else selectedOrderIds.delete(id);
  updateBulkBar();
});

ordersEl.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest("[data-select-order]") || t.closest(".order-check")) return;
  const quickDeliverBtn = t.closest("[data-quick-deliver]");
  if (quickDeliverBtn) {
    const id = quickDeliverBtn.getAttribute("data-quick-deliver");
    if (id) setOrderStatus(id, "done");
    return;
  }
  const statusBtn = t.closest("[data-toggle-status]");
  if (statusBtn) {
    const id = statusBtn.getAttribute("data-toggle-status");
    const order = findOrder(id);
    if (!order || !id) return;
    const cur = normalizeStatus(order.status);
    if (cur === "pending") {
      openPrintConfirm([id]);
    } else if (cur === "printed") {
      // Đơn cũ còn trạng thái đã in → đánh dấu giao nốt
      setOrderStatus(id, "done");
    } else {
      // Hoàn tác giao → chưa giao
      setOrderStatus(id, "pending");
    }
    return;
  }
  const editBtn = t.closest("[data-edit-order]");
  if (editBtn) {
    const id = editBtn.getAttribute("data-edit-order");
    const order = findOrder(id);
    if (order) openEditOrderModal(order);
    return;
  }
  const deleteBtn = t.closest("[data-delete-order]");
  if (deleteBtn) {
    const id = deleteBtn.getAttribute("data-delete-order");
    if (id) openDeleteOrderModal([id]);
  }
});

menuEl.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const editBtn = t.closest("[data-edit]");
  if (editBtn) {
    const id = editBtn.getAttribute("data-edit");
    const product = products.find((p) => p.id === id);
    if (product) openEditModal(product);
    return;
  }
  const deleteBtn = t.closest("[data-delete]");
  if (deleteBtn) {
    const id = deleteBtn.getAttribute("data-delete");
    const product = products.find((p) => p.id === id);
    if (product) openDeleteModal(product);
  }
});

orderModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t instanceof HTMLElement && t.hasAttribute("data-close-order")) {
    closeOrderModal();
  }
});

editOrderModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t instanceof HTMLElement && t.hasAttribute("data-close-edit-order")) {
    closeEditOrderModal();
  }
});

editModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t instanceof HTMLElement && t.hasAttribute("data-close-edit")) {
    closeEditModal();
  }
});

deleteModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t instanceof HTMLElement && t.hasAttribute("data-close-delete")) {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!deliverConfirmModal?.classList.contains("hidden")) closeDeliverConfirm();
  else if (!printConfirmModal?.classList.contains("hidden")) closePrintConfirm();
  else if (!deleteOrderModal?.classList.contains("hidden")) closeDeleteOrderModal();
  else if (!deleteModal.classList.contains("hidden")) closeDeleteModal();
  else if (!editOrderModal.classList.contains("hidden")) closeEditOrderModal();
  else if (!editModal.classList.contains("hidden")) closeEditModal();
  else if (!orderModal.classList.contains("hidden")) closeOrderModal();
});

$("edit-order-items")?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const sizeBtn = t.closest("[data-edit-size]");
  if (sizeBtn) {
    const key = sizeBtn.getAttribute("data-edit-size");
    const size = sizeBtn.getAttribute("data-size");
    if (key && size) setEditOrderLineSize(key, size);
    return;
  }
  const minus = t.closest("[data-edit-minus]")?.getAttribute("data-edit-minus");
  const plus = t.closest("[data-edit-plus]")?.getAttribute("data-edit-plus");
  const remove = t.closest("[data-edit-remove]")?.getAttribute("data-edit-remove");
  if (minus) updateEditOrderLine(minus, -1);
  else if (plus) updateEditOrderLine(plus, 1);
  else if (remove) removeEditOrderLine(remove);
});

editOrderMenuEl?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const sizeBtn = t.closest("[data-size-for]");
  if (sizeBtn) {
    const id = sizeBtn.getAttribute("data-size-for");
    const size = sizeBtn.getAttribute("data-size");
    if (id && size) setSize(id, size);
    return;
  }
  const el = t.closest("[data-plus],[data-minus],[data-add]");
  if (!(el instanceof HTMLElement)) return;
  const plus = el.getAttribute("data-plus");
  const minus = el.getAttribute("data-minus");
  const add = el.getAttribute("data-add");
  if (plus) setQty(plus, getQty(plus) + 1);
  if (minus) setQty(minus, getQty(minus) - 1);
  if (add) {
    const product = products.find((p) => p.id === add);
    if (product) addToEditOrder(product);
  }
});

$("edit-order-customer")?.addEventListener("input", () => {
  $("edit-order-customer")?.closest(".field")?.classList.remove("is-invalid");
});

$("edit-order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingOrder) return;
  const nameEl = $("edit-order-customer");
  const customer = formatCustomerName(nameEl?.value || "");
  if (!customer) {
    showComposeIssue(nameEl, "Nhập tên khách hàng");
    return;
  }
  if (!editOrderItems.length) {
    showComposeIssue(
      $("edit-order-items")?.closest(".compose-section") || $("edit-order-items"),
      "Đơn phải còn ít nhất 1 món",
    );
    return;
  }
  const delivery_slot = selectedDeliverySlot("edit_delivery_slot");
  if (delivery_slot !== "trua" && delivery_slot !== "chieu") {
    toast("Chọn giao trưa hoặc giao chiều");
    return;
  }
  const delivery_date =
    selectedDeliveryDate("edit_delivery_date") || defaultDeliveryYmd();
  const label = saveEditOrderBtn?.querySelector(".btn-label");
  saveEditOrderBtn.disabled = true;
  saveEditOrderBtn.classList.add("is-busy");
  if (label) label.textContent = "Đang lưu...";
  try {
    await api(`/api/orders/${encodeURIComponent(editingOrder.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        items: editOrderItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          size: normalizeSize(item.size),
          image: item.image || resolveItemImage(item),
          qty: item.qty,
        })),
        delivery_slot,
        delivery_date,
        customer,
        phone: $("edit-order-phone").value.trim(),
        note: $("edit-order-note").value.trim(),
      }),
    });
    clearComposeInvalid(editOrderModal);
    closeEditOrderModal();
    toast("Đã cập nhật đơn");
    await Promise.all([loadOrders(), loadProducts()]);
  } catch (err) {
    toast(err.message || "Không lưu được");
  } finally {
    saveEditOrderBtn.disabled = false;
    saveEditOrderBtn.classList.remove("is-busy");
    refreshEditOrderMeta();
  }
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!deletingProduct) return;
  const id = deletingProduct.id;
  confirmDeleteBtn.disabled = true;
  try {
    await api(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    setProducts(products.filter((p) => p.id !== id));
    qtyMap.delete(id);
    sizeMap.delete(id);
    closeDeleteModal();
    toast("Đã xóa sản phẩm");
  } catch (err) {
    toast(err.message || "Không xóa được");
  } finally {
    confirmDeleteBtn.disabled = false;
  }
});

editImageInput.addEventListener("change", () => {
  const file = editImageInput.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast("Ảnh tối đa 2MB");
    editImageInput.value = "";
    return;
  }
  pendingImageFile = file;
  clearPreviewUrl();
  previewObjectUrl = URL.createObjectURL(file);
  editPreview.src = previewObjectUrl;
});

document.querySelectorAll("[data-open-create-order]").forEach((btn) => {
  btn.addEventListener("click", () => openCreateOrder());
});

$("show-order-phone")?.addEventListener("click", () => {
  revealOptionalField("create", "phone");
});

$("show-order-note")?.addEventListener("click", () => {
  revealOptionalField("create", "note");
});

$("show-edit-order-phone")?.addEventListener("click", () => {
  revealOptionalField("edit", "phone");
});

$("show-edit-order-note")?.addEventListener("click", () => {
  revealOptionalField("edit", "note");
});

$("cart-clear")?.addEventListener("click", () => {
  clearCart();
  toast("Đã xóa món trong đơn");
});

orderCartLinesEl?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const minus = t.closest("[data-cart-minus]")?.getAttribute("data-cart-minus");
  const plus = t.closest("[data-cart-plus]")?.getAttribute("data-cart-plus");
  const remove = t.closest("[data-cart-remove]")?.getAttribute("data-cart-remove");
  if (minus) updateCartLine(minus, -1);
  else if (plus) updateCartLine(plus, 1);
  else if (remove) removeCartLine(remove);
});

orderMenuEl?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const sizeBtn = t.closest("[data-size-for]");
  if (sizeBtn) {
    const id = sizeBtn.getAttribute("data-size-for");
    const size = sizeBtn.getAttribute("data-size");
    if (id && size) setSize(id, size);
    return;
  }
  const el = t.closest("[data-plus],[data-minus],[data-add]");
  if (!(el instanceof HTMLElement)) return;
  const plus = el.getAttribute("data-plus");
  const minus = el.getAttribute("data-minus");
  const add = el.getAttribute("data-add");
  if (plus) setQty(plus, getQty(plus) + 1);
  if (minus) setQty(minus, getQty(minus) - 1);
  if (add) {
    const product = products.find((p) => p.id === add);
    if (product) addToCart(product);
  }
});

$("customer-name")?.addEventListener("input", () => {
  $("customer-name")?.closest(".field")?.classList.remove("is-invalid");
});

$("order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameEl = $("customer-name");
  const customer = formatCustomerName(nameEl?.value || "");
  if (!customer) {
    showComposeIssue(nameEl, "Nhập tên khách hàng");
    return;
  }
  if (!cart.length) {
    showComposeIssue(
      $("order-menu")?.closest(".compose-section") || $("order-menu"),
      "Thêm ít nhất 1 món vào đơn",
    );
    return;
  }
  const delivery_slot = selectedDeliverySlot();
  if (delivery_slot !== "trua" && delivery_slot !== "chieu") {
    toast("Chọn giao trưa hoặc giao chiều");
    return;
  }
  const delivery_date =
    selectedDeliveryDate("delivery_date") || defaultDeliveryYmd();
  const items = cart.map((line) => ({
    id: line.id,
    name: line.name,
    price: line.price,
    size: line.size,
    image: line.image,
    qty: line.qty,
  }));
  const label = saveBtn.querySelector(".btn-label");
  saveBtn.disabled = true;
  saveBtn.classList.add("is-busy");
  if (label) label.textContent = "Đang tạo...";
  try {
    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        items,
        delivery_slot,
        delivery_date,
        customer,
        phone: $("customer-phone").value.trim(),
        note: $("order-note").value.trim(),
      }),
    });
    cart = [];
    clearComposeInvalid(orderModal);
    closeOrderModal();
    toast("Đã tạo đơn");
    await Promise.all([loadOrders(), loadProducts()]);
  } catch (err) {
    toast(err.message || "Không tạo được đơn");
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove("is-busy");
    updateComposeMeta();
  }
});

$("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingProduct) return;

  const id = editingProduct.id;
  const name = $("edit-name").value.trim();
  const price = Math.floor(Number($("edit-price").value));
  const cost = Math.floor(Number($("edit-cost").value));
  const price_large = Math.floor(Number($("edit-price-large").value));
  const cost_large = Math.floor(Number($("edit-cost-large").value));
  if (
    !name ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(cost) ||
    cost < 0 ||
    !Number.isFinite(price_large) ||
    price_large < 0 ||
    !Number.isFinite(cost_large) ||
    cost_large < 0
  ) {
    toast("Thông tin chưa hợp lệ");
    return;
  }

  const form = new FormData();
  form.set("name", name);
  form.set("price", String(price));
  form.set("cost", String(cost));
  form.set("price_large", String(price_large));
  form.set("cost_large", String(cost_large));
  if (pendingImageFile) form.set("image", pendingImageFile);

  const label = saveProductBtn.querySelector(".btn-label");
  const idleLabel = label?.textContent || "Lưu sản phẩm";
  saveProductBtn.disabled = true;
  saveProductBtn.classList.add("is-busy");
  if (label) label.textContent = "Đang lưu...";
  try {
    const data = await api(`/api/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: form,
    });
    const next = products.map((p) => (p.id === id ? data.product : p));
    setProducts(next);
    closeEditModal();
    toast("Đã cập nhật sản phẩm");
  } catch (err) {
    toast(err.message || "Không lưu được");
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.classList.remove("is-busy");
    if (label) label.textContent = idleLabel;
  }
});

boot();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshOrdersIfDayChanged();
});
window.addEventListener("focus", () => refreshOrdersIfDayChanged());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore SW failures — app still works online */
    });
  });
}
