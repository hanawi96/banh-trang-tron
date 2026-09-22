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
const unpaidConfirmModal = $("unpaid-confirm-modal");
const deliverConfirmModal = $("deliver-confirm-modal");
const prepareModal = $("prepare-modal");
const deliveredListModal = $("delivered-list-modal");
const statsDateModal = $("stats-date-modal");
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
const STATS_CACHE_KEY = "bt_stats_v1";

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
let statsPayload = null;
/** Cache key of current statsPayload */
let statsPayloadKey = "";
const STATS_MODAL_PAGE_SIZE = 15;
/** @type {any[]} */
let statsModalOrders = [];
/** @type {'delivered'|'received'} */
let statsModalTimeKind = "delivered";
let statsModalPage = 1;
let statsModalTotal = 0;
let statsModalTotalPages = 1;
/** @type {{ kind: string, village: string, title: string, meta: string }|null} */
let statsModalQuery = null;
/** @type {Promise<void>|null} */
let statsLoadPromise = null;
/** Key currently being fetched by statsLoadPromise */
let statsLoadingKey = "";
/** @type {'today'|'yesterday'|'7d'|'30d'|'custom'} */
let statsRange = "today";
/** @type {string|null} YYYY-MM-DD */
let statsCustomFrom = null;
/** @type {string|null} YYYY-MM-DD */
let statsCustomTo = null;
/** @type {'day'|'range'} */
let statsDateMode = "day";
/** First day of visible calendar month YYYY-MM-DD */
let statsCalMonthYmd = "";
/** Draft selection in date modal */
let statsPickFrom = "";
let statsPickTo = "";
/** @type {'pending'|'done'} — pending = chưa giao (pending|printed) */
let orderFilter = "pending";
/** Lọc hôm nay trong tab đã giao */
let doneTodayFilter = false;
/** Phân trang tab Đã giao — mỗi trang lấy từ server */
const DONE_PAGE_SIZE = 15;
let donePage = 1;
let doneTotalPages = 1;
/** Tổng đơn đã giao (mọi ngày) — số trên nút, không cần tải hết đơn */
let doneCount = 0;
/** Tổng của truy vấn tab Đã giao hiện tại (có thể là chỉ hôm nay) */
let doneTotal = 0;
/** Số đơn chưa giao do server đếm; null khi còn đang dùng cache máy */
let serverOpenCount = null;
let doneLoadSeq = 0;
let doneLoading = false;
/** Kết quả tìm tên; null khi không tìm */
let searchHits = null;
let searchSeq = 0;
let searchTimer = 0;
/** Chuỗi tìm đơn theo tên khách (đã trim) */
let orderSearchQuery = "";
let orderSearchRaf = 0;
/** @type {Set<string>} */
const statusBusy = new Set();
/** @type {Set<string>} */
const selectedOrderIds = new Set();
const PRINT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" /></svg>`;
/** @type {any} */
let editingProduct = null;
/** true = form đang ở chế độ thêm SP mới */
let creatingProduct = false;
/** @type {any} */
let deletingProduct = null;
/** @type {any} */
let editingOrder = null;
/** true = form sửa đang nhân bản → POST tạo đơn mới */
let cloningOrder = false;
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
const CLONE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
const PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`;
const UNDO_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>`;

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
    // Hoàn tác giao → đơn về chưa giao thì trạng thái thanh toán cũng phải bỏ
    // (tránh đơn "chưa giao" mà vẫn hiển thị Đã CK)
    order.paid_at = null;
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

