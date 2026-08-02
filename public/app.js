const $ = (id) => document.getElementById(id);

const loginEl = $("login");
const appEl = $("app");
const menuEl = $("menu");
const ordersEl = $("orders");
const orderModal = $("order-modal");
const editOrderModal = $("edit-order-modal");
const editModal = $("edit-modal");
const deleteModal = $("delete-modal");
const toastEl = $("toast");
const viewTitle = $("view-title");
const ordersBadge = $("orders-badge");
const ordersCount = $("orders-count");
const saveBtn = $("save-order");
const saveEditOrderBtn = $("save-edit-order");
const saveProductBtn = $("save-product");
const confirmDeleteBtn = $("confirm-delete");
const editPreview = $("edit-preview");
const editImageInput = $("edit-image");
const editOrderQtyEl = $("edit-order-qty");
const editOrderMeta = $("edit-order-meta");

const PRODUCT_CACHE_KEY = "bt_products_v1";

/** @type {Map<string, number>} */
const qtyMap = new Map();
/** @type {Array<{id:string,name:string,price:number,image:string,updated_at?:number}>} */
let products = [];
/** @type {Array<any>} */
let ordersCache = [];
/** @type {'pending'|'done'|'all'} */
let orderFilter = "pending";
/** @type {Set<string>} */
const statusBusy = new Set();
/** @type {Set<string>} */
const selectedOrderIds = new Set();
/** @type {{id:string,name:string,price:number,image:string,updated_at?:number}|null} */
let pendingProduct = null;
/** @type {{id:string,name:string,price:number,image:string,updated_at?:number}|null} */
let editingProduct = null;
/** @type {{id:string,name:string,price:number,image:string,updated_at?:number}|null} */
let deletingProduct = null;
/** @type {any} */
let editingOrder = null;
let editOrderQty = 1;
/** @type {File|null} */
let pendingImageFile = null;
let previewObjectUrl = "";