/** Bỏ dấu tiếng Việt để tìm tên nhanh, không phân biệt hoa thường */
function foldVn(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function matchesCustomerSearch(order, queryFolded) {
  if (!queryFolded) return true;
  return foldVn(order?.customer).includes(queryFolded);
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

/** Kiểm tra order có delivered_at vào ngày hôm nay (theo giờ VN) */
function isDeliveredToday(order) {
  if (!order.delivered_at) return false;
  return vnDayKey(Number(order.delivered_at)) === vnDayKey();
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

function statsCacheKey() {
  if (statsRange === "custom" && statsCustomFrom && statsCustomTo) {
    return `custom:${statsCustomFrom}:${statsCustomTo}`;
  }
  return String(statsRange || "today");
}

function readStatsCache(key) {
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.day !== vnDayKey() || data.key !== key || !data.payload) {
      return null;
    }
    return data.payload;
  } catch {
    return null;
  }
}

function writeStatsCache(key, payload) {
  try {
    localStorage.setItem(
      STATS_CACHE_KEY,
      JSON.stringify({ day: vnDayKey(), key, payload }),
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
  if (orderFilter === "done") {
    loadDoneOrders({ page: 1 }).catch(() => {});
  }
}

function showOrdersSkeleton() {
  if (!ordersEl) return;
  ordersEl.setAttribute("aria-busy", "true");
  ordersEl.innerHTML = `<div class="loading-state" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true"></span>
    <p>Đang tải đơn hàng</p>
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
  setTab(tabFromLocation());
  finishBoot();
}

const STATS_RANGE_LABEL = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
};

function formatYmdVn(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(ymd || "");
  return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
}

function statsPeriodLabel() {
  if (statsRange === "custom" && statsCustomFrom && statsCustomTo) {
    if (statsCustomFrom === statsCustomTo) {
      return formatYmdVn(statsCustomFrom);
    }
    return `${formatYmdVn(statsCustomFrom)} – ${formatYmdVn(statsCustomTo)}`;
  }
  return STATS_RANGE_LABEL[statsRange] || "Hôm nay";
}

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

function emptyStatsHtml(label, detail) {
  const bars = [42, 68, 30, 54, 36]
    .map((h) => `<span style="--h:${h}%"></span>`)
    .join("");
  return `
    <p class="stats-kicker">${escapeHtml(label)} · theo ngày giao thành công · giờ VN</p>
    <article class="stats-empty-card">
      <div class="stats-empty-chart" aria-hidden="true">${bars}</div>
      <h3>Chưa có số liệu</h3>
      <p>${detail}</p>
      <div class="stats-empty-metrics" aria-hidden="true">
        <div><span>Doanh thu</span><strong>—</strong></div>
        <div><span>Đã giao</span><strong>0</strong></div>
        <div><span>Lãi ước tính</span><strong>—</strong></div>
      </div>
    </article>`;
}

function renderStats() {
  const root = $("stats");
  if (!root) return;
  const label = statsPeriodLabel();
  const s = statsPayload;
  if (!s) {
    root.innerHTML = emptyStatsHtml(label, "Chưa có dữ liệu thống kê.");
    return;
  }

  const deliveredCount = Number(s.deliveredCount) || 0;
  const revenue = Number(s.revenue) || 0;
  const profit = Number(s.profit) || 0;
  const receivedCount = Number(s.receivedCount) || 0;
  const openCount = Number(s.openCount) || 0;
  const topProducts = Array.isArray(s.topProducts) ? s.topProducts : [];

  if (!deliveredCount && !receivedCount && !openCount) {
    root.innerHTML = emptyStatsHtml(
      label,
      `Chưa có đơn đã giao trong khoảng “${escapeHtml(label)}”.`,
    );
    return;
  }

  const topHtml = topProducts.length
    ? topProducts
        .map((p, i) => {
          const imgPath = imagesPath(p.image);
          const catalog = p.id
            ? products.find((x) => x.id === p.id)
            : null;
          const imgSrc =
            (catalog && imageUrl(catalog)) ||
            (imgPath ? imgPath : "");
          const sizeText = p.sizeLabel || sizeLabel(p.size);
          const thumb = imgSrc
            ? `<img class="stats-sold-thumb" src="${escapeHtml(imgSrc)}" alt="" width="56" height="56" decoding="async" loading="lazy" />`
            : `<div class="stats-sold-thumb stats-sold-thumb-empty" aria-hidden="true"></div>`;
          return `
        <article class="stats-sold-row">
          <div class="stats-sold-media">
            ${thumb}
            <span class="stats-sold-rank">#${i + 1}</span>
          </div>
          <div class="stats-sold-body">
            <div class="stats-sold-title">
              <strong>${escapeHtml(p.name || "Món")}</strong>
              ${
                sizeText
                  ? `<span class="stats-sold-size">${escapeHtml(sizeText)}</span>`
                  : ""
              }
            </div>
            <div class="stats-sold-meta">
              <span>${p.qty} suất</span>
              <span class="stats-sold-dot" aria-hidden="true">·</span>
              <span class="stats-sold-rev">${vnd.format(p.revenue)}</span>
            </div>
          </div>
        </article>`;
        })
        .join("")
    : deliveredCount
      ? `<p class="empty">Chưa có dữ liệu món.</p>`
      : `<p class="empty">Chưa có đơn đã giao để thống kê món.</p>`;

  const categoryHtml = categoryStatsHtml(s.byCategory);

  const byVillage = Array.isArray(s.byVillage) ? s.byVillage : [];
  const villageHtml = byVillage.length
    ? byVillage
        .map((v) => {
          const name = String(v.village || "—");
          const count = Number(v.count) || 0;
          const rev = Number(v.revenue) || 0;
          const tag = count > 0 ? "button" : "article";
          const clickable =
            count > 0
              ? ` type="button" class="stats-card stats-card-btn stats-village-card" data-stats-village="${escapeHtml(name)}"`
              : ` class="stats-card stats-card-muted"`;
          return `<${tag}${clickable}>
          <span>${escapeHtml(name)}</span>
          <strong>${count} <small class="stats-village-unit">đơn</small></strong>
          <small>${count ? vnd.format(rev) : "—"}</small>
        </${tag}>`;
        })
        .join("")
    : `<p class="empty">Chưa có dữ liệu thôn.</p>`;

  root.innerHTML = `
    <p class="stats-kicker">${escapeHtml(label)} · theo ngày giao thành công · giờ VN</p>
    <div class="stats-hero">
      <article class="stats-card stats-card-lg stats-card-revenue">
        <span>Doanh thu đã giao</span>
        <strong>${vnd.format(revenue)}</strong>
      </article>
      <article class="stats-card stats-card-lg stats-card-accent">
        <span>Lãi ước tính</span>
        <strong>${vnd.format(profit)}</strong>
      </article>
    </div>
    ${categoryHtml}
    <div class="stats-grid stats-grid-mgmt">
      <button type="button" class="stats-card stats-card-done stats-card-btn"${
        deliveredCount > 0 ? ` id="stats-open-delivered"` : " disabled"
      }>
        <span>Đã giao</span>
        <strong class="ok">${deliveredCount}</strong>
        <small>${deliveredCount > 0 ? "bấm để xem" : "trong kỳ"}</small>
      </button>
      <button type="button" class="stats-card stats-card-btn"${
        receivedCount > 0 ? ` id="stats-open-received"` : " disabled"
      }>
        <span>Nhận đơn</span>
        <strong>${receivedCount}</strong>
        <small>${receivedCount > 0 ? "bấm để xem" : "trong kỳ"}</small>
      </button>
      <article class="stats-card stats-card-open">
        <span>Chưa giao</span>
        <strong class="warn">${openCount}</strong>
        <small>đang còn</small>
      </article>
    </div>
    <div class="stats-section">
      <h3>Theo thôn</h3>
      <div class="stats-village-grid">${villageHtml}</div>
    </div>
    <div class="stats-section">
      <h3>Món đã bán${
        topProducts.length ? ` · ${topProducts.length}` : ""
      }</h3>
      <div class="stats-sold-list">${topHtml}</div>
    </div>
  `;
  $("stats-open-delivered")?.addEventListener("click", () => {
    openDeliveredListModal();
  });
  $("stats-open-received")?.addEventListener("click", () => {
    openReceivedListModal();
  });
  root.querySelectorAll("[data-stats-village]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openVillageOrdersModal(btn.getAttribute("data-stats-village") || "");
    });
  });
}

function categoryStatsHtml(byCategory) {
  if (!byCategory || typeof byCategory !== "object") return "";
  const banh = byCategory["banh-trang"] || {};
  const tra = byCategory["tra-sua"] || {};
  const banhRev = Number(banh.revenue) || 0;
  const traRev = Number(tra.revenue) || 0;
  const banhQty = Math.max(0, Math.floor(Number(banh.qty) || 0));
  const traQty = Math.max(0, Math.floor(Number(tra.qty) || 0));
  const sum = banhRev + traRev;
  let bar = `<div class="stats-cat-bar is-empty" aria-hidden="true"></div>`;
  let legend = `<p class="stats-cat-legend"><span>Chưa có doanh thu đã giao trong kỳ</span></p>`;
  if (sum > 0) {
    const banhPct = Math.round((banhRev / sum) * 100);
    const traPct = 100 - banhPct;
    bar = `<div class="stats-cat-bar" role="img" aria-label="Bánh tráng ${banhPct} phần trăm, trà sữa ${traPct} phần trăm">
      <span class="stats-cat-bar-banh" style="width:${banhPct}%"></span>
      <span class="stats-cat-bar-tra" style="width:${traPct}%"></span>
    </div>`;
    legend = `<p class="stats-cat-legend"><span>Bánh tráng ${banhPct}%</span><span>Trà sữa ${traPct}%</span></p>`;
  }
  const card = (cls, label, rev, profitValue, qty) => `
    <article class="stats-card stats-cat-card ${cls}">
      <span>${label}</span>
      <strong>${vnd.format(rev)}</strong>
      <small>Lãi ${vnd.format(profitValue)} · ${qty} suất</small>
    </article>`;
  return `
    <div class="stats-section stats-cat-section">
      <h3>Doanh thu theo nhóm</h3>
      <div class="stats-cat-grid">
        ${card("stats-cat-banh", "Bánh tráng", banhRev, Number(banh.profit) || 0, banhQty)}
        ${card("stats-cat-tra", "Trà sữa", traRev, Number(tra.profit) || 0, traQty)}
      </div>
      ${bar}
      ${legend}
    </div>`;
}

function openDeliveredListModal() {
  openStatsOrdersModal({
    kind: "delivered",
    village: "",
    title: "Đã giao",
    meta: `${statsPeriodLabel()} · theo giờ giao thành công (VN)`,
  });
}

function openReceivedListModal() {
  openStatsOrdersModal({
    kind: "received",
    village: "",
    title: "Nhận đơn",
    meta: `${statsPeriodLabel()} · theo giờ tạo đơn (VN)`,
  });
}

function openVillageOrdersModal(villageName) {
  const name = String(villageName || "").trim();
  if (!name) return;
  openStatsOrdersModal({
    kind: "delivered",
    village: name,
    title: name,
    meta: `${statsPeriodLabel()} · đã giao trong kỳ (VN)`,
  });
}

function statsOrdersApiUrl(page) {
  const q = statsModalQuery;
  if (!q) return "";
  const params = new URLSearchParams();
  params.set("kind", q.kind === "received" ? "received" : "delivered");
  params.set("page", String(page));
  params.set("limit", String(STATS_MODAL_PAGE_SIZE));
  if (q.village) params.set("village", q.village);
  if (statsRange === "custom" && statsCustomFrom && statsCustomTo) {
    params.set("from", statsCustomFrom);
    params.set("to", statsCustomTo);
  } else {
    params.set("range", statsRange === "custom" ? "today" : statsRange);
  }
  return `/api/stats/orders?${params.toString()}`;
}

/** @param {{ kind: 'delivered'|'received', village: string, title: string, meta: string }} opts */
function openStatsOrdersModal(opts) {
  statsModalQuery = opts;
  statsModalTimeKind = opts.kind === "received" ? "received" : "delivered";
  statsModalPage = 1;
  statsModalOrders = [];
  statsModalTotal = 0;
  statsModalTotalPages = 1;
  const titleEl = $("delivered-list-title");
  const metaEl = $("delivered-list-meta");
  if (titleEl) titleEl.textContent = opts.title;
  if (metaEl) metaEl.textContent = opts.meta;
  const listEl = $("delivered-list");
  if (listEl) {
    listEl.innerHTML = `<div class="loading-state" role="status"><span class="loading-spinner" aria-hidden="true"></span><p>Đang tải đơn...</p></div>`;
  }
  $("delivered-list-pager")?.classList.add("hidden");
  document.body.classList.add("confirm-open");
  deliveredListModal?.classList.remove("hidden");
  deliveredListModal?.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() =>
    deliveredListModal?.querySelector("[data-close-delivered-list]")?.focus(),
  );
  loadStatsOrdersModalPage(1).catch((err) => {
    toast(err.message || "Không tải được danh sách đơn");
    if (listEl) listEl.innerHTML = `<p class="empty">Không tải được danh sách.</p>`;
  });
}

async function loadStatsOrdersModalPage(page) {
  if (!statsModalQuery) return;
  const data = await api(statsOrdersApiUrl(page));
  statsModalOrders = Array.isArray(data.orders) ? data.orders : [];
  statsModalTotal = Number(data.total) || 0;
  statsModalTotalPages = Math.max(1, Number(data.totalPages) || 1);
  statsModalPage = Math.min(
    Math.max(1, Number(data.page) || page),
    statsModalTotalPages,
  );
  const titleEl = $("delivered-list-title");
  if (titleEl && statsModalQuery) {
    titleEl.textContent = `${statsModalQuery.title} · ${statsModalTotal} đơn`;
  }
  if (!statsModalTotal) {
    const listEl = $("delivered-list");
    if (listEl) listEl.innerHTML = `<p class="empty">Không có đơn trong kỳ này.</p>`;
    $("delivered-list-pager")?.classList.add("hidden");
    return;
  }
  paintStatsOrdersModalPage();
}

function paintStatsOrdersModalPage() {
  const listEl = $("delivered-list");
  const pager = $("delivered-list-pager");
  const pageEl = $("delivered-list-page");
  const prevBtn = $("delivered-list-prev");
  const nextBtn = $("delivered-list-next");
  const timeKind = statsModalTimeKind;
  const pageOrders = statsModalOrders;

  if (listEl) {
    listEl.innerHTML = pageOrders
      .map((o) => {
        const name = formatCustomerName(o.customer) || "Khách";
        const receiver = [name, (o.phone || "").trim()].filter(Boolean).join(" · ");
        const slot = o.delivery_slot === "chieu" ? "chieu" : o.delivery_slot === "trua" ? "trua" : "";
        const village = parseVillage(o.village) || (o.village ? String(o.village) : "");
        const when = [village, deliveryDateLabel(o.delivery_date || ""), slotLabel(slot)]
          .filter(Boolean)
          .join(" · ");
        const timeText =
          timeKind === "received"
            ? `Tạo ${formatVnDateTime(o.created_at) || "—"}`
            : `Giao ${formatVnDateTime(o.delivered_at) || "—"}`;
        const statusBit =
          timeKind === "received"
            ? ` · ${escapeHtml(statusLabel(normalizeStatus(o.status)))}`
            : "";
        const items = (o.items || [])
          .map((i) => {
            const sz = sizeLabel(i.size);
            return `${i.qty}× ${i.name}${sz ? ` (${sz})` : ""}`;
          })
          .join(", ");
        return `<article class="delivered-list-item">
          <header>
            <strong>${escapeHtml(receiver)}</strong>
            <span class="delivered-list-total">${vnd.format(o.total)}</span>
          </header>
          <p class="delivered-list-when">${when ? escapeHtml(when) : "—"} · ${escapeHtml(timeText)}${statusBit}</p>
          <p class="delivered-list-items">${escapeHtml(items || "Chưa có món")}</p>
        </article>`;
      })
      .join("");
    listEl.scrollTop = 0;
  }

  const showPager = statsModalTotal > STATS_MODAL_PAGE_SIZE;
  pager?.classList.toggle("hidden", !showPager);
  if (pageEl) {
    const from = (statsModalPage - 1) * STATS_MODAL_PAGE_SIZE + 1;
    const to = Math.min(statsModalTotal, from + pageOrders.length - 1);
    pageEl.textContent = `${from}–${to} / ${statsModalTotal} đơn`;
  }
  if (prevBtn instanceof HTMLButtonElement) {
    prevBtn.disabled = statsModalPage <= 1;
  }
  if (nextBtn instanceof HTMLButtonElement) {
    nextBtn.disabled = statsModalPage >= statsModalTotalPages;
  }

  // Render page number buttons
  const pagesEl = $("delivered-list-pages");
  if (!pagesEl) return;
  pagesEl.innerHTML = "";

  const total = statsModalTotalPages;
  const cur = statsModalPage;

  const buildBtn = (n, label) =>
    `<button type="button" class="done-pager-dot${n === cur ? " active" : ""}" data-goto="${n}" aria-label="Trang ${label}" aria-current="${n === cur ? "page" : "false"}">${label}</button>`;
  const buildEllipsis = () =>
    `<span class="done-pager-ellipsis" aria-hidden="true">…</span>`;

  let html = "";
  if (total <= 7) {
    for (let i = 1; i <= total; i++) html += buildBtn(i, i);
  } else if (cur <= 4) {
    html += buildBtn(1, 1);
    for (let i = 2; i <= 5; i++) html += buildBtn(i, i);
    html += buildEllipsis();
    html += buildBtn(total, total);
  } else if (cur >= total - 3) {
    html += buildBtn(1, 1);
    html += buildEllipsis();
    for (let i = total - 4; i <= total; i++) html += buildBtn(i, i);
  } else {
    html += buildBtn(1, 1);
    html += buildEllipsis();
    html += buildBtn(cur - 1, cur - 1);
    html += buildBtn(cur, cur);
    html += buildBtn(cur + 1, cur + 1);
    html += buildEllipsis();
    html += buildBtn(total, total);
  }

  pagesEl.innerHTML = html;

  pagesEl.querySelectorAll(".done-pager-dot[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.goto);
      if (target !== cur && target >= 1 && target <= total) {
        loadStatsOrdersModalPage(target).catch((err) =>
          toast(err.message || "Không tải được trang"),
        );
      }
    });
  });
}

function closeDeliveredListModal() {
  deliveredListModal?.classList.add("hidden");
  deliveredListModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-open");
  lockBody(false);
  statsModalOrders = [];
  statsModalPage = 1;
  statsModalTotal = 0;
  statsModalQuery = null;
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
    !deliverConfirmModal?.classList.contains("hidden") ||
    !prepareModal?.classList.contains("hidden") ||
    !deliveredListModal?.classList.contains("hidden") ||
    !statsDateModal?.classList.contains("hidden")
  );
}

function lockBody(lock) {
  document.body.style.overflow = lock || anyModalOpen() ? "hidden" : "";
}

/** Viết hoa chữ cái đầu mỗi từ khi hiển thị, không đổi tên đã lưu. */
function displayProductName(name) {
  return String(name || "").replace(
    /(^|\s)(\S)/gu,
    (_, space, ch) => space + ch.toLocaleUpperCase("vi"),
  );
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
        <h3>${escapeHtml(displayProductName(p.name))}</h3>
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

const CATEGORY_GROUPS = [
  { id: "banh-trang", label: "Bánh tráng" },
  { id: "tra-sua", label: "Trà sữa" },
];

function productCategory(product) {
  return product && product.category === "tra-sua" ? "tra-sua" : "banh-trang";
}

function setProductCategory(value) {
  const next = value === "tra-sua" ? "tra-sua" : "banh-trang";
  document.querySelectorAll('input[name="product_category"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = el.value === next;
  });
}

function selectedProductCategory() {
  const el = document.querySelector('input[name="product_category"]:checked');
  return el instanceof HTMLInputElement && el.value === "tra-sua"
    ? "tra-sua"
    : "banh-trang";
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
  for (const group of CATEGORY_GROUPS) {
    const items = list.filter((p) => productCategory(p) === group.id);
    if (!items.length && !manage) continue;
    const head = document.createElement("div");
    head.className = `product-group-head product-group-${group.id}`;
    head.textContent = group.label;
    frag.appendChild(head);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "product-group-empty";
      empty.textContent = "Chưa có món";
      frag.appendChild(empty);
      continue;
    }
    for (const p of items) {
      frag.appendChild(
        buildProductCard(p, {
          manage,
          sold: Math.max(0, Math.floor(Number(p.sold_count) || 0)),
        }),
      );
    }
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
    existing.category = productCategory(product);
  } else {
    cart.push({
      key,
      id: product.id,
      name: product.name,
      size,
      qty: addQty,
      price,
      image: product.image,
      category: productCategory(product),
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
  renderVillageOptions("order-village-options", "village", "");
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
  const q = foldVn(orderSearchQuery);
  // Khi tìm kiếm: chọn hết chỉ áp dụng đơn chưa giao khớp tên
  return ordersCache
    .filter((o) => isOpenStatus(o.status))
    .filter((o) => (q ? true : matchesOrderFilter(o.status)))
    .filter((o) => matchesCustomerSearch(o, q))
    .map((o) => o.id);
}

function doneVisibleIds() {
  const q = foldVn(orderSearchQuery);
  const base = q
    ? (searchHits || []).filter((o) => normalizeStatus(o.status) === "done")
    : doneOrdersCache.filter((o) => normalizeStatus(o.status) === "done");
  return base.map((o) => o.id);
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

/** Popup tổng quan đơn chưa giao theo thôn. */
function openPrepareSummary() {
  const orders = ordersCache.filter((order) => order && isOpenStatus(order.status));
  const buckets = new Map(VILLAGES.map((name) => [name, { count: 0, revenue: 0 }]));
  let other = { count: 0, revenue: 0 };
  let totalRevenue = 0;
  for (const order of orders) {
    const money = Math.max(0, Number(order.total) || 0);
    totalRevenue += money;
    const village = parseVillage(order.village);
    if (!village) {
      other.count += 1;
      other.revenue += money;
      continue;
    }
    const bucket = buckets.get(village);
    bucket.count += 1;
    bucket.revenue += money;
  }
  const title = $("prepare-title");
  const stats = $("prepare-stats");
  if (title) title.textContent = "Tổng quan";
  if (stats) {
    const card = (name, count, revenue) => `<button type="button" class="area-preset${count ? " is-on" : ""}" tabindex="-1">
        <span>${escapeHtml(name)}</span>
        <strong>${count}</strong>
        <em>đơn</em>
        <small>${vnd.format(revenue)}</small>
      </button>`;
    const presets = VILLAGES.map((name) => {
      const bucket = buckets.get(name);
      return card(name, bucket.count, bucket.revenue);
    });
    if (other.count) presets.push(card("Chưa rõ thôn", other.count, other.revenue));
    stats.innerHTML = `<div class="area-total">
        <span>Tổng doanh thu</span>
        <strong>${vnd.format(totalRevenue)}</strong>
      </div>${presets.join("")}`;
  }

  document.body.classList.add("confirm-open");
  prepareModal?.classList.remove("hidden");
  prepareModal?.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() =>
    prepareModal?.querySelector("[data-close-prepare]")?.focus(),
  );
}

function openPrepareForPendingOrders() {
  openPrepareSummary();
}

function closePrepareSummary() {
  prepareModal?.classList.add("hidden");
  prepareModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-open");
  lockBody(false);
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
  const prepareRow = document.querySelector(".prepare-row");
  if (!bulk || !countEl) return;

  const isDoneTab = orderFilter === "done";
  const visibleIds = isDoneTab ? doneVisibleIds() : openVisibleIds();
  
  // Ẩn/hiện prepare-row tùy theo tab
  if (prepareRow) {
    prepareRow.classList.toggle("done-tab-hidden", isDoneTab);
  }
  
  for (const id of [...selectedOrderIds]) {
    if (!visibleIds.includes(id)) selectedOrderIds.delete(id);
  }

  const n = selectedOrderIds.size;
  const show = n > 0;
  bulk.classList.toggle("hidden", !show);
  bulk.setAttribute("aria-hidden", show ? "false" : "true");
  document.body.classList.toggle("bulk-open", show);
  countEl.textContent = String(n);
  
  // Cập nhật text cho button "Chọn hết" (tab Chưa giao) hoặc state checkbox (tab Đã giao)
  if (selectAllBtn) {
    selectAllBtn.textContent = n > 0 && n === visibleIds.length ? "Bỏ chọn" : "Chọn hết";
  }

  // Cập nhật các button tùy theo tab
  const actionsWrap = bulk.querySelector(".order-bulk-actions");
  if (actionsWrap) {
    if (isDoneTab) {
      actionsWrap.classList.add("done-tab");
      actionsWrap.innerHTML = `
        <label class="bulk-select-all-label">
          <input type="checkbox" id="bulk-select-all-checkbox" />
          <span>Chọn tất cả</span>
        </label>
        <button type="button" class="btn primary" id="bulk-unpaid">Hủy CK</button>
        <button type="button" class="btn danger icon-only sm" id="bulk-delete" title="Xóa">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      `;
      
      // Cập nhật checkbox state
      const checkbox = $("bulk-select-all-checkbox");
      if (checkbox) {
        checkbox.checked = n > 0 && n === visibleIds.length;
        checkbox.indeterminate = n > 0 && n < visibleIds.length;
      }
    } else {
      actionsWrap.classList.remove("done-tab");
      actionsWrap.innerHTML = `
        <button type="button" class="btn ghost" id="bulk-select-all">Chọn hết</button>
        <button type="button" class="btn ghost" id="bulk-export-pdf">In</button>
        <button type="button" class="btn primary" id="bulk-deliver">Đã giao</button>
        <button type="button" class="btn danger" id="bulk-delete">Xóa</button>
      `;
    }
  }

  if (servingsEl) {
    if (!show || isDoneTab) {
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
  const when = [
    order.village ? String(order.village) : "",
    deliveryDateLabel(order.delivery_date || ""),
    slotLabel(slot),
  ]
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

/** Group slips into A6 pages */
function buildPrintPagesHtml(list) {
  const total = list.length;
  const pages = [];
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
  const list = sortOrders(ordersCache.filter((o) => idSet.has(o.id)));
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

let pendingUnpaidId = "";

function openUnpaidConfirm(id) {
  const order = findOrder(id);
  if (!order || !(Number(order.paid_at) > 0)) return;
  pendingUnpaidId = id;
  const who = [order.customer, order.phone].filter(Boolean).join(" · ");
  const text = $("unpaid-confirm-text");
  if (text) {
    text.textContent = who
      ? `Đơn của ${who} sẽ trở lại chưa thanh toán.`
      : "Đơn này sẽ trở lại chưa thanh toán.";
  }
  document.body.classList.add("confirm-open");
  unpaidConfirmModal?.classList.remove("hidden");
  unpaidConfirmModal?.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("confirm-unpaid-order")?.focus());
}

function closeUnpaidConfirm() {
  pendingUnpaidId = "";
  unpaidConfirmModal?.classList.add("hidden");
  unpaidConfirmModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-open");
  lockBody(false);
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
  const openOrders = ordersCache.filter((o) => isOpenStatus(o.status));
  const open = serverOpenCount == null ? openOrders.length : serverOpenCount;
  const done = doneCount;
  let pendingRevenue = 0;
  for (const o of openOrders) {
    pendingRevenue += Number(o.total) || 0;
  }
  const countPending = $("count-pending");
  const countDone = $("count-done");
  const pendingRevEl = $("pending-revenue");
  if (countPending) countPending.textContent = String(open);
  if (countDone) countDone.textContent = String(done);
  if (pendingRevEl) pendingRevEl.textContent = vnd.format(pendingRevenue);
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
    // Cùng ngày: gom theo thôn rồi ca giao
    const villageDiff = villageRank(a.village) - villageRank(b.village);
    if (villageDiff !== 0) return villageDiff;
    const slotDiff = slotRank(a.delivery_slot) - slotRank(b.delivery_slot);
    if (slotDiff !== 0) return slotDiff;
    const st = statusRank(a.status) - statusRank(b.status);
    if (st !== 0) return st;
    return Number(a.created_at) - Number(b.created_at);
  });
}

/** Chưa thanh toán lên trước, đã CK xuống dưới; trong mỗi nhóm: mới giao trước (delivered_at → printed_at → created_at) */
function sortDoneOrders(list) {
  return [...list].sort((a, b) => {
    const aPaid = Number(a.paid_at) > 0 ? 1 : 0;
    const bPaid = Number(b.paid_at) > 0 ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;

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
    (searchHits || []).find((o) => o.id === id) ||
    null
  );
}

function adjustOrderCounts({ openDelta = 0, doneDelta = 0 } = {}) {
  if (serverOpenCount != null) {
    serverOpenCount = Math.max(0, serverOpenCount + openDelta);
  }
  doneCount = Math.max(0, doneCount + doneDelta);
}

/** Đơn đã giao không nằm trong danh sách trang chủ. Trang đang xem thì cập nhật tại chỗ. */
function syncDoneOrdersCache(order) {
  if (!order?.id) return;
  if (normalizeStatus(order.status) === "done") {
    ordersCache = ordersCache.filter((o) => o.id !== order.id);
    const showOnPage =
      orderFilter === "done" &&
      donePage === 1 &&
      (!doneTodayFilter || isDeliveredToday(order));
    if (showOnPage) {
      doneOrdersCache = sortDoneOrders([
        order,
        ...doneOrdersCache.filter((o) => o.id !== order.id),
      ]).slice(0, DONE_PAGE_SIZE);
    } else {
      doneOrdersCache = doneOrdersCache.filter((o) => o.id !== order.id);
    }
    writeOrdersCache(ordersCache);
    return;
  }
  doneOrdersCache = doneOrdersCache.filter((o) => o.id !== order.id);
  writeOrdersCache(ordersCache);
}

/** Đưa đơn pending trở lại board upcoming nếu chưa có */
function ensureOrderOnBoard(order) {
  if (!order?.id) return;
  const idx = ordersCache.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    ordersCache[idx] = order;
    ordersCache = sortOrders(ordersCache);
    writeOrdersCache(ordersCache);
    return;
  }
  if (isOpenStatus(order.status)) {
    ordersCache = sortOrders([...ordersCache, order]);
  }
  writeOrdersCache(ordersCache);
}

/** Danh sách hiển thị theo tab lọc + tìm tên khách */
function boardOrdersForFilter() {
  const q = foldVn(orderSearchQuery);
  // Đang tìm → quét mọi trạng thái: chưa giao trước, đã giao sau
  if (q) return searchHits || [];
  if (orderFilter === "done") return doneOrdersCache;
  return ordersCache.filter((o) => isOpenStatus(o.status));
}

function orderBoardSig(list) {
  return (list || [])
    .map((o) =>
      [
        o.id,
        normalizeStatus(o.status),
        o.total,
        o.paid_at || 0,
        o.delivered_at || 0,
        o.printed_at || 0,
        o.customer || "",
        o.phone || "",
        o.village || "",
        o.delivery_date || "",
        o.note || "",
        (o.items || [])
          .map((i) => `${i.id}:${i.qty}:${i.size || ""}:${i.price}`)
          .join(","),
      ].join("~"),
    )
    .join("|");
}

/** Cập nhật board upcoming (nếu có list) rồi vẽ lại. Bỏ qua vẽ nếu danh sách không đổi. */
function renderOrders(orders) {
  const day = vnDayKey();
  if (ordersFetchedDay && ordersFetchedDay !== day) {
    ordersFetchedDay = "";
    loadOrders().catch(() => {});
    if (orderFilter === "done") {
      loadDoneOrders({ page: 1 }).catch(() => {});
    }
    return;
  }
  if (orders) {
    const next = sortOrders(
      orders.map((o) => ({
        ...o,
        status: normalizeStatus(o.status),
      })),
    );
    const same = orderBoardSig(ordersCache) === orderBoardSig(next);
    const skeletonOnScreen = Boolean(ordersEl?.querySelector(".loading-state"));
    ordersCache = next;
    if (!ordersFetchedDay) ordersFetchedDay = day;
    if (same && !skeletonOnScreen) {
      updateOrderFilterCounts();
      return;
    }
  }
  paintOrdersBoard();
}

function emptyOrdersHtml(message) {
  return `<div class="empty-orders" role="status">
    <div class="empty-orders-stage" aria-hidden="true">
      <span class="empty-orders-ring"></span>
      <span class="empty-orders-ring delay"></span>
      <svg class="empty-orders-mark" viewBox="0 0 120 120" fill="none">
        <ellipse cx="60" cy="78" rx="34" ry="8" fill="#d7ebdf"/>
        <path d="M28 62c0-18 14-32 32-32s32 14 32 32v6H28v-6z" fill="#f4fbf7" stroke="#0c7a52" stroke-width="2.2"/>
        <path d="M40 58c6-10 14-14 20-14s14 4 20 14" stroke="#8fd0ae" stroke-width="2" stroke-linecap="round"/>
        <rect x="46" y="34" width="28" height="16" rx="8" fill="#fff" stroke="#0a5f40" stroke-width="2"/>
        <path d="M50 42h20M54 38c2 4 2 4 0 8M66 38c-2 4-2 4 0 8" stroke="#0c7a52" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M78 36c8 2 12 8 12 14-6-2-10-8-12-14z" fill="#1f9d68"/>
        <path d="M86 34c6 6 6 12 2 16" stroke="#0a5f40" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </div>
    <p class="empty-orders-text">${message}</p>
  </div>`;
}

function paintOrdersBoard() {
  updateOrderFilterCounts();
  ordersEl?.removeAttribute("aria-busy");
  $("tab-orders")?.classList.toggle("is-done-view", orderFilter === "done");
  syncDoneToTop();

  const visible = boardOrdersForFilter();
  const hasAny =
    ordersCache.some((o) => isOpenStatus(o.status)) ||
    doneCount > 0 ||
    doneOrdersCache.length > 0;

  if (orderFilter === "done" && doneLoading && !doneOrdersCache.length && !foldVn(orderSearchQuery)) {
    showOrdersSkeleton();
    paintDonePager();
    return;
  }

  if (!hasAny) {
    ordersEl.innerHTML = emptyOrdersHtml("Chưa có đơn cần giao.");
    paintDonePager();
    return;
  }
  if (!visible.length) {
    const searching = Boolean(foldVn(orderSearchQuery));
    ordersEl.innerHTML = emptyOrdersHtml(
      searching
        ? `Không tìm thấy khách “${escapeHtml(orderSearchQuery.trim())}”.`
        : orderFilter === "done"
          ? `Chưa có đơn đã giao${doneTodayFilter ? " hôm nay" : ""}.`
          : "Không còn đơn chưa giao.",
    );
    paintDonePager();
    return;
  }

  const frag = document.createDocumentFragment();
  let lastVillageKey = null;
  let lastSearchBlock = null;
  const searching = Boolean(foldVn(orderSearchQuery));
  const showVillageGroups = searching || orderFilter !== "done";
  /** @type {Map<string, number>} */
  const villageCounts = new Map();
  if (showVillageGroups) {
    for (const o of visible) {
      const villageName = parseVillage(o.village) || (o.village ? String(o.village) : "");
      const status = normalizeStatus(o.status);
      const block = searching
        ? isOpenStatus(status)
          ? "open"
          : "done"
        : "all";
      const villageKey = `${block}:${villageName || "__none__"}`;
      villageCounts.set(villageKey, (villageCounts.get(villageKey) || 0) + 1);
    }
  }
  for (const o of visible) {
    const status = normalizeStatus(o.status);
    const villageName = parseVillage(o.village) || (o.village ? String(o.village) : "");
    const searchBlock = searching
      ? isOpenStatus(status)
        ? "open"
        : "done"
      : "all";
    if (searching && searchBlock !== lastSearchBlock) {
      lastSearchBlock = searchBlock;
      lastVillageKey = null;
      const blockCount = visible.filter((x) =>
        searchBlock === "open"
          ? isOpenStatus(normalizeStatus(x.status))
          : !isOpenStatus(normalizeStatus(x.status)),
      ).length;
      const blockHead = document.createElement("div");
      blockHead.className = "order-search-block";
      blockHead.textContent =
        searchBlock === "open"
          ? `Chưa giao (${blockCount} đơn)`
          : `Đã giao (${blockCount} đơn)`;
      frag.appendChild(blockHead);
    }
    const villageKey = `${searchBlock}:${villageName || "__none__"}`;
    if (showVillageGroups && villageKey !== lastVillageKey) {
      lastVillageKey = villageKey;
      const count = villageCounts.get(villageKey) || 0;
      const label = villageName || "Chưa chọn thôn";
      const group = document.createElement("div");
      group.className = "order-village-group";
      group.textContent = `${label} (${count} đơn)`;
      frag.appendChild(group);
    }
    const el = document.createElement("article");
    el.className = `order order-${status}`;
    el.dataset.orderId = o.id;
    const customerName = formatCustomerName(o.customer);
    const receiver = [customerName, o.phone].filter(Boolean).join(" · ");
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
            <p class="order-line"><span class="order-qty">${i.qty}×</span> <span class="order-name">${escapeHtml(orderFilter === "done" ? displayProductName(i.name) : i.name)}</span>${
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
    const villageBadge = villageName
      ? `<span class="order-village">${escapeHtml(villageName)}</span>`
      : "";
    const actionBtn =
      status === "done"
        ? UNDO_ICON
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
    const paidAtText = formatVnDateTime(o.paid_at);
    const isPaid = Number(o.paid_at) > 0;
    const onDoneTab = orderFilter === "done";
    const placedAtText = formatVnDateTime(o.created_at);
    const sameStamp =
      printedAtText &&
      deliveredAtText &&
      Number(o.printed_at) > 0 &&
      Number(o.delivered_at) > 0 &&
      Math.abs(Number(o.printed_at) - Number(o.delivered_at)) < 2000;
    const timelineHtml = onDoneTab
      ? ""
      : sameStamp
        ? `<div class="order-timeline"><span class="order-timeline-item"><em>In/Giao</em> ${escapeHtml(printedAtText)}</span>${
            paidAtText
              ? `<span class="order-timeline-item order-paid"><em>Thanh toán</em> ${escapeHtml(paidAtText)}</span>`
              : ""
          }</div>`
        : printedAtText || deliveredAtText || paidAtText
          ? `<div class="order-timeline">${
              printedAtText
                ? `<span class="order-timeline-item"><em>In</em> ${escapeHtml(printedAtText)}</span>`
                : ""
            }${
              deliveredAtText
                ? `<span class="order-timeline-item"><em>Giao</em> ${escapeHtml(deliveredAtText)}</span>`
                : ""
            }${
              paidAtText
                ? `<span class="order-timeline-item order-paid"><em>Thanh toán</em> ${escapeHtml(paidAtText)}</span>`
                : ""
            }</div>`
          : "";
    el.innerHTML = `
      <header class="order-head">
        <div class="order-head-left">
          <label class="order-check">
            <input type="checkbox" data-select-order="${escapeHtml(o.id)}" ${checked} />
            <span></span>
          </label>
          <span class="time" title="${onDoneTab ? "Thời điểm đặt đơn" : "Giờ nhận đơn"}">${
            onDoneTab && placedAtText ? escapeHtml(placedAtText) : timeFmt.format(o.created_at)
          }</span>
          <div class="order-badges">
            <span class="order-status order-status-${status}">${statusText}</span>
            ${villageBadge}
            ${isPaid ? `<button type="button" class="order-paid-badge" data-unmark-paid="${escapeHtml(o.id)}" aria-label="Hủy đánh dấu đã chuyển khoản">Đã CK</button>` : ""}
            ${
              !onDoneTab && whenText
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
            ? `<span class="order-receiver-dot" aria-hidden="true"></span><span class="order-receiver-text">${escapeHtml(receiver)}</span>`
            : `<span class="order-receiver-empty">Chưa có tên / SĐT</span>`
        }</p>
        <div class="order-items">${itemsHtml}</div>
        ${timelineHtml}
      </div>
      <div class="order-actions-wrap">
        <div class="order-actions${status === "pending" ? " order-actions-pending" : ""}${status === "done" && !isPaid ? " order-actions-done" : ""}${status === "done" && isPaid ? " order-actions-done-paid" : ""}">
          <button type="button" class="order-status-btn order-status-btn-${status}" data-toggle-status="${escapeHtml(o.id)}"${status === "done" ? ` aria-label="Hoàn tác"` : ""}>
            ${actionBtn}
          </button>
          ${quickDeliverBtn}
          ${
            status === "done" && !isPaid
              ? `<button type="button" class="order-paid-btn" data-mark-paid="${escapeHtml(o.id)}">${CHECK_ICON}<span>Xác nhận CK</span></button>`
              : ""
          }
          <button type="button" class="order-edit-icon" data-edit-order="${escapeHtml(o.id)}" aria-label="Sửa đơn">
            ${EDIT_ICON}
          </button>
          <button type="button" class="order-clone-icon" data-clone-order="${escapeHtml(o.id)}" aria-label="Nhân bản đơn">
            ${CLONE_ICON}
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
  paintDonePager();
}

function paintDonePager() {
  const pager = $("done-pager");
  if (!pager) return;
  const searching = Boolean(foldVn(orderSearchQuery));
  const isDoneTab = orderFilter === "done" && !searching;
  const totalItems = isDoneTab ? doneTotal : 0;
  const pages = totalItems > 0 ? Math.ceil(totalItems / DONE_PAGE_SIZE) : 0;
  if (isDoneTab) doneTotalPages = Math.max(1, pages);
  const show = pages > 1;
  pager.classList.toggle("hidden", !show);
  if (!show) return;

  const from = (donePage - 1) * DONE_PAGE_SIZE + 1;
  const to = Math.min(totalItems, donePage * DONE_PAGE_SIZE);
  $("done-pager-info").textContent = `${from}–${to} / ${totalItems} đơn`;

  const prevBtn = $("done-pager-prev");
  const nextBtn = $("done-pager-next");
  if (prevBtn instanceof HTMLButtonElement) prevBtn.disabled = donePage <= 1;
  if (nextBtn instanceof HTMLButtonElement) nextBtn.disabled = donePage >= doneTotalPages;

  // Render page number buttons
  const pagesEl = $("done-pager-pages");
  if (!pagesEl) return;
  pagesEl.innerHTML = "";

  const total = doneTotalPages;
  const cur = donePage;

  /** Returns the button HTML string for a page number or ellipsis */
  const buildBtn = (n, label) =>
    `<button type="button" class="done-pager-dot${n === cur ? " active" : ""}" data-goto="${n}" aria-label="Trang ${label}" aria-current="${n === cur ? "page" : "false"}">${label}</button>`;

  const buildEllipsis = () =>
    `<span class="done-pager-ellipsis" aria-hidden="true">…</span>`;

  let html = "";

  if (total <= 7) {
    for (let i = 1; i <= total; i++) html += buildBtn(i, i);
  } else {
    // Always show 1
    html += buildBtn(1, 1);

    if (cur <= 4) {
      // Near start: show 2,3,4,5, ellipsis, last
      for (let i = 2; i <= 5; i++) html += buildBtn(i, i);
      html += buildEllipsis();
      html += buildBtn(total, total);
    } else if (cur >= total - 3) {
      // Near end: show ellipsis, then 4 pages before last
      html += buildEllipsis();
      for (let i = total - 4; i <= total; i++) html += buildBtn(i, i);
    } else {
      // Middle: ellipsis, cur-1, cur, cur+1, ellipsis, last
      html += buildEllipsis();
      html += buildBtn(cur - 1, cur - 1);
      html += buildBtn(cur, cur);
      html += buildBtn(cur + 1, cur + 1);
      html += buildEllipsis();
      html += buildBtn(total, total);
    }
  }

  pagesEl.innerHTML = html;

  // Attach click handlers to generated page buttons
  pagesEl.querySelectorAll(".done-pager-dot[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.goto);
      if (target !== cur && target >= 1 && target <= total) {
        loadDoneOrders({ page: target })
          .then(() => scrollToFirstDoneOrder())
          .catch((err) => toast(err.message || "Không tải được trang"));
      }
    });
  });
}

async function setOrderStatus(id, status, opts = {}) {
  if (statusBusy.has(id)) return;
  const prev = findOrder(id);
  if (!prev) return;
  const old = normalizeStatus(prev.status);
  const next = normalizeStatus(status);
  if (old === next) return;
  const setPrinted = Boolean(opts.setPrinted) && next === "done";

  statusBusy.add(id);
  try {
    await api(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next, setPrinted }),
    });
    if (next === "done") selectedOrderIds.delete(id);
    await refreshOrdersView();
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
  } catch (err) {
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
  let openDelta = 0;
  let doneDelta = 0;
  for (const id of drop) {
    const order = findOrder(id);
    if (!order) continue;
    if (normalizeStatus(order.status) === "done") doneDelta -= 1;
    else openDelta -= 1;
  }
  adjustOrderCounts({ openDelta, doneDelta });
  ordersCache = ordersCache.filter((o) => !drop.has(o.id));
  doneOrdersCache = doneOrdersCache.filter((o) => !drop.has(o.id));
  for (const id of drop) selectedOrderIds.delete(id);
  writeOrdersCache(ordersCache);
}

async function deleteOrders(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return;
  try {
    if (unique.length === 1) {
      await api(`/api/orders/${encodeURIComponent(unique[0])}`, { method: "DELETE" });
    } else {
      await api("/api/orders/delete-bulk", {
        method: "POST",
        body: JSON.stringify({ ids: unique }),
      });
    }
    for (const id of unique) selectedOrderIds.delete(id);
    toast(unique.length > 1 ? `Đã xóa ${unique.length} đơn` : "Đã xóa đơn");
    await refreshOrdersView();
    loadProducts().catch(() => {});
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
  } catch (err) {
    toast(err.message || "Không xóa được");
  }
}