const EDIT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"/></svg>`;
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
const PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`;

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});

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

function imageUrl(product) {
  const bust = product.updated_at ? `?v=${product.updated_at}` : "";
  return `/images/${encodeURIComponent(product.image)}${bust}`;
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

function finishBoot() {
  document.documentElement.classList.remove("booting");
}

function showLogin() {
  appEl.classList.add("hidden");
  loginEl.classList.remove("hidden");
  finishBoot();
}

function revealApp() {
  loginEl.classList.add("hidden");
  appEl.classList.remove("hidden");
  setTab("products");
  finishBoot();
}

function computeStats() {
  const costMap = new Map(products.map((p) => [p.id, Number(p.cost) || 0]));
  let revenue = 0;
  let revenueDone = 0;
  let profit = 0;
  let profitDone = 0;
  let pending = 0;
  let done = 0;
  let revTrua = 0;
  let revChieu = 0;
  /** @type {Map<string, {name:string, qty:number, revenue:number}>} */
  const byProduct = new Map();

  for (const o of ordersCache) {
    const status = normalizeStatus(o.status);
    const total = Number(o.total) || 0;
    revenue += total;
    if (status === "done") {
      done += 1;
      revenueDone += total;
    } else {
      pending += 1;
    }
    if (o.delivery_slot === "trua") revTrua += total;
    else if (o.delivery_slot === "chieu") revChieu += total;

    for (const item of o.items || []) {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      const cost = costMap.has(item.id)
        ? Number(costMap.get(item.id))
        : Math.round(price * 0.55);
      const lineRev = qty * price;
      const lineProfit = qty * (price - cost);
      profit += lineProfit;
      if (status === "done") profitDone += lineProfit;
      const prev = byProduct.get(item.id) || {
        name: item.name,
        qty: 0,
        revenue: 0,
      };
      prev.qty += qty;
      prev.revenue += lineRev;
      byProduct.set(item.id, prev);
    }
  }

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    totalOrders: ordersCache.length,
    pending,
    done,
    revenue,
    revenueDone,
    profit,
    profitDone,
    revTrua,
    revChieu,
    topProducts,
  };
}

function renderStats() {
  const root = $("stats");
  if (!root) return;
  const s = computeStats();
  if (!s.totalOrders) {
    root.innerHTML = `<p class="empty">Chưa có đơn hôm nay để thống kê.</p>`;
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
    <p class="stats-kicker">Hôm nay · Asia/Ho Chi Minh</p>
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
        </article>
        <article class="stats-card">
          <span>Giao chiều</span>
          <strong>${vnd.format(s.revChieu)}</strong>
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
  const span = menuEl.querySelector(`[data-qty="${CSS.escape(id)}"]`);
  if (span) span.textContent = String(q);
}

function anyModalOpen() {
  return (
    !orderModal.classList.contains("hidden") ||
    !editOrderModal.classList.contains("hidden") ||
    !editModal.classList.contains("hidden") ||
    !deleteModal.classList.contains("hidden")
  );
}

function lockBody(lock) {
  document.body.style.overflow = lock || anyModalOpen() ? "hidden" : "";
}

function renderMenu() {
  const frag = document.createDocumentFragment();
  for (const p of products) {
    if (!qtyMap.has(p.id)) qtyMap.set(p.id, 1);
    const q = getQty(p.id);
    const row = document.createElement("article");
    row.className = "product";
    row.innerHTML = `
      <div class="product-fabs">
        <button type="button" class="fab" data-edit="${escapeHtml(p.id)}" aria-label="Sửa ${escapeHtml(p.name)}">
          ${EDIT_ICON}
        </button>
        <button type="button" class="fab danger" data-delete="${escapeHtml(p.id)}" aria-label="Xóa ${escapeHtml(p.name)}">
          ${DELETE_ICON}
        </button>
      </div>
      <img class="product-thumb" src="${imageUrl(p)}" alt="" width="76" height="76" decoding="async" />
      <div class="product-body">
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <p class="price">${vnd.format(p.price)}</p>
        </div>
        <div class="product-actions">
          <div class="qty">
            <button type="button" data-minus="${escapeHtml(p.id)}" aria-label="Giảm">−</button>
            <span data-qty="${escapeHtml(p.id)}">${q}</span>
            <button type="button" data-plus="${escapeHtml(p.id)}" aria-label="Tăng">+</button>
          </div>
          <button type="button" class="btn primary add" data-add="${escapeHtml(p.id)}">${PLUS_ICON}<span>Thêm</span></button>
        </div>
      </div>
    `;
    frag.appendChild(row);
  }
  menuEl.replaceChildren(frag);
}

function setProducts(list, { render = true, cache = true } = {}) {
  products = list;
  if (cache) writeProductCache(list);
  if (render) renderMenu();
}

function resolveItemImage(item) {
  if (item.image) return item.image;
  const p = products.find((x) => x.id === item.id);
  return p?.image || "";
}

function normalizeStatus(status) {
  return status === "done" ? "done" : "pending";
}

function pendingVisibleIds() {
  return ordersCache
    .filter((o) => normalizeStatus(o.status) === "pending")
    .filter((o) => orderFilter === "all" || orderFilter === "pending")
    .map((o) => o.id);
}

function updateBulkBar() {
  const bulk = $("order-bulk");
  const selectAllBtn = $("bulk-select-all");
  const countEl = $("bulk-selected-count");
  if (!bulk || !selectAllBtn || !countEl) return;

  const pendingIds = pendingVisibleIds();
  for (const id of [...selectedOrderIds]) {
    if (!pendingIds.includes(id)) selectedOrderIds.delete(id);
  }

  const n = selectedOrderIds.size;
  const show = n > 0 && orderFilter !== "done";
  bulk.classList.toggle("hidden", !show);
  bulk.setAttribute("aria-hidden", show ? "false" : "true");
  document.body.classList.toggle("bulk-open", show);
  countEl.textContent = String(n);
  selectAllBtn.textContent =
    n > 0 && n === pendingIds.length ? "Bỏ chọn" : "Chọn tất cả";
}

function updateOrderFilterCounts() {
  const pending = ordersCache.filter((o) => normalizeStatus(o.status) === "pending").length;
  const done = ordersCache.filter((o) => normalizeStatus(o.status) === "done").length;
  const all = ordersCache.length;
  const countPending = $("count-pending");
  const countDone = $("count-done");
  const countAll = $("count-all");
  if (countPending) countPending.textContent = String(pending);
  if (countDone) countDone.textContent = String(done);
  if (countAll) countAll.textContent = String(all);
  ordersCount.textContent = String(
    orderFilter === "pending" ? pending : orderFilter === "done" ? done : all,
  );
  if (pending > 0) {
    ordersBadge.textContent = String(pending);
    ordersBadge.classList.remove("hidden");
  } else {
    ordersBadge.classList.add("hidden");
  }
  document.querySelectorAll(".order-filter").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-order-filter") === orderFilter);
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
    const slotDiff = slotRank(a.delivery_slot) - slotRank(b.delivery_slot);
    if (slotDiff !== 0) return slotDiff;
    return Number(b.created_at) - Number(a.created_at);
  });
}

function renderOrders(orders) {
  ordersCache = sortOrders(
    (orders || []).map((o) => ({
      ...o,
      status: normalizeStatus(o.status),
    })),
  );
  updateOrderFilterCounts();

  const visible =
    orderFilter === "all"
      ? ordersCache
      : ordersCache.filter((o) => normalizeStatus(o.status) === orderFilter);

  if (!ordersCache.length) {
    ordersEl.innerHTML = `<p class="empty">Chưa có đơn hôm nay.</p>`;
    return;
  }
  if (!visible.length) {
    ordersEl.innerHTML = `<p class="empty">${
      orderFilter === "pending"
        ? "Không còn đơn chưa giao."
        : orderFilter === "done"
          ? "Chưa có đơn đã giao."
          : "Chưa có đơn hôm nay."
    }</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const o of visible) {
    const el = document.createElement("article");
    const status = normalizeStatus(o.status);
    el.className = `order order-${status}`;
    el.dataset.orderId = o.id;
    const first = o.items[0];
    const imgKey = first ? resolveItemImage(first) : "";
    const imgSrc = imgKey
      ? `/images/${encodeURIComponent(imgKey)}`
      : "";
    const linesHtml = o.items
      .map(
        (i) =>
          `<span class="order-line"><span class="order-qty">${i.qty}×</span> <span class="order-name">${escapeHtml(i.name)}</span></span>`,
      )
      .join("");
    const bits = [o.customer, o.phone, o.note].filter(Boolean);
    const slot = o.delivery_slot === "chieu" ? "chieu" : o.delivery_slot === "trua" ? "trua" : "";
    const slotText = slotLabel(slot);
    const statusText = status === "done" ? "Đã giao" : "Chưa giao";
    const checked = selectedOrderIds.has(o.id) ? "checked" : "";
    el.innerHTML = `
      <header class="order-head">
        <div class="order-head-left">
          ${
            status === "pending"
              ? `<label class="order-check">
                  <input type="checkbox" data-select-order="${escapeHtml(o.id)}" ${checked} />
                  <span></span>
                </label>`
              : ""
          }
          <span class="time">${timeFmt.format(o.created_at)}</span>
          <div class="order-badges">
            <span class="order-status order-status-${status}">${statusText}</span>
            ${
              slotText
                ? `<span class="order-slot order-slot-${slot}">${escapeHtml(slotText)}</span>`
                : ""
            }
          </div>
        </div>
        <div class="order-head-right">
          <span class="total">${vnd.format(o.total)}</span>
        </div>
      </header>
      <div class="order-main">
        ${
          imgSrc
            ? `<img class="order-thumb" src="${imgSrc}" alt="" width="72" height="72" decoding="async" />`
            : `<div class="order-thumb order-thumb-empty" aria-hidden="true"></div>`
        }
        <div class="order-info">
          <p class="lines">${linesHtml}</p>
          ${
            bits.length
              ? `<p class="sub">${escapeHtml(bits.join(" · "))}</p>`
              : `<p class="sub sub-empty">Chưa có thông tin khách</p>`
          }
        </div>
      </div>
      <div class="order-actions">
        <button type="button" class="order-status-btn order-status-btn-${status}" data-toggle-status="${escapeHtml(o.id)}">
          ${status === "done" ? "Hoàn tác · Chưa giao" : "Đánh dấu đã giao"}
        </button>
        <button type="button" class="order-edit-icon" data-edit-order="${escapeHtml(o.id)}" aria-label="Sửa đơn">
          ${EDIT_ICON}
        </button>
      </div>
    `;
    frag.appendChild(el);
  }
  ordersEl.replaceChildren(frag);
  updateBulkBar();
}