async function markOrderPaid(id) {
  try {
    await api(`/api/orders/${encodeURIComponent(id)}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paid: true }),
    });
    await refreshOrdersView();
    toast("Đã đánh dấu thanh toán");
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
  } catch (err) {
    toast(err.message || "Không cập nhật được");
  }
}

async function unmarkOrderPaid(id) {
  try {
    await api(`/api/orders/${encodeURIComponent(id)}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paid: false }),
    });
    await refreshOrdersView();
    toast("Đã hủy đánh dấu thanh toán");
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
  } catch (err) {
    toast(err.message || "Không cập nhật được");
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

  try {
    await api("/api/orders/status-bulk", {
      method: "POST",
      body: JSON.stringify({
        ids: targets.map((o) => o.id),
        status: next,
        setPrinted,
      }),
    });
    if (next === "done") {
      for (const o of targets) selectedOrderIds.delete(o.id);
    }
    await refreshOrdersView();
    if (!opts.silent) {
      if (next === "done") toast(`Đã giao ${targets.length} đơn`);
      else if (next === "printed") toast(`Đã in ${targets.length} đơn`);
      else toast("Đã hoàn tác");
    }
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
  } catch (err) {
    toast(err.message || "Không cập nhật được");
  }
}

/**
 * @param {string[]} ids
 * @param {boolean} paid
 * @param {{ silent?: boolean }} [opts]
 */
async function setOrdersPaidBulk(ids, paid, opts = {}) {
  const targets = ids
    .map((id) => findOrder(id))
    .filter((o) => o && Boolean(o.paid_at) !== paid);
  if (!targets.length) return;

  try {
    await api("/api/orders/paid-bulk", {
      method: "POST",
      body: JSON.stringify({
        ids: targets.map((o) => o.id),
        paid,
      }),
    });
    await refreshOrdersView();
    if (!opts.silent) {
      toast(paid ? `Đã đánh dấu ${targets.length} đơn đã thanh toán` : `Đã hủy thanh toán ${targets.length} đơn`);
    }
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
  } catch (err) {
    toast(err.message || "Không cập nhật được");
  }
}

/** Tracks active tab so boot → setTab does not double-fetch */
let activeTab = "orders";
const TAB_IDS = new Set(["orders", "products", "stats"]);

function tabFromLocation() {
  const raw = (location.hash || "").replace(/^#\/?/, "").split(/[/?#]/)[0];
  return TAB_IDS.has(raw) ? raw : "orders";
}

function syncTabHash(tab) {
  const want = `#${tab}`;
  if (location.hash === want) return;
  // replaceState: đổi URL không chồng history mỗi lần bấm tab
  history.replaceState(null, "", want);
}

function setTab(tab, { fromUrl = false } = {}) {
  if (!TAB_IDS.has(tab)) tab = "orders";
  const prev = activeTab;
  const same = tab === activeTab;
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
  // Show/hide done-today filter row based on current tab
  $("done-filter-row")?.classList.toggle("visible", tab === "orders" && orderFilter === "done");
  if (!fromUrl) syncTabHash(tab);
  // Only refetch when user switches into the tab (not when already there)
  if (same && prev === tab) return;
  if (tab === "orders") {
    if (prev !== "orders") refreshOrdersView().catch(() => {});
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

/** Thôn cố định trong xã — gom đơn đi giao */
const VILLAGES = [
  "Đông Cao",
  "Tráng Việt",
  "Văn Quán",
  "Văn Khê",
  "Hạ Lôi",
  "Tiền Phong",
];

function parseVillage(raw) {
  const s = String(raw || "").trim();
  return VILLAGES.includes(s) ? s : "";
}

function villageRank(village) {
  const i = VILLAGES.indexOf(String(village || "").trim());
  return i >= 0 ? i : 99;
}

function selectedVillage(name = "village") {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el instanceof HTMLInputElement ? parseVillage(el.value) : "";
}

function renderVillageOptions(rootId, inputName, selected) {
  const root = $(rootId);
  if (!root) return;
  const chosen = parseVillage(selected);
  root.innerHTML = VILLAGES.map((v) => {
    const checked = v === chosen ? "checked" : "";
    return `<label class="slot-option">
      <input type="radio" name="${escapeHtml(inputName)}" value="${escapeHtml(v)}" ${checked} />
      <span>${escapeHtml(v)}</span>
    </label>`;
  }).join("");
  root.classList.remove("is-invalid");
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
    if (cloningOrder) {
      label.textContent = lines
        ? `Tạo đơn mới (${formatVnd(total)})`
        : "Tạo đơn mới";
    } else {
      label.textContent = lines
        ? `Lưu thay đổi (${formatVnd(total)})`
        : "Lưu thay đổi";
    }
  }
}

function openEditOrderModal(order, { clone = false } = {}) {
  cloningOrder = Boolean(clone);
  editingOrder = clone ? null : order;
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
      category:
        item.category === "tra-sua" || item.category === "banh-trang"
          ? item.category
          : productCategory(catalog),
    };
  });
  const kicker = $("edit-order-kicker");
  if (kicker) kicker.textContent = clone ? "Nhân bản" : "Sửa đơn";
  $("edit-order-title").textContent = clone ? "Nhân bản đơn hàng" : "Sửa đơn hàng";
  $("edit-order-customer").value = formatCustomerName(order.customer);
  syncOptionalFields("edit", {
    phone: order.phone || "",
    note: order.note || "",
  });
  const allowedDates = new Set(deliveryDateOptions().map((o) => o.ymd));
  const deliveryDate =
    order.delivery_date && allowedDates.has(order.delivery_date)
      ? order.delivery_date
      : defaultDeliveryYmd();
  renderDeliveryDateOptions(
    "edit-delivery-date-options",
    "edit_delivery_date",
    deliveryDate,
    clone ? "" : order.delivery_date || "",
  );
  renderVillageOptions(
    "edit-order-village-options",
    "edit_village",
    order.village || "",
  );
  renderEditOrderItems();
  renderProductList(editOrderMenuEl, { manage: false });
  editOrderModal.classList.remove("hidden");
  editOrderModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("edit-order-customer")?.focus());
}

function openCloneOrderModal(order) {
  openEditOrderModal(order, { clone: true });
}