async function setOrderStatus(id, status) {
  if (statusBusy.has(id)) return;
  const prev = ordersCache.find((o) => o.id === id);
  if (!prev) return;
  const old = normalizeStatus(prev.status);
  const next = normalizeStatus(status);
  if (old === next) return;

  statusBusy.add(id);
  prev.status = next;
  if (next === "done") selectedOrderIds.delete(id);
  renderOrders(ordersCache);

  try {
    await api(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
  } catch (err) {
    prev.status = old;
    renderOrders(ordersCache);
    toast(err.message || "Không cập nhật được");
  } finally {
    statusBusy.delete(id);
  }
}

async function setOrdersStatusBulk(ids, status) {
  const next = normalizeStatus(status);
  const targets = ids
    .map((id) => ordersCache.find((o) => o.id === id))
    .filter((o) => o && normalizeStatus(o.status) !== next);
  if (!targets.length) return;

  const snapshot = targets.map((o) => ({ id: o.id, status: o.status }));
  for (const o of targets) {
    o.status = next;
    selectedOrderIds.delete(o.id);
  }
  renderOrders(ordersCache);

  try {
    await api("/api/orders/status-bulk", {
      method: "POST",
      body: JSON.stringify({
        ids: targets.map((o) => o.id),
        status: next,
      }),
    });
    toast(next === "done" ? `Đã giao ${targets.length} đơn` : "Đã hoàn tác");
  } catch (err) {
    for (const s of snapshot) {
      const o = ordersCache.find((x) => x.id === s.id);
      if (o) o.status = s.status;
    }
    renderOrders(ordersCache);
    toast(err.message || "Không cập nhật được");
  }
}

function setTab(tab) {
  $("tab-products").classList.toggle("hidden", tab !== "products");
  $("tab-orders").classList.toggle("hidden", tab !== "orders");
  $("tab-stats")?.classList.toggle("hidden", tab !== "stats");
  viewTitle.textContent =
    tab === "products" ? "Sản phẩm" : tab === "orders" ? "Đơn hàng" : "Thống kê";
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-go") === tab);
  });
  if (tab !== "orders") {
    selectedOrderIds.clear();
    updateBulkBar();
  }
  if (tab === "orders") {
    loadOrders().catch(() => {});
  } else if (tab === "stats") {
    const paint = () => renderStats();
    if (!ordersCache.length) loadOrders().then(paint).catch(paint);
    else paint();
  }
}