function closeEditOrderModal() {
  cloningOrder = false;
  editingOrder = null;
  editOrderItems = [];
  if (editOrderMenuEl) editOrderMenuEl.replaceChildren();
  editOrderModal.classList.add("hidden");
  editOrderModal.setAttribute("aria-hidden", "true");
  lockBody(false);
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
    if (existing.category !== "tra-sua" && existing.category !== "banh-trang") {
      existing.category = productCategory(product);
    }
  } else {
    editOrderItems.push({
      id: product.id,
      name: product.name,
      size,
      qty: addQty,
      price,
      image: product.image,
      category: productCategory(product),
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

function syncEditPreviewEmpty() {
  const wrap = $("edit-preview-wrap");
  if (!wrap || !editPreview) return;
  const hasSrc = Boolean(editPreview.getAttribute("src"));
  wrap.classList.toggle("is-empty", !hasSrc);
}

/** Open edit product modal first; defer image + focus so sheet paints instantly */
function openEditModal(product) {
  creatingProduct = false;
  editingProduct = product;
  pendingImageFile = null;
  clearPreviewUrl();
  editImageInput.value = "";
  const kicker = $("edit-kicker");
  if (kicker) kicker.textContent = "Chỉnh sửa";
  $("edit-title").textContent = product.name;
  $("edit-name").value = product.name;
  setProductCategory(productCategory(product));
  $("edit-price").value = String(product.price);
  $("edit-cost").value = String(product.cost ?? 0);
  $("edit-price-large").value = String(
    product.price_large ?? product.price + 5000,
  );
  $("edit-cost-large").value = String(
    product.cost_large ?? Math.max(0, (product.cost ?? 0) + 2000),
  );
  const label = saveProductBtn?.querySelector(".btn-label");
  if (label) label.textContent = "Lưu sản phẩm";

  // Don't block first paint on full-size image decode
  editPreview.removeAttribute("src");
  editPreview.alt = product.name || "";
  editPreview.decoding = "async";
  syncEditPreviewEmpty();

  editModal.classList.remove("hidden");
  editModal.setAttribute("aria-hidden", "false");
  lockBody(true);

  const productId = product.id;
  const listImg = menuEl?.querySelector(
    `[data-product-id="${CSS.escape(productId)}"] img.product-thumb`,
  );
  const cachedSrc =
    listImg instanceof HTMLImageElement && listImg.currentSrc
      ? listImg.currentSrc
      : "";
  // After modal is visible — don't block open on decode
  queueMicrotask(() => {
    if (creatingProduct || editingProduct?.id !== productId) return;
    editPreview.src = cachedSrc || imageUrl(product);
    syncEditPreviewEmpty();
  });
}

function openCreateProductModal() {
  creatingProduct = true;
  editingProduct = null;
  pendingImageFile = null;
  clearPreviewUrl();
  editImageInput.value = "";
  const kicker = $("edit-kicker");
  if (kicker) kicker.textContent = "Thêm mới";
  $("edit-title").textContent = "Sản phẩm mới";
  $("edit-name").value = "";
  setProductCategory("banh-trang");
  $("edit-price").value = "25000";
  $("edit-cost").value = "12000";
  $("edit-price-large").value = "30000";
  $("edit-cost-large").value = "15000";
  editPreview.removeAttribute("src");
  editPreview.alt = "";
  syncEditPreviewEmpty();
  const label = saveProductBtn?.querySelector(".btn-label");
  if (label) label.textContent = "Thêm sản phẩm";

  editModal.classList.remove("hidden");
  editModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("edit-name")?.focus());
}

function closeEditModal() {
  creatingProduct = false;
  editingProduct = null;
  pendingImageFile = null;
  clearPreviewUrl();
  editPreview.removeAttribute("src");
  syncEditPreviewEmpty();
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
    ...opts,
    credentials: "same-origin",
    cache: "no-store",
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

async function loadProducts({ fresh = false } = {}) {
  if (productsLoadPromise && !fresh) return productsLoadPromise;
  const run = (async () => {
    const pre = fresh ? null : await takePrefetch("products");
    const data =
      pre && Array.isArray(pre.products) ? pre : await api("/api/products");
    setProducts(data.products || []);
  })();
  if (fresh) return run;
  productsLoadPromise = run.finally(() => {
    productsLoadPromise = null;
  });
  return productsLoadPromise;
}

/** Luôn vẽ lại đúng tab đang mở từ server, không ghép cache tay. */
async function refreshOrdersView({ fresh = false } = {}) {
  const q = String(orderSearchQuery || "").trim();
  if (q) {
    await Promise.all([loadOrders({ fresh }), runOrderSearch()]);
    return;
  }
  if (orderFilter === "done") {
    await Promise.all([
      loadOrders({ fresh }),
      loadDoneOrders({ page: donePage, today: doneTodayFilter }),
    ]);
    return;
  }
  await loadOrders({ fresh });
}

async function loadOrders({ fresh = false } = {}) {
  if (ordersLoadPromise && !fresh) return ordersLoadPromise;
  const run = (async () => {
    const pre = fresh ? null : await takePrefetch("orders");
    const data =
      pre && Array.isArray(pre.orders)
        ? pre
        : await api("/api/orders?range=upcoming");
    if (typeof data.openCount === "number") serverOpenCount = data.openCount;
    if (typeof data.doneCount === "number") doneCount = data.doneCount;
    ordersFetchedDay = vnDayKey();
    renderOrders(data.orders || []);
    if (products.length) renderMenu();
  })();
  if (fresh) return run;
  ordersLoadPromise = run.finally(() => {
    ordersLoadPromise = null;
  });
  return ordersLoadPromise;
}

let doneToTopRaf = 0;

function syncDoneToTop() {
  const btn = $("done-to-top");
  if (!btn) return;
  const show = window.scrollY > 320;
  btn.classList.toggle("is-on", show);
}

function queueDoneToTop() {
  if (doneToTopRaf) return;
  doneToTopRaf = requestAnimationFrame(() => {
    doneToTopRaf = 0;
    syncDoneToTop();
  });
}

/** Đưa đơn đầu của trang vừa mở lên ngay dưới thanh lọc, không cuộn cả khung danh sách. */
function scrollToFirstDoneOrder() {
  requestAnimationFrame(() => {
    const card = ordersEl?.querySelector(".order");
    if (!card) return;
    const sticky = document.querySelector("#tab-orders .orders-sticky");
    const stickyH = sticky?.getBoundingClientRect().height || 0;
    const top = card.getBoundingClientRect().top + window.scrollY - stickyH - 6;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduce ? "auto" : "smooth",
    });
  });
}

/** Một trang đơn đã giao. Không gọi lúc mở trang chủ. */
async function loadDoneOrders({ page = 1, today = doneTodayFilter } = {}) {
  const seq = ++doneLoadSeq;
  doneLoading = true;
  const params = new URLSearchParams({
    range: "done",
    page: String(page),
    limit: String(DONE_PAGE_SIZE),
  });
  if (today) params.set("delivered", "today");
  try {
    const data = await api(`/api/orders?${params}`);
    if (seq !== doneLoadSeq) return;
    doneOrdersCache = sortDoneOrders(
      (data.orders || []).map((o) => ({
        ...o,
        status: normalizeStatus(o.status),
      })),
    );
    donePage = Number(data.page) || page;
    doneTotal = Number(data.total) || 0;
    doneTotalPages = Number(data.totalPages) || 1;
    if (!today) doneCount = doneTotal;
    doneLoading = false;
    if (orderFilter === "pending" && !foldVn(orderSearchQuery)) {
      updateOrderFilterCounts();
      return;
    }
    paintOrdersBoard();
  } catch (err) {
    if (seq !== doneLoadSeq) return;
    doneLoading = false;
    if (orderFilter === "done") paintOrdersBoard();
    throw err;
  }
}

function syncStatsRangeButtons() {
  document.querySelectorAll("[data-stats-range]").forEach((btn) => {
    btn.classList.toggle(
      "active",
      statsRange !== "custom" &&
        btn.getAttribute("data-stats-range") === statsRange,
    );
  });
  $("stats-open-calendar")?.classList.toggle("active", statsRange === "custom");
}

function statsLoadingHtml() {
  return `<div class="loading-state" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true"></span>
    <p>Đang tải thống kê...</p>
  </div>`;
}

function statsApiUrl() {
  if (statsRange === "custom" && statsCustomFrom && statsCustomTo) {
    return `/api/stats?from=${encodeURIComponent(statsCustomFrom)}&to=${encodeURIComponent(statsCustomTo)}`;
  }
  return `/api/stats?range=${encodeURIComponent(statsRange)}`;
}

async function loadStats({ silent = false, fresh = false } = {}) {
  const key = statsCacheKey();
  if (
    !fresh &&
    statsLoadPromise &&
    statsPayloadKey === key &&
    statsLoadingKey === key
  ) {
    return statsLoadPromise;
  }
  const root = $("stats");
  const cached =
    statsPayload && statsPayloadKey === key
      ? statsPayload
      : readStatsCache(key);
  if (!fresh && cached) {
    statsPayload = cached;
    statsPayloadKey = key;
    if (!silent || activeTab === "stats") renderStats();
  } else if (!silent && !statsPayload && root) {
    root.innerHTML = statsLoadingHtml();
  }
  syncStatsRangeButtons();

  const run = (async () => {
    const pre = !fresh && key === "today" ? await takePrefetch("stats") : null;
    const data =
      pre && typeof pre.revenue === "number" ? pre : await api(statsApiUrl());
    if (statsCacheKey() !== key) return;
    statsPayload = data || null;
    statsPayloadKey = key;
    if (data) writeStatsCache(key, data);
    if (!silent || activeTab === "stats") renderStats();
  })()
    .catch((err) => {
      if (statsCacheKey() !== key) return;
      if (!statsPayload && root && !silent) {
        root.innerHTML = `<p class="empty">Không tải được thống kê.</p>`;
      }
      throw err;
    })
    .finally(() => {
      if (statsLoadingKey === key) {
        statsLoadPromise = null;
        statsLoadingKey = "";
      }
    });

  statsLoadingKey = key;
  statsLoadPromise = run;
  return run;
}

function setStatsRange(next) {
  if (!STATS_RANGE_LABEL[next]) return;
  statsRange = next;
  statsCustomFrom = null;
  statsCustomTo = null;
  syncStatsRangeButtons();
  loadStats().catch(() => {});
}

function setStatsCustomRange(from, to) {
  if (!from || !to) return;
  const a = from <= to ? from : to;
  const b = from <= to ? to : from;
  statsRange = "custom";
  statsCustomFrom = a;
  statsCustomTo = b;
  syncStatsRangeButtons();
  closeStatsDateModal();
  loadStats().catch(() => {});
}

function monthStartYmd(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})/);
  if (!m) return vnYmd();
  return `${m[1]}-${m[2]}-01`;
}

function addMonthsYmd(ymd, delta) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})/);
  if (!m) return vnYmd();
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1 + delta;
  while (mo < 0) {
    mo += 12;
    y -= 1;
  }
  while (mo > 11) {
    mo -= 12;
    y += 1;
  }
  return `${y}-${String(mo + 1).padStart(2, "0")}-01`;
}

function monthLength(ymd) {
  const start = monthStartYmd(ymd);
  const next = addMonthsYmd(start, 1);
  return Math.round(
    (Date.parse(`${next}T12:00:00+07:00`) - Date.parse(`${start}T12:00:00+07:00`)) /
      DAY_MS,
  );
}

function openStatsDateModal() {
  const today = vnYmd();
  statsDateMode =
    statsRange === "custom" &&
    statsCustomFrom &&
    statsCustomTo &&
    statsCustomFrom !== statsCustomTo
      ? "range"
      : "day";
  if (statsRange === "custom" && statsCustomFrom) {
    statsPickFrom = statsCustomFrom;
    statsPickTo = statsCustomTo || statsCustomFrom;
    statsCalMonthYmd = monthStartYmd(statsCustomFrom);
  } else {
    statsPickFrom = today;
    statsPickTo = today;
    statsCalMonthYmd = monthStartYmd(today);
  }
  paintStatsDateModal();
  document.body.classList.add("confirm-open");
  statsDateModal?.classList.remove("hidden");
  statsDateModal?.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() =>
    statsDateModal?.querySelector("[data-close-stats-date]")?.focus(),
  );
}