function slotLabel(slot) {
  if (slot === "trua") return "Giao trưa";
  if (slot === "chieu") return "Giao chiều";
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

function refreshEditOrderMeta() {
  if (!editingOrder?.items?.[0]) return;
  const item = editingOrder.items[0];
  editOrderQtyEl.textContent = String(editOrderQty);
  editOrderMeta.textContent = `${editOrderQty} phần · ${vnd.format(item.price * editOrderQty)}`;
}

function openEditOrderModal(order) {
  editingOrder = order;
  const item = order.items?.[0];
  if (!item) {
    toast("Đơn không hợp lệ");
    return;
  }
  editOrderQty = Math.max(1, Math.min(99, Number(item.qty) || 1));
  $("edit-order-title").textContent = item.name;
  $("edit-order-product-name").textContent = item.name;
  const imgKey = resolveItemImage(item);
  $("edit-order-thumb").src = imgKey
    ? `/images/${encodeURIComponent(imgKey)}`
    : "";
  $("edit-order-customer").value = order.customer || "";
  $("edit-order-phone").value = order.phone || "";
  $("edit-order-note").value = order.note || "";
  setDeliverySlot(
    "edit_delivery_slot",
    order.delivery_slot === "chieu" ? "chieu" : "trua",
  );
  refreshEditOrderMeta();
  editOrderModal.classList.remove("hidden");
  editOrderModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("edit-order-customer").focus());
}

function closeEditOrderModal() {
  editingOrder = null;
  editOrderModal.classList.add("hidden");
  editOrderModal.setAttribute("aria-hidden", "true");
  lockBody(false);
}

function openOrderModal(product) {
  pendingProduct = product;
  const qty = getQty(product.id);
  $("modal-title").textContent = product.name;
  $("modal-meta").textContent = `${qty} phần · ${vnd.format(product.price * qty)}`;
  $("customer-name").value = "";
  $("customer-phone").value = "";
  $("order-note").value = "";
  const trua = document.querySelector('input[name="delivery_slot"][value="trua"]');
  if (trua instanceof HTMLInputElement) trua.checked = true;
  orderModal.classList.remove("hidden");
  orderModal.setAttribute("aria-hidden", "false");
  lockBody(true);
  requestAnimationFrame(() => $("customer-name").focus());
}

function closeOrderModal() {
  pendingProduct = null;
  orderModal.classList.add("hidden");
  orderModal.setAttribute("aria-hidden", "true");
  lockBody(false);
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
  $("delete-meta").textContent = vnd.format(product.price);
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

async function loadProducts() {
  const data = await api("/api/products");
  setProducts(data.products || []);
}

async function loadOrders() {
  const data = await api("/api/orders");
  renderOrders(data.orders || []);
}

/** Enter app only after menu is ready — no empty-shell flash */
async function enterApp() {
  const cached = readProductCache();
  if (cached?.length) {
    setProducts(cached, { cache: false });
    revealApp();
    loadProducts().catch(() => {});
  } else {
    await loadProducts();
    revealApp();
  }
  loadOrders().catch(() => {});
}

async function boot() {
  try {
    const me = await api("/api/me");
    if (me.ok) await enterApp();
    else showLogin();
  } catch {
    showLogin();
  }
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("login-error");
  errorEl.textContent = "";
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: $("password").value }),
    });
    await enterApp();
  } catch (err) {
    errorEl.textContent = err.message || "Sai mật khẩu";
    finishBoot();
  }
});

$("logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  qtyMap.clear();
  closeOrderModal();
  closeEditOrderModal();
  closeEditModal();
  closeDeleteModal();
  showLogin();
  $("password").value = "";
});

document.querySelector(".tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-go]");
  if (!btn) return;
  setTab(btn.getAttribute("data-go"));
});

document.querySelector(".order-filters")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-order-filter]");
  if (!btn) return;
  const next = btn.getAttribute("data-order-filter");
  if (next !== "pending" && next !== "done" && next !== "all") return;
  orderFilter = next;
  if (next === "done") selectedOrderIds.clear();
  renderOrders(ordersCache);
});

$("bulk-select-all")?.addEventListener("click", () => {
  const pendingIds = pendingVisibleIds();
  const allSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedOrderIds.has(id));
  if (allSelected) {
    selectedOrderIds.clear();
  } else {
    for (const id of pendingIds) selectedOrderIds.add(id);
  }
  renderOrders(ordersCache);
});