function closeStatsDateModal() {
  statsDateModal?.classList.add("hidden");
  statsDateModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-open");
  lockBody(false);
}

function paintStatsDateModal() {
  document.querySelectorAll("[data-stats-date-mode]").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-stats-date-mode") === statsDateMode,
    );
  });
  const monthEl = $("stats-cal-month");
  const m = String(statsCalMonthYmd || "").match(/^(\d{4})-(\d{2})/);
  if (monthEl && m) {
    monthEl.textContent = `Tháng ${Number(m[2])} năm ${m[1]}`;
  }
  paintStatsCalGrid();
  paintStatsCalSummary();
  const applyBtn = $("stats-cal-apply");
  if (applyBtn instanceof HTMLButtonElement) {
    applyBtn.disabled = !statsPickFrom;
  }
}

function paintStatsCalSummary() {
  const el = $("stats-cal-summary");
  if (!el) return;
  if (!statsPickFrom) {
    el.textContent =
      statsDateMode === "range" ? "Chọn ngày bắt đầu" : "Chọn một ngày";
    return;
  }
  if (statsDateMode === "range" && !statsPickTo) {
    el.textContent = `Từ ${formatYmdVn(statsPickFrom)} · chọn ngày kết thúc`;
    return;
  }
  if (statsDateMode === "day" || !statsPickTo || statsPickFrom === statsPickTo) {
    el.textContent = formatYmdVn(statsPickFrom);
    return;
  }
  const a = statsPickFrom <= statsPickTo ? statsPickFrom : statsPickTo;
  const b = statsPickFrom <= statsPickTo ? statsPickTo : statsPickFrom;
  el.textContent = `${formatYmdVn(a)} – ${formatYmdVn(b)}`;
}