$("bulk-clear")?.addEventListener("click", () => {
  selectedOrderIds.clear();
  renderOrders(ordersCache);
});

$("bulk-deliver")?.addEventListener("click", () => {
  const ids = [...selectedOrderIds];
  if (!ids.length) return;
  setOrdersStatusBulk(ids, "done");
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
  const statusBtn = t.closest("[data-toggle-status]");
  if (statusBtn) {
    const id = statusBtn.getAttribute("data-toggle-status");
    const order = ordersCache.find((o) => o.id === id);
    if (!order) return;
    const next = normalizeStatus(order.status) === "done" ? "pending" : "done";
    setOrderStatus(id, next);
    return;
  }
  const btn = t.closest("[data-edit-order]");
  if (!btn) return;
  const id = btn.getAttribute("data-edit-order");
  const order = ordersCache.find((o) => o.id === id);
  if (order) openEditOrderModal(order);
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
    if (product) openOrderModal(product);
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
  if (!deleteModal.classList.contains("hidden")) closeDeleteModal();
  else if (!editOrderModal.classList.contains("hidden")) closeEditOrderModal();
  else if (!editModal.classList.contains("hidden")) closeEditModal();
  else if (!orderModal.classList.contains("hidden")) closeOrderModal();
});

$("edit-order-minus").addEventListener("click", () => {
  editOrderQty = Math.max(1, editOrderQty - 1);
  refreshEditOrderMeta();
});

$("edit-order-plus").addEventListener("click", () => {
  editOrderQty = Math.min(99, editOrderQty + 1);
  refreshEditOrderMeta();
});

$("edit-order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingOrder?.items?.[0]) return;
  const item = editingOrder.items[0];
  const delivery_slot = selectedDeliverySlot("edit_delivery_slot");
  if (delivery_slot !== "trua" && delivery_slot !== "chieu") {
    toast("Chọn giao trưa hoặc giao chiều");
    return;
  }
  saveEditOrderBtn.disabled = true;
  try {
    await api(`/api/orders/${encodeURIComponent(editingOrder.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        items: [
          {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image || resolveItemImage(item),
            qty: editOrderQty,
          },
        ],
        delivery_slot,
        customer: $("edit-order-customer").value.trim(),
        phone: $("edit-order-phone").value.trim(),
        note: $("edit-order-note").value.trim(),
      }),
    });
    closeEditOrderModal();
    toast("Đã cập nhật đơn");
    await loadOrders();
  } catch (err) {
    toast(err.message || "Không lưu được");
  } finally {
    saveEditOrderBtn.disabled = false;
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

$("order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pendingProduct) return;

  const product = pendingProduct;
  const qty = getQty(product.id);
  const delivery_slot = selectedDeliverySlot();
  if (delivery_slot !== "trua" && delivery_slot !== "chieu") {
    toast("Chọn giao trưa hoặc giao chiều");
    return;
  }
  saveBtn.disabled = true;
  try {
    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty,
          },
        ],
        delivery_slot,
        customer: $("customer-name").value.trim(),
        phone: $("customer-phone").value.trim(),
        note: $("order-note").value.trim(),
      }),
    });
    setQty(product.id, 1);
    closeOrderModal();
    toast("Đã lưu đơn");
    await loadOrders();
  } catch (err) {
    toast(err.message || "Không lưu được");
  } finally {
    saveBtn.disabled = false;
  }
});

$("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingProduct) return;

  const id = editingProduct.id;
  const name = $("edit-name").value.trim();
  const price = Math.floor(Number($("edit-price").value));
  const cost = Math.floor(Number($("edit-cost").value));
  if (
    !name ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(cost) ||
    cost < 0
  ) {
    toast("Thông tin chưa hợp lệ");
    return;
  }

  const form = new FormData();
  form.set("name", name);
  form.set("price", String(price));
  form.set("cost", String(cost));
  if (pendingImageFile) form.set("image", pendingImageFile);

  saveProductBtn.disabled = true;
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
  }
});

boot();