function paintStatsCalGrid() {
  const grid = $("stats-cal-grid");
  if (!grid) return;
  const today = vnYmd();
  const minYmd = addDaysYmd(today, -365);
  const monthStart = monthStartYmd(statsCalMonthYmd || today);
  const len = monthLength(monthStart);
  // Monday=0 … Sunday=6 for grid
  const wdSun = vnWeekday(Date.parse(`${monthStart}T12:00:00+07:00`));
  const lead = (wdSun + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) {
    const ymd = addDaysYmd(monthStart, i - lead);
    cells.push({ ymd, other: true });
  }
  for (let d = 0; d < len; d++) {
    cells.push({ ymd: addDaysYmd(monthStart, d), other: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].ymd;
    cells.push({ ymd: addDaysYmd(last, 1), other: true });
  }

  let from = statsPickFrom;
  let to = statsDateMode === "range" ? statsPickTo || statsPickFrom : statsPickFrom;
  if (from && to && from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  grid.innerHTML = cells
    .map(({ ymd, other }) => {
      const dayNum = Number(ymd.slice(8, 10));
      const disabled = ymd > today || ymd < minYmd;
      const isToday = ymd === today;
      const isStart = from && ymd === from;
      const isEnd = to && ymd === to;
      const inRange =
        statsDateMode === "range" && from && to && ymd >= from && ymd <= to;
      const selected =
        statsDateMode === "day" && from && ymd === from;
      const cls = [
        "stats-cal-day",
        other ? "is-other" : "",
        isToday ? "is-today" : "",
        selected || (isStart && isEnd) ? "is-selected" : "",
        inRange ? "is-in-range" : "",
        isStart ? "is-range-start" : "",
        isEnd ? "is-range-end" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<button type="button" class="${cls}" data-cal-day="${ymd}" ${
        disabled ? "disabled" : ""
      } aria-label="${formatYmdVn(ymd)}">${dayNum}</button>`;
    })
    .join("");
}

function onStatsCalDayClick(ymd) {
  if (!ymd) return;
  if (statsDateMode === "day") {
    statsPickFrom = ymd;
    statsPickTo = ymd;
  } else if (!statsPickFrom || (statsPickFrom && statsPickTo && statsPickFrom !== statsPickTo)) {
    // start new range
    statsPickFrom = ymd;
    statsPickTo = "";
  } else if (!statsPickTo) {
    statsPickTo = ymd;
  } else {
    statsPickFrom = ymd;
    statsPickTo = "";
  }
  paintStatsDateModal();
}

function applyStatsDatePicker() {
  if (!statsPickFrom) {
    toast("Chọn ngày trước");
    return;
  }
  const from = statsPickFrom;
  const to =
    statsDateMode === "range" && statsPickTo ? statsPickTo : statsPickFrom;
  setStatsCustomRange(from, to);
}

/** Show shell immediately; refresh data in background (never block paint on API) */
async function enterApp() {
  try {
    localStorage.removeItem(ORDERS_CACHE_KEY);
  } catch {
    /* ignore */
  }
  const cachedProducts = readProductCache();

  if (cachedProducts?.length) {
    setProducts(cachedProducts, { cache: false });
  }
  showOrdersSkeleton();

  revealApp();

  try {
    // Orders first for home; stats prefetch in parallel (SWR paint when opened)
    await Promise.all([loadOrders(), loadProducts()]);
  } catch {
    if (!ordersCache.length) {
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
      await Promise.all([loadProducts({ fresh: true }), loadStats({ fresh: true })]);
    } else if (tab === "orders") {
      await Promise.all([
        refreshOrdersView({ fresh: true }),
        loadProducts({ fresh: true }),
      ]);
    } else {
      await Promise.all([loadProducts({ fresh: true }), loadOrders({ fresh: true })]);
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

window.addEventListener("hashchange", () => {
  const next = tabFromLocation();
  if (next !== activeTab) setTab(next, { fromUrl: true });
});

document.querySelector(".stats-filters")?.addEventListener("click", (e) => {
  const cal = e.target.closest("#stats-open-calendar");
  if (cal) {
    openStatsDateModal();
    return;
  }
  const btn = e.target.closest("[data-stats-range]");
  if (!btn) return;
  setStatsRange(btn.getAttribute("data-stats-range"));
});

statsDateModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.hasAttribute("data-close-stats-date") || t.closest("[data-close-stats-date]")) {
    closeStatsDateModal();
    return;
  }
  const modeBtn = t.closest("[data-stats-date-mode]");
  if (modeBtn) {
    const mode = modeBtn.getAttribute("data-stats-date-mode");
    if (mode === "day" || mode === "range") {
      statsDateMode = mode;
      if (mode === "day" && statsPickFrom) statsPickTo = statsPickFrom;
      paintStatsDateModal();
    }
    return;
  }
  if (t.closest("#stats-cal-prev")) {
    statsCalMonthYmd = addMonthsYmd(statsCalMonthYmd || vnYmd(), -1);
    paintStatsDateModal();
    return;
  }
  if (t.closest("#stats-cal-next")) {
    const next = addMonthsYmd(statsCalMonthYmd || vnYmd(), 1);
    const todayMonth = monthStartYmd(vnYmd());
    if (next <= todayMonth) {
      statsCalMonthYmd = next;
      paintStatsDateModal();
    }
    return;
  }
  if (t.closest("#stats-cal-apply")) {
    applyStatsDatePicker();
    return;
  }
  const dayBtn = t.closest("[data-cal-day]");
  if (dayBtn && !dayBtn.hasAttribute("disabled")) {
    onStatsCalDayClick(dayBtn.getAttribute("data-cal-day"));
  }
});

document.querySelector("#tab-orders .order-filters")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-order-filter]");
  if (!btn) return;
  const next = btn.getAttribute("data-order-filter");
  if (next !== "pending" && next !== "done") return;
  
  const prevFilter = orderFilter;
  orderFilter = next;
  if (next === "done") selectedOrderIds.clear();
  
  // Reset phân trang khi chuyển tab
  if (next !== "done") {
    doneTodayFilter = false;
    const cb = $("done-today-filter");
    if (cb) cb.checked = false;
  }
  donePage = 1;

  // Hiện/ẩn row filter hôm nay
  $("done-filter-row")?.classList.toggle("visible", next === "done");
  if (next === "pending") {
    paintOrdersBoard();
    return;
  }
  doneLoading = true;
  paintOrdersBoard();
  loadDoneOrders({ page: 1, today: next === "done" && doneTodayFilter }).catch((err) =>
    toast(err.message || "Không tải được đơn đã giao"),
  );
});

// Toggle filter hôm nay cho tab đã giao (dùng checkbox)
$("done-today-filter")?.addEventListener("change", () => {
  if (orderFilter !== "done") {
    orderFilter = "done";
    selectedOrderIds.clear();
  }
  doneTodayFilter = $("done-today-filter").checked;
  donePage = 1;
  doneOrdersCache = [];
  doneTotal = 0;
  doneLoading = true;
  paintOrdersBoard();
  loadDoneOrders({ page: 1, today: doneTodayFilter }).catch((err) =>
    toast(err.message || "Không tải được đơn đã giao"),
  );
});

$("done-to-top")?.addEventListener("click", () => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
});

window.addEventListener("scroll", queueDoneToTop, { passive: true });

$("done-pager-prev")?.addEventListener("click", () => {
  if (donePage > 1) {
    loadDoneOrders({ page: donePage - 1 })
      .then(() => scrollToFirstDoneOrder())
      .catch((err) => toast(err.message || "Không tải được trang"));
  }
});

$("done-pager-next")?.addEventListener("click", () => {
  if (donePage < doneTotalPages) {
    loadDoneOrders({ page: donePage + 1 })
      .then(() => scrollToFirstDoneOrder())
      .catch((err) => toast(err.message || "Không tải được trang"));
  }
});

function syncOrderSearchClear() {
  $("order-search-clear")?.classList.toggle(
    "hidden",
    !String(orderSearchQuery || "").trim(),
  );
}

function scheduleOrderSearchPaint() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = 0;
    runOrderSearch().catch((err) => toast(err.message || "Không tìm được đơn"));
  }, 200);
}

async function runOrderSearch() {
  const raw = String(orderSearchQuery || "").trim();
  const seq = ++searchSeq;
  if (!raw) {
    searchHits = null;
    paintOrdersBoard();
    return;
  }
  const q = foldVn(raw);
  const open = sortOrders(
    ordersCache.filter((o) => isOpenStatus(o.status) && matchesCustomerSearch(o, q)),
  );
  const params = new URLSearchParams({
    range: "done",
    q: raw,
    limit: "30",
    page: "1",
  });
  if (orderFilter === "done" && doneTodayFilter) params.set("delivered", "today");
  const data = await api(`/api/orders?${params}`);
  if (seq !== searchSeq) return;
  const openIds = new Set(open.map((o) => o.id));
  const done = (data.orders || [])
    .map((o) => ({ ...o, status: normalizeStatus(o.status) }))
    .filter((o) => !openIds.has(o.id));
  searchHits = [...open, ...done];
  paintOrdersBoard();
}

$("order-search")?.addEventListener("input", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  orderSearchQuery = t.value || "";
  syncOrderSearchClear();
  scheduleOrderSearchPaint();
});

$("order-search-clear")?.addEventListener("click", () => {
  const input = $("order-search");
  orderSearchQuery = "";
  if (input instanceof HTMLInputElement) {
    input.value = "";
    input.focus();
  }
  syncOrderSearchClear();
  searchSeq += 1;
  searchHits = null;
  paintOrdersBoard();
});

$("order-bulk")?.addEventListener("click", (e) => {
  const target = e.target;
  
  // Chọn hết / Bỏ chọn (button hoặc checkbox)
  if (target.id === "bulk-select-all" || target.closest("#bulk-select-all") ||
      target.id === "bulk-select-all-checkbox" || target.closest(".bulk-select-all-label")) {
    const isDoneTab = orderFilter === "done";
    const visibleIds = isDoneTab ? doneVisibleIds() : openVisibleIds();
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.has(id));
    if (allSelected) {
      selectedOrderIds.clear();
    } else {
      for (const id of visibleIds) selectedOrderIds.add(id);
    }
    paintOrdersBoard();
  }
  
  // In phiếu
  if (target.id === "bulk-export-pdf" || target.closest("#bulk-export-pdf")) {
    const ids = [...selectedOrderIds];
    if (!ids.length) {
      toast("Chọn ít nhất 1 đơn để in");
      return;
    }
    openPrintConfirm(ids);
  }
  
  // Đã giao (cho đơn chưa giao)
  if (target.id === "bulk-deliver" || target.closest("#bulk-deliver")) {
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
  }
  
  // Hoàn tác giao (cho đơn đã giao)
  if (target.id === "bulk-undo-deliver" || target.closest("#bulk-undo-deliver")) {
    const ids = [...selectedOrderIds];
    if (!ids.length) return;
    const doneIds = ids.filter((id) => {
      const o = doneOrdersCache.find(x => x.id === id);
      return o && normalizeStatus(o.status) === "done";
    });
    if (!doneIds.length) {
      toast("Không có đơn đã giao trong lựa chọn");
      return;
    }
    bulkUndoDeliver(doneIds);
  }
  
  // Hủy thanh toán hàng loạt (cho đơn đã giao)
  if (target.id === "bulk-unpaid" || target.closest("#bulk-unpaid")) {
    const ids = [...selectedOrderIds];
    if (!ids.length) return;
    const paidIds = ids.filter((id) => {
      const o = doneOrdersCache.find(x => x.id === id);
      return o && Number(o.paid_at) > 0;
    });
    if (!paidIds.length) {
      toast("Không có đơn đã thanh toán trong lựa chọn");
      return;
    }
    bulkUnpaid(paidIds);
  }
  
  // Xóa hàng loạt
  if (target.id === "bulk-delete" || target.closest("#bulk-delete")) {
    const ids = [...selectedOrderIds];
    if (!ids.length) return;
    openDeleteOrderModal(ids);
  }
});

// Giữ lại event listener cũ cho backwards compatibility
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

$("open-prepare")?.addEventListener("click", () => {
  openPrepareForPendingOrders();
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

/**
 * Hoàn tác đã giao hàng loạt
 * @param {string[]} ids
 */
async function bulkUndoDeliver(ids) {
  if (!ids.length) return;
  const confirmMsg = `Hoàn tác ${ids.length} đơn đã giao về trạng thái chưa giao?`;
  if (!confirm(confirmMsg)) return;
  
  selectedOrderIds.clear();
  await setOrdersStatusBulk(ids, "pending");
  paintOrdersBoard();
}

/**
 * Hủy thanh toán hàng loạt
 * @param {string[]} ids
 */
async function bulkUnpaid(ids) {
  if (!ids.length) return;
  const confirmMsg = `Hủy thanh toán cho ${ids.length} đơn đã chọn?`;
  if (!confirm(confirmMsg)) return;
  
  selectedOrderIds.clear();
  await setOrdersPaidBulk(ids, false);
  paintOrdersBoard();
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

$("confirm-unpaid-order")?.addEventListener("click", () => {
  const id = pendingUnpaidId;
  closeUnpaidConfirm();
  if (id) unmarkOrderPaid(id);
});

document.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (
    t.hasAttribute("data-close-unpaid-confirm") ||
    t.closest("[data-close-unpaid-confirm]")
  ) {
    closeUnpaidConfirm();
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

prepareModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.hasAttribute("data-close-prepare") || t.closest("[data-close-prepare]")) {
    closePrepareSummary();
  }
});

deliveredListModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest("#delivered-list-prev")) {
    if (statsModalPage > 1) {
      loadStatsOrdersModalPage(statsModalPage - 1).catch((err) =>
        toast(err.message || "Không tải được trang"),
      );
    }
    return;
  }
  if (t.closest("#delivered-list-next")) {
    if (statsModalPage < statsModalTotalPages) {
      loadStatsOrdersModalPage(statsModalPage + 1).catch((err) =>
        toast(err.message || "Không tải được trang"),
      );
    }
    return;
  }
  if (
    t.hasAttribute("data-close-delivered-list") ||
    t.closest("[data-close-delivered-list]")
  ) {
    closeDeliveredListModal();
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
  const cloneBtn = t.closest("[data-clone-order]");
  if (cloneBtn) {
    const id = cloneBtn.getAttribute("data-clone-order");
    const order = findOrder(id);
    if (order) openCloneOrderModal(order);
    return;
  }
  const deleteBtn = t.closest("[data-delete-order]");
  if (deleteBtn) {
    const id = deleteBtn.getAttribute("data-delete-order");
    if (id) openDeleteOrderModal([id]);
    return;
  }
  const paidBtn = t.closest("[data-mark-paid]");
  if (paidBtn) {
    const id = paidBtn.getAttribute("data-mark-paid");
    if (id) markOrderPaid(id);
    return;
  }
  const unpaidBtn = t.closest("[data-unmark-paid]");
  if (unpaidBtn) {
    const id = unpaidBtn.getAttribute("data-unmark-paid");
    if (id) openUnpaidConfirm(id);
    return;
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
  if (!prepareModal?.classList.contains("hidden")) closePrepareSummary();
  else if (!deliveredListModal?.classList.contains("hidden")) closeDeliveredListModal();
  else if (!statsDateModal?.classList.contains("hidden")) closeStatsDateModal();
  else if (!unpaidConfirmModal?.classList.contains("hidden")) closeUnpaidConfirm();
  else if (!deliverConfirmModal?.classList.contains("hidden")) closeDeliverConfirm();
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
  if (!cloningOrder && !editingOrder) return;
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
  const village = selectedVillage("edit_village");
  if (!village) {
    showComposeIssue(
      $("edit-order-village-options")?.closest(".slot-field") ||
        $("edit-order-village-options"),
      "Chọn thôn giao hàng",
    );
    return;
  }
  const delivery_date =
    selectedDeliveryDate("edit_delivery_date") || defaultDeliveryYmd();
  const payload = {
    items: editOrderItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      size: normalizeSize(item.size),
      image: item.image || resolveItemImage(item),
      qty: item.qty,
      category: item.category === "tra-sua" ? "tra-sua" : "banh-trang",
    })),
    delivery_date,
    village,
    customer,
    phone: $("edit-order-phone").value.trim(),
    note: $("edit-order-note").value.trim(),
  };
  const label = saveEditOrderBtn?.querySelector(".btn-label");
  saveEditOrderBtn.disabled = true;
  saveEditOrderBtn.classList.add("is-busy");
  if (label) label.textContent = cloningOrder ? "Đang tạo..." : "Đang lưu...";
  try {
    if (cloningOrder) {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      clearComposeInvalid(editOrderModal);
      closeEditOrderModal();
      toast("Đã nhân bản đơn");
    } else {
      await api(`/api/orders/${encodeURIComponent(editingOrder.id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      clearComposeInvalid(editOrderModal);
      closeEditOrderModal();
      toast("Đã cập nhật đơn");
    }
    await Promise.all([refreshOrdersView(), loadProducts()]);
    if (!$("tab-stats")?.classList.contains("hidden")) {
      loadStats().catch(() => {});
    }
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
  syncEditPreviewEmpty();
});

document.querySelectorAll("[data-open-create-order]").forEach((btn) => {
  btn.addEventListener("click", () => openCreateOrder());
});

$("open-create-product")?.addEventListener("click", () => {
  openCreateProductModal();
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

function showCreatedOrder(order) {
  orderFilter = "pending";
  orderSearchQuery = "";
  searchHits = null;
  const search = $("order-search");
  if (search instanceof HTMLInputElement) search.value = "";
  syncOrderSearchClear();
  $("done-filter-row")?.classList.remove("visible");
  const next = {
    ...order,
    status: "pending",
    items: Array.isArray(order.items) ? order.items : [],
    note: order.note || "",
    customer: order.customer || "",
    phone: order.phone || "",
    village: order.village || "",
    delivery_slot: order.delivery_slot || "",
    delivery_date: order.delivery_date || "",
    printed_at: null,
    delivered_at: null,
    paid_at: null,
  };
  ordersCache = sortOrders([
    next,
    ...ordersCache.filter((row) => row.id !== next.id),
  ]);
  if (serverOpenCount != null) serverOpenCount += 1;
  for (const line of next.items) {
    const product = products.find((row) => row.id === line.id);
    if (!product) continue;
    product.sold_count =
      Math.max(0, Number(product.sold_count) || 0) + (Number(line.qty) || 0);
  }
  writeProductCache(products);
  paintOrdersBoard();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

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
  const village = selectedVillage("village");
  if (!village) {
    showComposeIssue(
      $("order-village-options")?.closest(".slot-field") || $("order-village-options"),
      "Chọn thôn giao hàng",
    );
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
    category: line.category === "tra-sua" ? "tra-sua" : "banh-trang",
  }));
  const label = saveBtn.querySelector(".btn-label");
  saveBtn.disabled = true;
  saveBtn.classList.add("is-busy");
  if (label) label.textContent = "Đang tạo...";
  try {
    const data = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        items,
        delivery_date,
        village,
        customer,
        phone: $("customer-phone").value.trim(),
        note: $("order-note").value.trim(),
      }),
    });
    cart = [];
    clearComposeInvalid(orderModal);
    closeOrderModal();
    if (data?.order?.id) showCreatedOrder(data.order);
    else await refreshOrdersView();
    toast("Đã tạo đơn");
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
  if (!creatingProduct && !editingProduct) return;

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
  if (creatingProduct && !pendingImageFile) {
    toast("Chọn ảnh sản phẩm");
    return;
  }

  const form = new FormData();
  form.set("name", name);
  form.set("price", String(price));
  form.set("cost", String(cost));
  form.set("price_large", String(price_large));
  form.set("cost_large", String(cost_large));
  form.set("category", selectedProductCategory());
  if (pendingImageFile) form.set("image", pendingImageFile);

  const label = saveProductBtn.querySelector(".btn-label");
  const idleLabel =
    label?.textContent || (creatingProduct ? "Thêm sản phẩm" : "Lưu sản phẩm");
  saveProductBtn.disabled = true;
  saveProductBtn.classList.add("is-busy");
  if (label) label.textContent = creatingProduct ? "Đang thêm..." : "Đang lưu...";
  try {
    if (creatingProduct) {
      const data = await api("/api/products", { method: "POST", body: form });
      setProducts([data.product, ...products]);
      closeEditModal();
      toast("Đã thêm sản phẩm");
    } else {
      const id = editingProduct.id;
      const data = await api(`/api/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: form,
      });
      const next = products.map((p) => (p.id === id ? data.product : p));
      setProducts(next);
      closeEditModal();
      toast("Đã cập nhật sản phẩm");
    }
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
