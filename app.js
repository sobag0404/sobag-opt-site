const {
  buttonLabel,
  phoneHref,
  formatPhoneNumber,
  phoneDigits,
  pluralRu,
  productWord,
  variantWord,
  reviewWord,
  formatMoney,
  escapeHtml,
  splitList,
  parseDelimitedText,
  normalizeBaseSku,
  baseSkuKey,
  csvCell,
  normalizeImportHeader,
  priceImportValue
} = window.SobagAppUtils || {};
if (!window.SobagAppUtils) throw new Error("components/app-utils.js must load before app.js");
const {
  TYPE_OPTIONS,
  SIZE_OPTIONS,
  MATERIAL_OPTIONS,
  sizeFactors,
  materialFactors,
  typeFactors,
  quantityTiers,
  MIN_CART_TOTAL,
  basketDiscountTiers,
  catalogCategories,
  catalogCollections,
  catalogHolidays,
  actualItems,
  taxonomyAliases,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  defaultSiteContent,
  siteTextFields,
  siteTextFieldPages,
  adminPageAnchors,
  siteTextFieldGroups,
  productDrafts,
  FAVORITES_KEY,
  FAVORITES_PREFIX,
  PROTOTYPE_PRODUCT_IDS,
  STORAGE,
  PUBLIC_API_CACHE_PREFIX,
  PUBLIC_API_CACHE_TTL_MS,
  PUBLIC_API_CACHE_MAX_ENTRIES,
  productTemplateColumns,
  productExportOnlyColumns,
  productExportColumns,
  productColumnAliases,
  variantPriceExportColumns
} = window.SobagAppData || {};
if (!window.SobagAppData) throw new Error("components/app-data.js must load before app.js");
const {
  normalizeCatalogList,
  replacePrototypeImage,
  normalizeActualSlides,
  normalizeSiteContent,
  routeKey,
  isPublicApiCacheable,
  publicApiCacheKey,
  getPublicApiCache,
  trimPublicApiCache,
  rememberPublicApiCache,
  brandNameHtml,
  renderTextField,
  imageAttrs,
  prefersReducedMotion,
  pulseNode,
  setTextWithPop,
  orderStatusLabel,
  orderStatusOptions,
  orderHistoryEntry,
  normalizeOrderCommentText,
  normalizeOrderThread,
  orderThreadEntry
} = window.SobagContentUtils || {};
if (!window.SobagContentUtils) throw new Error("components/app-content-utils.js must load before app.js");
const {
  productStatusFromValue,
  normalizeProductStatus,
  productStatusLabel,
  isProductPublished,
  createVariants,
  variantNameForType,
  startsWithProductWord,
  replaceLeadingProductWord,
  variantNameWithSpecs,
  skuPart,
  skuSizePart,
  normalizeTaxonomyItem,
  uniqueList,
  normalizeListField,
  normalizeTags,
  productHasCollection,
  productHasHoliday,
  productHasCategory,
  normalizeProductImageMetadata,
  normalizeProductImages,
  resolveProductImageUrl,
  normalizeProductImageUrls,
  productImageMetadataUrl,
  productImageMetadataForUrl,
  PRODUCT_IMAGE_SIZES,
  productImageVariantCandidates,
  srcsetFromImageVariants,
  productImageVariantSrcsetForFormat,
  productImageVariantSrcsetValue,
  productImageVariantSourceData,
  productImageSourcesHtml,
  productPictureHtml,
  applyProductImageVariantSrcset,
  normalizeProduct
} = window.SobagProductUtils || {};
if (!window.SobagProductUtils) throw new Error("components/app-product-utils.js must load before app.js");
let products = loadProducts();
let actualSlideIndex = 0;
let actualSlideTimer = null;
let lastFocusedElement = null;
let catalogHomeHasAnimated = false;
const CATALOG_PAGE_SIZE = 48;
const SERVER_CATALOG_PAGE_SIZE = CATALOG_PAGE_SIZE;
const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const state = {
  filters: {
    category: new Set(),
    collection: new Set(),
    holiday: new Set(),
    size: new Set(),
    material: new Set(),
  },
  filterSearch: {},
  selectedCategory: "",
  selectedCollection: "",
  selectedHoliday: "",
  search: "",
  sort: "popular",
  visibleLimit: CATALOG_PAGE_SIZE,
  serverCatalog: {
    status: "idle",
    key: "",
    requestId: 0,
    items: [],
    total: 0,
    facets: {},
    facetOptions: {},
    nextCursor: "",
    hasMore: false,
    source: "",
    loadingMore: false,
  },
  catalogHomeSummary: {
    status: "idle",
    counts: {},
    source: "",
  },
  cart: new Map(),
  cartUpdatedAt: "",
  favorites: new Set(cleanFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"))),
  recentProducts: cleanFavoriteIds(JSON.parse(localStorage.getItem(STORAGE.recentProducts) || "[]")),
  currentUser: localStorage.getItem(STORAGE.user) || "",
  activeProductId: null,
  activeVariant: {
    type: "Подушка",
    size: "40x40",
    material: "Габардин",
    qty: 1,
  },
  productReviews: [],
  adminReviews: [],
  adminPreview: [],
  backendSession: {
    checked: false,
    available: false,
    user: null,
  },
  accountTab: "",
  authMode: "login",
  showAllCollections: false,
  importPhotoFiles: [],
  importPhotoReport: [],
  importPhotoUploading: false,
  importBatches: loadStoredImportBatches(),
  activeImportBatchId: "",
  importUpdateExisting: false,
  pricePreview: [],
  pricePreviewMeta: {
    source: "local",
    rows: [],
    errors: [],
    rowsCount: 0,
  },
  priceImportHistory: loadStoredPriceImportHistory(),
  priceImportHistoryStatus: "idle",
  adminAudit: [],
  adminAuditStatus: "idle",
};
const productGrid = document.querySelector("#productGrid");
const productCount = document.querySelector("#productCount");
const filterGroups = document.querySelector("#filterGroups");
const activeFilterChips = document.querySelector("#activeFilterChips");
const catalogSeoCopy = document.querySelector("#catalogSeoCopy");
const searchResultsPanel = document.querySelector("#searchResultsPanel");
const catalogLoadMore = document.querySelector("#catalogLoadMore");
const recentProductsSection = document.querySelector("#recentProductsSection");
const recentProductsNode = document.querySelector("#recentProducts");
const categoryTiles = document.querySelector("#categoryTiles");
const actualTiles = document.querySelector("#actualTiles");
const collectionTiles = document.querySelector("#collectionTiles");
const holidayTiles = document.querySelector("#holidayTiles");
const priceListPreview = document.querySelector("#priceListPreview");
const catalogHome = document.querySelector("#catalogHome");
const catalogListing = document.querySelector("#catalogListing");
const catalogTools = document.querySelector("#catalogTools");
const catalogTitle = document.querySelector("#catalogTitle");
const catalogCompactTitle = document.querySelector("#catalogCompactTitle");
const catalogPageBack = document.querySelector("#catalogPageBack");
const catalogListingBack = document.querySelector("#catalogListingBack");
const filterToggle = document.querySelector("#filterToggle");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const cartItems = document.querySelector("#cartItems");
const cartEmpty = document.querySelector("#cartEmpty");
const cartCount = document.querySelector("#cartCount");
const cartHeaderTotal = document.querySelector("#cartHeaderTotal");
const cartHeaderDiscount = document.querySelector("#cartHeaderDiscount");
const favoriteCount = document.querySelector("#favoriteCount");
const subtotalNode = document.querySelector("#subtotal");
const discountValue = document.querySelector("#discountValue");
const grandTotal = document.querySelector("#grandTotal");
const discountProgress = document.querySelector("#discountProgress");
const discountHint = document.querySelector("#discountHint");
const toast = document.querySelector("#toast");
const themeToggle = document.querySelector("[data-theme-toggle]");
const isFavoritesPage = document.body.classList.contains("favorites-page");
const isSearchPage = document.body.classList.contains("search-page");
const isAdminOrdersPage = document.body.classList.contains("admin-orders-page");
const isAdminOrderPage = document.body.classList.contains("admin-order-page");
const isAdminCustomerPage = document.body.classList.contains("admin-customer-page");
const isAdminProductsPage = document.body.classList.contains("admin-products-page");
const isAdminPricesPage = document.body.classList.contains("admin-prices-page");
const isAdminImportPage = document.body.classList.contains("admin-import-page");
let personalStateReady = !state.currentUser;
window.SobagCurrentUserEmail = () => state.currentUser;
function getSiteContent() {
  try {
    return normalizeSiteContent(JSON.parse(localStorage.getItem(STORAGE.content) || "null") || {});
  } catch {
    return normalizeSiteContent();
  }
}
function saveSiteContent(content, options = {}) {
  const normalized = normalizeSiteContent(content);
  localStorage.setItem(STORAGE.content, JSON.stringify(normalized));
  if (options.sync !== false) syncSiteContentToBackend(normalized);
  return normalized;
}
async function loadServerSiteContent() {
  try {
    const data = await apiRequest("/api/content");
    if (!data.content || typeof data.content !== "object") return false;
    const normalized = normalizeSiteContent(data.content);
    if (data.source === "server") localStorage.setItem(STORAGE.content, JSON.stringify(normalized));
    renderSiteContent();
    renderCatalogHome();
    updateCustomCalculator();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return false;
  }
}
async function syncSiteContentToBackend(content) {
  const user = getUsers()[state.currentUser];
  if (!canManageContent(user)) return false;
  try {
    await apiRequest("/api/admin/content", { method: "PUT", body: { content } });
    showToast("Настройки сайта сохранены на сервере.");
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      console.warn(error);
      showToast("Настройки сохранены локально, но серверное сохранение не прошло.");
    }
    return false;
  }
}
function applyTheme(theme) {
  const isNight = theme === "night";
  document.body.classList.toggle("theme-night", isNight);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isNight));
    themeToggle.innerHTML = `<span>${isNight ? "дневная тема" : "ночная тема"}</span><b class="theme-toggle__track" aria-hidden="true"></b>`;
  }
  refreshLucideIcons();
}
function refreshLucideIcons(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  scope.querySelectorAll("i[data-lucide]").forEach((icon) => icon.setAttribute("aria-hidden", "true"));
  if (window.lucide) {
    window.lucide.createIcons();
    scope.querySelectorAll("svg.lucide").forEach((icon) => icon.setAttribute("aria-hidden", "true"));
  }
}
window.refreshLucideIcons = refreshLucideIcons;
function initTheme() {
  applyTheme(localStorage.getItem(STORAGE.theme) || "default");
}
function toggleTheme() {
  const nextTheme = document.body.classList.contains("theme-night") ? "default" : "night";
  localStorage.setItem(STORAGE.theme, nextTheme);
  applyTheme(nextTheme);
}
function updateButtonText(button, text, options = {}) {
  if (!button) return;
  const icon = button.querySelector("i")?.outerHTML || "";
  const label = options.preserveCase ? String(text || "").trim() : buttonLabel(text);
  button.innerHTML = `${icon}${label}`;
}
function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}
function setButtonText(selector, value, options = {}) {
  document.querySelectorAll(selector).forEach((button) => updateButtonText(button, value, options));
}
function findUserKeyByLogin(users, login) {
  const prepared = String(login || "").trim();
  const email = prepared.toLowerCase();
  const byEmail = Object.keys(users).find((key) => key.toLowerCase() === email);
  if (byEmail) return byEmail;
  const formattedPhone = formatPhoneNumber(prepared);
  const digits = phoneDigits(formattedPhone || prepared);
  if (!digits) return "";
  return Object.keys(users).find((key) => {
    const userPhone = users[key]?.phone || users[key]?.lastCustomer?.phone || "";
    return formatPhoneNumber(userPhone) === formattedPhone || phoneDigits(userPhone) === digits;
  }) || "";
}
function footerLinkUrl(label = "") {
  const prepared = String(label).trim().toLocaleLowerCase("ru-RU");
  if (prepared.includes("о компании")) return "about.html";
  if (prepared.includes("контакт")) return "contacts.html";
  if (prepared.includes("маркетплейс")) return "marketplaces.html";
  if (prepared.includes("свой") || prepared.includes("принт")) return "custom.html";
  if (prepared.includes("услов")) return "business.html";
  if (prepared.includes("как оформить") || prepared.includes("оформить заказ")) return "how-to-order.html";
  if (prepared.includes("достав")) return "delivery.html";
  if (prepared.includes("оплат")) return "payment.html";
  if (prepared.includes("возврат")) return "returns.html";
  if (prepared.includes("поддерж") || prepared.includes("селлер")) return "seller-support.html";
  if (prepared.includes("оптов") || prepared.includes("парт")) return "wholesale.html";
  if (prepared.includes("соглас") || (prepared.includes("персональ") && !prepared.includes("политик"))) return "assets/legal/personal-data-consent.pdf";
  if (prepared.includes("политик") || prepared.includes("конфиденц")) return "privacy.html";
  if (prepared.includes("соглаш")) return "terms.html";
  return "#";
}
function renderFooterLinks(selector, value) {
  document.querySelectorAll(selector).forEach((list) => {
    list.innerHTML = String(value || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const href = footerLinkUrl(item);
        const externalAttrs = href.endsWith(".pdf") ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${href}"${externalAttrs}>${escapeHtml(item)}</a>`;
      })
      .join("");
  });
}
function syncCatalogRoute(options = {}) {
  if (!catalogListing || document.body.classList.contains("home-page")) return;
  const params = new URLSearchParams();
  if (state.selectedCategory) params.set("category", state.selectedCategory);
  if (state.selectedCollection) params.set("collection", state.selectedCollection);
  if (state.selectedHoliday) params.set("holiday", state.selectedHoliday);
  if (state.search.trim()) params.set("q", state.search.trim());
  const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  if (nextUrl === `${window.location.pathname}${window.location.search}`) return;
  const method = options.mode === "push" ? "pushState" : "replaceState";
  window.history[method]({ catalog: true }, "", nextUrl);
}
function smoothScrollToHash(hash) {
  if (!hash) return false;
  const target = document.querySelector(hash);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}
function applyCatalogUrl(targetUrl, options = {}) {
  if (!catalogListing) return false;
  const params = new URLSearchParams(targetUrl.search);
  state.selectedCategory = params.get("category") || "";
  state.selectedCollection = params.get("collection") || "";
  state.selectedHoliday = params.get("holiday") || "";
  state.search = params.get("q") || "";
  if (searchInput) searchInput.value = state.search;
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  resetVisibleProducts();
  if (options.sync !== false) syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  smoothScrollToHash(targetUrl.hash || "#catalog");
  return true;
}
function hasActiveCatalogState() {
  return Boolean(
    state.selectedCategory ||
      state.selectedCollection ||
      state.selectedHoliday ||
      state.search.trim() ||
      Object.values(state.filters).some((bucket) => bucket.size)
  );
}
function resetVisibleProducts() {
  state.visibleLimit = CATALOG_PAGE_SIZE;
  resetServerCatalogList();
}
function hasCatalogFilterValues() {
  return Object.values(state.filters).some((bucket) => bucket.size);
}
function shouldUseServerCatalogList() {
  if (!catalogListing || isFavoritesPage || shouldLoadAdminCatalog()) return false;
  if (isSearchPage && !state.search.trim() && !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !hasCatalogFilterValues()) {
    return false;
  }
  return Boolean(isSearchPage || state.selectedCategory || state.selectedCollection || state.selectedHoliday || state.search.trim() || hasCatalogFilterValues());
}
function serverCatalogValues(key) {
  const values = new Set([...state.filters[key]].map((value) => String(value || "").trim()).filter(Boolean));
  if (key === "category" && state.selectedCategory) values.add(state.selectedCategory);
  if (key === "collection" && state.selectedCollection) values.add(state.selectedCollection);
  if (key === "holiday" && state.selectedHoliday) values.add(state.selectedHoliday);
  return [...values].sort((left, right) => left.localeCompare(right, "ru", { sensitivity: "base", numeric: true }));
}
function serverCatalogSortValue() {
  if (state.sort === "priceAsc") return "price_asc";
  if (state.sort === "priceDesc") return "price_desc";
  if (state.sort === "popular") return "popular";
  return "relevance";
}
function serverCatalogKey() {
  return JSON.stringify({
    q: state.search.trim(),
    sort: serverCatalogSortValue(),
    category: serverCatalogValues("category"),
    collection: serverCatalogValues("collection"),
    holiday: serverCatalogValues("holiday"),
    size: serverCatalogValues("size"),
    material: serverCatalogValues("material"),
  });
}
function serverCatalogParams(options = {}) {
  const params = new URLSearchParams();
  if (state.search.trim()) params.set("q", state.search.trim());
  params.set("sort", serverCatalogSortValue());
  params.set("pageSize", String(SERVER_CATALOG_PAGE_SIZE));
  if (options.cursor) params.set("cursor", options.cursor);
  [
    ["category", serverCatalogValues("category")],
    ["collection", serverCatalogValues("collection")],
    ["holiday", serverCatalogValues("holiday")],
    ["size", serverCatalogValues("size")],
    ["material", serverCatalogValues("material")],
  ].forEach(([name, values]) => values.forEach((value) => params.append(name, value)));
  return params;
}
function resetServerCatalogList() {
  state.serverCatalog.requestId += 1;
  state.serverCatalog.status = "idle";
  state.serverCatalog.key = "";
  state.serverCatalog.items = [];
  state.serverCatalog.total = 0;
  state.serverCatalog.facets = {};
  state.serverCatalog.facetOptions = {};
  state.serverCatalog.nextCursor = "";
  state.serverCatalog.hasMore = false;
  state.serverCatalog.source = "";
  state.serverCatalog.loadingMore = false;
}
function serverCatalogImageMeta(card) {
  const meta = normalizeProductImageMetadata(card?.imageMeta);
  if (meta) return meta;
  const image = String(card?.image || "").trim();
  return image ? normalizeProductImageMetadata(image) : null;
}
function serverCatalogProduct(card = {}) {
  const imageMeta = serverCatalogImageMeta(card);
  const productIdentity = {
    id: String(card.id || card.baseSku || "").trim(),
    baseSku: String(card.baseSku || card.id || "").trim(),
    photoFolder: String(card.photoFolder || card.baseSku || card.id || "").trim(),
  };
  const normalizedImageMeta = imageMeta ? normalizeProductImageUrls(productIdentity, imageMeta) : null;
  const image = resolveProductImageUrl(productIdentity, card.image || normalizedImageMeta?.url || "assets/production-workshop-1.png");
  const categories = uniqueList([...(Array.isArray(card.categories) ? card.categories : splitList(card.category)), card.category]);
  return {
    id: productIdentity.id,
    baseSku: productIdentity.baseSku,
    photoFolder: productIdentity.photoFolder,
    name: String(card.name || "").trim(),
    category: categories[0] || String(card.category || "").trim(),
    categories,
    collections: uniqueList(Array.isArray(card.collections) ? card.collections : splitList(card.collections)),
    holidays: uniqueList(Array.isArray(card.holidays) ? card.holidays : splitList(card.holidays)),
    tags: uniqueList(Array.isArray(card.tags) ? card.tags : splitList(card.tags)),
    description: String(card.description || "").trim(),
    detailDescription: "",
    stock: String(card.stock || "").trim(),
    status: "published",
    hidden: false,
    image,
    images: normalizedImageMeta ? [normalizedImageMeta] : [],
    gallery: [image],
    types: [],
    sizes: [],
    materials: [],
    variants: [],
    minPrice: Number(card.minPrice || 0) || 0,
    maxPrice: Number(card.maxPrice || card.minPrice || 0) || 0,
    popular: Number(card.popular || 0) || 0,
    variantCount: Number(card.variantCount || 0) || 0,
  };
}
function rememberServerCatalogCards(items = []) {
  const existingKeys = new Set(products.map(productKey));
  const additions = items.filter((item) => !existingKeys.has(productKey(item)));
  if (!additions.length) return;
  products = [...products, ...additions];
  addMissingCatalogCategories(products);
}
function currentServerCatalogResult() {
  if (!shouldUseServerCatalogList()) return null;
  const key = serverCatalogKey();
  if (state.serverCatalog.status !== "ready" || state.serverCatalog.key !== key) return null;
  return state.serverCatalog;
}
function applyServerCatalogResponse(data, { append, key, requestId }) {
  if (requestId !== state.serverCatalog.requestId) return false;
  const incoming = (Array.isArray(data.items) ? data.items : []).map(serverCatalogProduct).filter((product) => product.id && product.name);
  const merged = append ? [...state.serverCatalog.items, ...incoming] : incoming;
  const seen = new Set();
  const items = merged.filter((product) => {
    const keyValue = productKey(product);
    if (!keyValue || seen.has(keyValue)) return false;
    seen.add(keyValue);
    return true;
  });
  rememberServerCatalogCards(items);
  state.serverCatalog.status = "ready";
  state.serverCatalog.key = key;
  state.serverCatalog.items = items;
  state.serverCatalog.total = Number(data.total || items.length) || items.length;
  state.serverCatalog.facets = data.facets && typeof data.facets === "object" ? data.facets : {};
  state.serverCatalog.facetOptions = data.facetOptions && typeof data.facetOptions === "object" ? data.facetOptions : {};
  state.serverCatalog.nextCursor = String(data.pageInfo?.nextCursor || "");
  state.serverCatalog.hasMore = Boolean(data.pageInfo?.hasMore);
  state.serverCatalog.source = String(data.source || "");
  state.serverCatalog.loadingMore = false;
  return true;
}
async function fetchAndApplyServerCatalog(path, { append, key, requestId, background = false }) {
  try {
    const data = await apiRequest(path);
    const updated = applyServerCatalogResponse(data, { append, key, requestId });
    if (updated && background) {
      renderFilters();
      renderProducts();
    }
    return updated;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    if (requestId === state.serverCatalog.requestId) {
      if (state.serverCatalog.status !== "ready") state.serverCatalog.status = "fallback";
      state.serverCatalog.key = key;
      state.serverCatalog.loadingMore = false;
    }
    return false;
  }
}
async function refreshServerCatalogList(options = {}) {
  if (!shouldUseServerCatalogList()) {
    resetServerCatalogList();
    return false;
  }
  const key = serverCatalogKey();
  const append = Boolean(options.append && state.serverCatalog.status === "ready" && state.serverCatalog.key === key && state.serverCatalog.nextCursor);
  if (append) state.serverCatalog.loadingMore = true;
  else {
    state.serverCatalog.status = "loading";
    state.serverCatalog.key = key;
    state.serverCatalog.items = [];
    state.serverCatalog.total = 0;
    state.serverCatalog.facets = {};
    state.serverCatalog.facetOptions = {};
    state.serverCatalog.nextCursor = "";
    state.serverCatalog.hasMore = false;
  }
  const requestId = state.serverCatalog.requestId + 1;
  state.serverCatalog.requestId = requestId;
  const params = serverCatalogParams({ cursor: append ? state.serverCatalog.nextCursor : "" });
  const path = `/api/catalog-query?${params.toString()}`;
  if (!append) {
    const cached = getPublicApiCache(path);
    if (cached && applyServerCatalogResponse(cached, { append: false, key, requestId })) {
      fetchAndApplyServerCatalog(path, { append: false, key, requestId, background: true });
      return true;
    }
  }
  return fetchAndApplyServerCatalog(path, { append, key, requestId });
}
function queueServerCatalogRefresh() {
  if (!shouldUseServerCatalogList()) {
    resetServerCatalogList();
    return;
  }
  const key = serverCatalogKey();
  if (state.serverCatalog.key === key && (state.serverCatalog.status === "loading" || state.serverCatalog.status === "ready" || state.serverCatalog.status === "fallback")) {
    return;
  }
  refreshServerCatalogList().then((loaded) => {
    if (!loaded) {
      renderProducts();
      return;
    }
    renderFilters();
    renderProducts();
  });
}
async function loadMoreServerCatalogProducts() {
  const result = currentServerCatalogResult();
  if (!result?.hasMore || !result.nextCursor || result.loadingMore) return false;
  const loaded = await refreshServerCatalogList({ append: true });
  if (loaded) {
    renderFilters();
    renderProducts();
  }
  return loaded;
}
function navigateWithinSite(url) {
  const targetUrl = new URL(url, window.location.href);
  if (targetUrl.origin !== window.location.origin) {
    window.location.href = targetUrl.href;
    return;
  }
  const currentRoute = routeKey(window.location.pathname);
  const targetRoute = routeKey(targetUrl.pathname);
  const sameRoute = currentRoute === targetRoute;
  if (sameRoute && targetUrl.search === window.location.search && targetUrl.hash === window.location.hash) {
    if (targetUrl.hash) smoothScrollToHash(targetUrl.hash);
    return;
  }
  if (sameRoute && (targetRoute === "catalog" || targetRoute === "search") && catalogListing) {
    if (targetUrl.search) {
      applyCatalogUrl(targetUrl);
      return;
    }
    if (!hasActiveCatalogState() && !catalogListing.classList.contains("is-hidden")) return;
    backToCatalogHome();
    smoothScrollToHash(targetUrl.hash || "#catalog");
    return;
  }
  if (sameRoute && targetUrl.hash && targetUrl.search === window.location.search) {
    if (smoothScrollToHash(targetUrl.hash)) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}${targetUrl.hash}`);
      return;
    }
  }
  if (sameRoute && !targetUrl.search && !targetUrl.hash) return;
  window.location.href = targetUrl.href;
}
function hasConfirmedMapAddress(address) {
  const prepared = String(address || "").trim().toLocaleLowerCase("ru-RU");
  if (prepared.length < 12) return false;
  return !/(соглас|указан|подтвержд|менеджер|реквизит)/iu.test(prepared);
}
function updateYandexMap(address, target = "") {
  const prepared = String(address || "").trim();
  const suffix = target ? `-${target}` : "";
  const frame = document.querySelector(`#yandexMapFrame${suffix}`);
  const link = document.querySelector(`#yandexMapLink${suffix}`);
  const panel = frame?.closest(".map-panel") || link?.closest(".map-panel");
  const available = hasConfirmedMapAddress(prepared) && !panel?.hasAttribute("data-map-pending");
  panel?.classList.toggle("is-map-unavailable", !available);
  if (!available) {
    if (frame) frame.removeAttribute("src");
    if (link) {
      link.hidden = true;
      link.removeAttribute("href");
    }
    return;
  }
  const encoded = encodeURIComponent(prepared);
  if (frame) frame.src = `https://yandex.ru/map-widget/v1/?text=${encoded}&z=16`;
  if (link) {
    link.hidden = false;
    link.href = `https://yandex.ru/maps/?text=${encoded}`;
  }
}
const MARKETPLACE_LINKS = [
  { label: "Wildberries", href: "https://www.wildberries.ru/seller/167187" },
  { label: "Ozon", href: "https://ozon.ru/s/sobag" },
  { label: "Яндекс Маркет", href: "https://market.yandex.ru/cc/84GXiW" },
];
function marketplaceLinksHtml(className = "") {
  const classes = ["marketplace-links", className].filter(Boolean).join(" ");
  return `<div class="${classes}" aria-label="Sobag на маркетплейсах">${MARKETPLACE_LINKS.map(
    (item) => `<a href="${item.href}" target="_blank" rel="noopener noreferrer" aria-label="Sobag на ${escapeHtml(item.label)}" title="Открыть ${escapeHtml(item.label)}">${escapeHtml(item.label)}</a>`
  ).join("")}</div>`;
}
function renderMarketplaceLinks() {
  document.querySelectorAll("[data-marketplace-links]").forEach((node) => {
    node.innerHTML = marketplaceLinksHtml(node.dataset.marketplaceLinks || "");
  });
  const footerAddress = document.querySelector("[data-footer-address]");
  const footerColumn = footerAddress?.parentElement;
  if (footerColumn && !footerColumn.querySelector(".marketplace-links--footer")) {
    footerAddress.insertAdjacentHTML("afterend", marketplaceLinksHtml("marketplace-links--footer"));
  }
}
function updateFavoriteButtons(productId) {
  const active = state.favorites.has(productId);
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    if (button.dataset.favorite !== productId) return;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.title = active ? "Убрать из избранного" : "В избранное";
  });
  setTextWithPop(favoriteCount, state.favorites.size);
}
function ensureFieldError(field) {
  if (!field) return null;
  const form = field.closest("form");
  const name = field.name || field.id || "field";
  const id = `${form?.id || "form"}-${name}-error`;
  let error = form?.querySelector(`#${CSS.escape(id)}`);
  if (!error) {
    error = document.createElement("span");
    error.className = "field-error";
    error.id = id;
    error.setAttribute("role", "alert");
    const placementTarget = field.type === "checkbox" && field.closest("label") ? field.closest("label") : field;
    placementTarget.insertAdjacentElement("afterend", error);
  }
  field.setAttribute("aria-describedby", id);
  return error;
}
function clearFormErrors(form) {
  if (!form) return;
  form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
    error.hidden = true;
  });
}
function setFieldError(form, name, message) {
  const field = form?.elements?.[name];
  if (!field) return false;
  const error = ensureFieldError(field);
  field.setAttribute("aria-invalid", "true");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  field.classList.remove("is-shaking");
  void field.offsetWidth;
  field.classList.add("is-shaking");
  field.focus();
  return false;
}
async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    cache: options.cache || "default",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Backend недоступен.");
    error.status = response.status;
    error.code = data.error;
    error.data = data;
    throw error;
  }
  if (options.publicCache !== false) rememberPublicApiCache(path, options, data);
  return data;
}
function isBackendUnavailable(error) {
  return error?.status === 503 || error?.code === "storage_not_configured" || error instanceof TypeError;
}
function serverSaveErrorMessage(error, fallback) {
  if (isBackendUnavailable(error) || error?.status === 404) return fallback;
  return error?.message || fallback;
}
function saveServerUserProfile(profile) {
  if (!profile?.email) return;
  const users = getUsers();
  users[profile.email] = {
    ...(users[profile.email] || {}),
    ...profile,
    password: "__server__",
    orders: profile.orders || users[profile.email]?.orders || [],
    savedCarts: profile.savedCarts || users[profile.email]?.savedCarts || [],
  };
  saveUsers(users);
  state.currentUser = profile.email;
  localStorage.setItem(STORAGE.user, profile.email);
  loadFavorites();
}
function mirrorServerOrder(order, userEmail = state.currentUser) {
  if (!order?.id) return;
  const orders = getOrders().filter((item) => item.id !== order.id);
  saveOrders([order, ...orders]);
  const users = getUsers();
  if (userEmail && users[userEmail]) {
    const customer = order.customer || {};
    users[userEmail].orders = [order, ...(users[userEmail].orders || []).filter((item) => item.id !== order.id)];
    users[userEmail].company = customer.company || users[userEmail].company || "";
    users[userEmail].inn = customer.inn || users[userEmail].inn || "";
    users[userEmail].kpp = customer.kpp || users[userEmail].kpp || "";
    users[userEmail].legalAddress = customer.legalAddress || users[userEmail].legalAddress || "";
    users[userEmail].phone = customer.phone || users[userEmail].phone || "";
    users[userEmail].city = customer.city || users[userEmail].city || "";
    users[userEmail].address = customer.address || users[userEmail].address || "";
    users[userEmail].addresses = [...new Set([customer.address, ...(users[userEmail].addresses || [])].filter(Boolean))].slice(0, 10);
    users[userEmail].delivery = customer.delivery || users[userEmail].delivery || "";
    users[userEmail].packaging = customer.packaging || users[userEmail].packaging || "";
    users[userEmail].layoutFiles = uniqueTextList([customer.layoutFileName, ...(users[userEmail].layoutFiles || [])], 20, 240);
    users[userEmail].orderComment = customer.comment || users[userEmail].orderComment || "";
    users[userEmail].orderComments = uniqueTextList([customer.comment, ...(users[userEmail].orderComments || [])], 10, 500);
    users[userEmail].companies = parseCompanyProfiles(companiesToText(users[userEmail]), {
      name: users[userEmail].company,
      inn: users[userEmail].inn,
      kpp: users[userEmail].kpp,
      legalAddress: users[userEmail].legalAddress,
    });
    users[userEmail].lastCustomer = customer;
    saveUsers(users);
  }
}
async function promoteLocalLoginToBackend() {
  const localUser = getUsers()[state.currentUser];
  const password = localUser?.password;
  if (!localUser?.email || !password || password === "__server__") return false;
  try {
    const result = await apiRequest("/api/auth/login", { method: "POST", body: { email: localUser.email || state.currentUser, password } });
    if (result.user) {
      saveServerUserProfile(result.user);
      return true;
    }
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401) console.warn(error);
  }
  return false;
}
async function promoteLocalManagerLoginToBackend() {
  const localUser = getUsers()[state.currentUser];
  if (!canManageOrders(localUser)) return false;
  return promoteLocalLoginToBackend();
}
async function loadBackendAccountData(options = {}) {
  const attemptPromotion = options.attemptPromotion !== false;
  try {
    const session = await apiRequest("/api/auth/me");
    state.backendSession = { checked: true, available: true, user: session.user || null };
    if (!session.user) {
      if (attemptPromotion && (await promoteLocalManagerLoginToBackend())) return loadBackendAccountData({ attemptPromotion: false });
      return false;
    }
    if (Array.isArray(session.savedCarts)) {
      const mergedSavedCarts = mergeSavedCarts(session.savedCarts, getSavedCarts(session.user.email));
      localStorage.setItem(getSavedCartsKey(session.user.email), JSON.stringify(mergedSavedCarts));
      session.user.savedCarts = mergedSavedCarts;
    }
    saveServerUserProfile(session.user);
    if (["admin", "manager"].includes(session.user.role)) {
      await refreshAdminOrdersFromBackend();
      try {
        const usersData = await apiRequest("/api/admin/users");
        if (Array.isArray(usersData.users)) {
          const users = getUsers();
          usersData.users.forEach((user) => {
            users[user.email] = { ...(users[user.email] || {}), ...user, password: users[user.email]?.password || "__server__" };
          });
          saveUsers(users);
        }
      } catch (error) {
        console.warn(error);
      }
    }
    return true;
  } catch (error) {
    state.backendSession = {
      checked: true,
      available: error?.status !== 404 && !(error instanceof TypeError),
      user: null,
    };
    if (!isBackendUnavailable(error)) console.warn(error);
    return false;
  }
}
async function refreshAdminOrdersFromBackend(options = {}) {
  try {
    const ordersData = await apiRequest("/api/admin/orders");
    if (Array.isArray(ordersData.orders)) saveOrders(ordersData.orders);
    if (options.rerender) {
      renderManagementPages();
      rerenderAccountModal();
    }
    if (options.notify) showToast("Заказы обновлены с сервера.");
    return true;
  } catch (error) {
    if (options.notify) showToast(serverSaveErrorMessage(error, "Не удалось обновить заказы с сервера."));
    else if (!isBackendUnavailable(error)) console.warn(error);
    return false;
  }
}
async function refreshAccountFromBackend() {
  const changed = await loadBackendAccountData();
  const modal = document.querySelector("#accountModal");
  if (!changed || !modal) return;
  modal.remove();
  document.body.insertAdjacentHTML("beforeend", accountModalHtml());
  activateModal(document.querySelector("#accountModal"));
  refreshLucideIcons();
}
function initFormEnhancements(root = document) {
  root.querySelectorAll('input[name="name"]').forEach((field) => field.setAttribute("autocomplete", "name"));
  root.querySelectorAll('input[name="company"]').forEach((field) => field.setAttribute("autocomplete", "organization"));
  root.querySelectorAll('input[name="email"]').forEach((field) => field.setAttribute("autocomplete", "email"));
  root.querySelectorAll('input[name="phone"], input[type="tel"]').forEach((field) => {
    field.setAttribute("autocomplete", "tel");
    field.setAttribute("inputmode", "tel");
    if (!field.placeholder) field.placeholder = "+7 999 999-99-99";
    if (field.value) field.value = formatPhoneNumber(field.value);
    if (field.dataset.phoneFormatted === "true") return;
    field.dataset.phoneFormatted = "true";
    field.addEventListener("blur", () => {
      field.value = formatPhoneNumber(field.value);
    });
  });
  root.querySelectorAll('input[name="address"]').forEach((field) => field.setAttribute("autocomplete", "street-address"));
  root.querySelectorAll('input[name="password"]').forEach((field) => {
    field.setAttribute("autocomplete", field.closest("#authForm")?.dataset.authMode === "register" ? "new-password" : "current-password");
  });
}
function activeModal() {
  return [...document.querySelectorAll(".modal")].find((modal) => modal.classList.contains("is-visible")) || document.querySelector(".modal");
}
function activateModal(modal = activeModal()) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  document.body.classList.add("modal-open");
  const panel = modal.querySelector(".modal__panel") || modal;
  panel.setAttribute("tabindex", "-1");
  initFormEnhancements(modal);
  requestAnimationFrame(() => {
    const first = modal.querySelector(focusableSelector);
    (first || panel).focus();
  });
}
function trapModalFocus(event) {
  const modal = activeModal();
  if (!modal || event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll(focusableSelector)].filter((node) => node.offsetParent !== null);
  if (!focusable.length) {
    event.preventDefault();
    modal.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
function renderHeroActualSlides(content = getSiteContent()) {
  const actual = document.querySelector(".hero__actual");
  if (!actual) return;
  actual.querySelectorAll("[data-actual-slide]").forEach((slide) => slide.remove());
  const slidesHtml = content.actualSlides
    .map((slide, index) => {
      const type = slide.type === "collection" ? "collection" : "holiday";
      return `
        <button class="hero__actual-card${index === actualSlideIndex ? " is-active" : ""}" type="button" data-actual-slide data-open-${type}="${slide.label}">
          <img src="${slide.image}" alt="${slide.label}" ${imageAttrs(640, 360, index === 0 ? "eager" : "lazy", index === 0 ? "high" : "")} />
          <b>${slide.label}</b>
        </button>
      `;
    })
    .join("");
  actual.insertAdjacentHTML("beforeend", slidesHtml);
}
function renderSiteContent() {
  const content = getSiteContent();
  const brand = document.querySelector(".brand");
  const brandMark = document.querySelector(".brand__mark");
  const brandName = document.querySelector(".brand__name");
  const heroTitle = document.querySelector(".hero h1");
  const heroLead = document.querySelector(".hero__lead");
  if (brand) brand.setAttribute("aria-label", content.brandName);
  if (brandMark) {
    brandMark.innerHTML = content.brandLogo
      ? `<img src="${content.brandLogo}" alt="" width="54" height="54" decoding="async" />`
      : escapeHtml(String(content.brandName || "S").trim().charAt(0) || "S");
  }
  if (brandName) brandName.innerHTML = brandNameHtml(content.brandName);
  if (heroTitle) heroTitle.textContent = content.heroTitle;
  if (heroLead) heroLead.textContent = content.heroLead;
  setButtonText(".catalog-button", content.navCatalogButton);
  setText("[data-top-business]", buttonLabel(content.navBusinessButton));
  setText("[data-top-marketplaces]", buttonLabel(content.navMarketplacesButton));
  setText("[data-top-about]", buttonLabel(content.navAboutButton));
  setText("[data-top-contacts]", buttonLabel(content.navContactsButton));
  setText(".cart-button span", buttonLabel(content.cartButton));
  setButtonText(".hero__actions .primary-button", content.heroPrimaryButton);
  setButtonText(".hero__actions .ghost-button", content.heroCustomButton);
  setText(".hero__actual-head strong", content.actualTitle);
  const heroSpecs = document.querySelectorAll(".hero__specs article");
  [
    [content.heroSpecOneValue, content.heroSpecOneText],
    [content.heroSpecTwoValue, content.heroSpecTwoText],
    [content.heroSpecThreeValue, content.heroSpecThreeText],
  ].forEach(([value, text], index) => {
    heroSpecs[index]?.querySelector("strong") && (heroSpecs[index].querySelector("strong").textContent = value);
    heroSpecs[index]?.querySelector("span") && (heroSpecs[index].querySelector("span").textContent = text);
  });
  const benefitCards = document.querySelectorAll(".benefits article");
  [
    [content.benefitOneTitle, content.benefitOneText],
    [content.benefitTwoTitle, content.benefitTwoText],
    [content.benefitThreeTitle, content.benefitThreeText],
    [content.benefitFourTitle, content.benefitFourText],
  ].forEach(([title, text], index) => {
    benefitCards[index]?.querySelector("strong") && (benefitCards[index].querySelector("strong").textContent = title);
    benefitCards[index]?.querySelector("span") && (benefitCards[index].querySelector("span").textContent = text);
  });
  setButtonText("[data-back-catalog]", content.catalogBackButton, { preserveCase: true });
  setText("#catalogHome .catalog-home__head:not(.catalog-home__head--themes) h3", content.catalogHomeTitle);
  const catalogHomeSubtitle = document.querySelector("#catalogHome .catalog-home__head:not(.catalog-home__head--themes) span");
  if (catalogHomeSubtitle) {
    const subtitle = String(content.catalogHomeSubtitle || "").trim();
    catalogHomeSubtitle.textContent = subtitle;
    catalogHomeSubtitle.hidden = !subtitle;
  }
  const catalogThemeHeads = document.querySelectorAll("#catalogHome .catalog-home__head--themes h3");
  [content.catalogActualTitle, content.catalogCollectionsTitle, content.catalogHolidaysTitle].forEach((value, index) => {
    if (catalogThemeHeads[index]) catalogThemeHeads[index].textContent = value;
  });
  setText(".request-panel .eyebrow", content.requestEyebrow);
  setText(".request-panel h3", content.requestTitle);
  setText("#cartEmpty span", content.requestEmptyText);
  setText("#cartMinHint", content.requestMinHint);
  const wholesaleTitle = document.querySelector(".wholesale h2");
  if (wholesaleTitle) wholesaleTitle.textContent = content.wholesaleTitle;
  const tiers = document.querySelectorAll(".tiers article");
  [
    [content.tierOneLabel, content.tierOneValue, content.tierOneText],
    [content.tierTwoLabel, content.tierTwoValue, content.tierTwoText],
    [content.tierThreeLabel, content.tierThreeValue, content.tierThreeText],
    [content.tierFourLabel, content.tierFourValue, content.tierFourText],
  ].forEach(([label, value, text], index) => {
    tiers[index]?.querySelector("span") && (tiers[index].querySelector("span").textContent = label);
    tiers[index]?.querySelector("strong") && (tiers[index].querySelector("strong").textContent = value);
    tiers[index]?.querySelector("small") && (tiers[index].querySelector("small").textContent = text);
  });
  setText(".marketplaces h2", content.marketplacesTitle);
  setText(".marketplaces .section-head p", content.marketplacesText);
  setText("[data-about-page-title]", content.aboutPageTitle);
  setText("[data-about-page-lead]", content.aboutPageLead);
  setText("[data-about-page-text]", content.aboutPageText);
  setText("[data-about-production-title]", content.aboutPageProductionTitle);
  setText("[data-about-production-text]", content.aboutPageProductionText);
  setText("[data-contacts-page-title]", content.contactsPageTitle);
  setText("[data-contacts-page-lead]", content.contactsPageLead);
  setText("[data-contacts-address]", content.contactsAddress);
  setText("[data-contacts-legal-address]", content.contactsLegalAddress);
  setText("[data-contacts-production-address]", content.contactsProductionAddress);
  setText("[data-contacts-schedule]", content.contactsSchedule);
  setText("[data-contacts-map-button]", buttonLabel(content.contactsMapButton));
  updateYandexMap(content.contactsLegalAddress, "legal");
  updateYandexMap(content.contactsProductionAddress, "production");
  updateYandexMap(content.contactsAddress);
  [
    ["how-to-order", content.howToOrderPageTitle, content.howToOrderPageLead, content.howToOrderPageText],
    ["delivery", content.deliveryPageTitle, content.deliveryPageLead, content.deliveryPageText],
    ["payment", content.paymentPageTitle, content.paymentPageLead, content.paymentPageText],
    ["returns", content.returnsPageTitle, content.returnsPageLead, content.returnsPageText],
    ["seller-support", content.sellerSupportPageTitle, content.sellerSupportPageLead, content.sellerSupportPageText],
    ["wholesale", content.wholesalePageTitle, content.wholesalePageLead, content.wholesalePageText],
  ].forEach(([page, title, lead, text]) => {
    setText(`[data-info-page-title="${page}"]`, title);
    setText(`[data-info-page-lead="${page}"]`, lead);
    setText(`[data-info-page-text="${page}"]`, text);
  });
  const marketplaceCards = document.querySelectorAll(".marketplace-card");
  [
    [content.marketplaceOneName, content.marketplaceOneTitle, content.marketplaceOneText, MARKETPLACE_LINKS[0]],
    [content.marketplaceTwoName, content.marketplaceTwoTitle, content.marketplaceTwoText, MARKETPLACE_LINKS[1]],
    [content.marketplaceThreeName, content.marketplaceThreeTitle, content.marketplaceThreeText, MARKETPLACE_LINKS[2]],
  ].forEach(([name, title, text, link], index) => {
    marketplaceCards[index]?.querySelector("span") && (marketplaceCards[index].querySelector("span").textContent = name);
    marketplaceCards[index]?.querySelector("strong") && (marketplaceCards[index].querySelector("strong").textContent = title);
    marketplaceCards[index]?.querySelector("small") && (marketplaceCards[index].querySelector("small").textContent = text);
    if (marketplaceCards[index] && link) {
      marketplaceCards[index].href = link.href;
      marketplaceCards[index].target = "_blank";
      marketplaceCards[index].rel = "noopener noreferrer";
      marketplaceCards[index].ariaLabel = `Sobag на ${link.label}`;
      marketplaceCards[index].title = `Открыть ${link.label}`;
    }
  });
  setText(".custom h2", content.customTitle);
  setText(".custom__content > p:not(.eyebrow)", content.customText);
  document.querySelectorAll(".custom .steps span").forEach((step, index) => {
    const values = [content.customStepOne, content.customStepTwo, content.customStepThree, content.customStepFour];
    const number = step.querySelector("b")?.outerHTML || `<b>${index + 1}</b>`;
    step.innerHTML = `${number} ${escapeHtml(values[index])}`;
  });
  setButtonText("#briefForm .primary-button", content.customSubmitButton);
  setText("[data-business-page-title]", content.businessPageTitle);
  setText("[data-business-page-lead]", content.businessPageLead);
  setText("[data-business-minimum-title]", content.businessMinimumTitle);
  setText("[data-business-minimum-text]", content.businessMinimumText);
  setText("[data-business-discount-title]", content.businessDiscountTitle);
  setText("[data-business-discount-text]", content.businessDiscountText);
  setText("[data-business-production-title]", content.businessProductionTitle);
  setText("[data-business-production-text]", content.businessProductionText);
  setText("[data-business-manager-title]", content.businessManagerTitle);
  setText("[data-business-manager-text]", content.businessManagerText);
  setText("[data-business-documents-title]", content.businessDocumentsTitle);
  setText("[data-business-documents-text]", content.businessDocumentsText);
  const footer = document.querySelector(".footer");
  if (footer) {
    const footerEmails = footer.querySelectorAll("[data-footer-email]");
    const footerPhones = footer.querySelectorAll("[data-footer-phone]");
    setText("[data-footer-brand]", content.footerBrand);
    setText("[data-footer-text]", content.footerText);
    setText("[data-footer-sales-label]", content.footerSalesLabel);
    setText("[data-footer-company-title]", content.footerCompanyTitle);
    setText("[data-footer-clients-title]", content.footerClientsTitle);
    setText("[data-footer-partners-title]", content.footerPartnersTitle);
    setText("[data-footer-contacts-title]", content.footerContactsTitle);
    setText("[data-footer-address]", content.footerAddress);
    renderFooterLinks("[data-footer-company-links]", content.footerCompanyLinks);
    renderFooterLinks("[data-footer-clients-links]", content.footerClientsLinks);
    renderFooterLinks("[data-footer-partners-links]", content.footerPartnersLinks);
    footerEmails.forEach((footerEmail) => {
      footerEmail.textContent = content.footerEmail;
      footerEmail.href = `mailto:${content.footerEmail}`;
    });
    footerPhones.forEach((footerPhone) => {
      footerPhone.textContent = content.footerPhone;
      footerPhone.href = phoneHref(content.footerPhone);
    });
  }
  renderMarketplaceLinks();
  if (
    catalogTitle &&
    !isFavoritesPage &&
    !state.selectedCategory &&
    !state.selectedCollection &&
    !state.selectedHoliday &&
    !state.search.trim()
  ) {
    catalogTitle.textContent = content.catalogTitleDefault;
  }
  document.querySelectorAll(".hero__slideshow .hero__image").forEach((image, index) => {
    image.src = content.heroImages[index] || defaultSiteContent.heroImages[index];
  });
  renderHeroActualSlides(content);
  refreshLucideIcons();
}
function loadProducts() {
  const saved = loadStoredProducts();
  const source = saved.length ? saved : productDrafts;
  return source.map(normalizeProduct);
}
function loadStoredProducts() {
  const saved = JSON.parse(localStorage.getItem(STORAGE.products) || "null");
  return Array.isArray(saved) ? saved.filter((product) => !isPrototypeProduct(product)) : [];
}
function isPrototypeProduct(product) {
  const sku = String(product?.baseSku || "");
  const images = [product?.image, ...(product?.gallery || [])].filter(Boolean).join(" ");
  return PROTOTYPE_PRODUCT_IDS.has(String(product?.id || "")) || sku.startsWith("SB-") || images.includes("assets/hero-products-");
}
function productKey(product) {
  return baseSkuKey(product.baseSku || product.id || product.name);
}
function mergeProducts(baseProducts, incomingProducts) {
  const merged = new Map();
  baseProducts.forEach((product) => merged.set(productKey(product), product));
  incomingProducts.forEach((product) => {
    const normalized = normalizeProduct(product);
    const key = productKey(normalized);
    if (!merged.has(key)) merged.set(key, normalized);
  });
  return [...merged.values()];
}
function applyLoadedProducts(incomingProducts, options = {}) {
  if (!Array.isArray(incomingProducts) || !incomingProducts.length) return false;
  products = options.mergeWithStored
    ? mergeProducts(products, incomingProducts)
    : incomingProducts.map(normalizeProduct);
  addMissingCatalogCategories(products);
  renderSiteContent();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderAdminProductsPage();
  renderAdminPricesPage();
  return true;
}
async function loadServerProducts() {
  try {
    const data = await apiRequest("/api/catalog");
    if (!Array.isArray(data.products) || !data.products.length) return false;
    state.productReviews = normalizeReviews(data.reviews);
    const saved = loadStoredProducts();
    const loaded = applyLoadedProducts(data.products, { mergeWithStored: data.source !== "server" && Boolean(saved?.length) });
    if (loaded && data.source === "server") localStorage.setItem(STORAGE.products, JSON.stringify(cleanProductsForStorage()));
    return loaded;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return false;
  }
}
function catalogCategorySummaryRows(data = {}) {
  const rows = data.facets?.categories || data.facetOptions?.categories || [];
  return Array.isArray(rows) ? rows : [];
}
function catalogCategoryCountsFromRows(rows = []) {
  return rows.reduce((counts, row) => {
    const name = String(row?.value || "").trim();
    const count = Number(row?.count || 0) || 0;
    if (name && count > 0) counts[name] = count;
    return counts;
  }, {});
}
function hasCatalogHomeSummaryCounts() {
  return state.catalogHomeSummary.status === "ready" && Object.keys(state.catalogHomeSummary.counts || {}).length > 0;
}
function catalogHomeSummaryLooksPartial(data = {}, counts = {}) {
  const values = Object.values(counts)
    .map((count) => Number(count || 0))
    .filter((count) => count > 0);
  const maxCount = values.length ? Math.max(...values) : 0;
  const total = Number(data.total || data.pageInfo?.total || 0) || 0;
  return total > CATALOG_PAGE_SIZE && values.length > 0 && maxCount <= CATALOG_PAGE_SIZE;
}
function fallbackCatalogCategory(name) {
  const existing = catalogContentItem(defaultSiteContent.catalogCategories, name);
  return existing || { name, icon: "tag", description: "Категория из текущего каталога.", image: "" };
}
function applyCatalogHomeSummary(data = {}) {
  const counts = catalogCategoryCountsFromRows(catalogCategorySummaryRows(data));
  if (!Object.keys(counts).length) return false;
  if (catalogHomeSummaryLooksPartial(data, counts)) {
    state.catalogHomeSummary = { status: "fallback", counts: {}, source: "partial-summary" };
    renderCatalogHome();
    return false;
  }
  state.catalogHomeSummary = {
    status: "ready",
    counts,
    source: String(data.source || "server"),
  };
  renderCatalogHome();
  return true;
}
async function refreshCatalogHomeSummary() {
  if (!categoryTiles || shouldLoadAdminCatalog()) return false;
  if (hasActiveCatalogState()) return false;
  const path = "/api/catalog-query?pageSize=1&sort=popular";
  state.catalogHomeSummary.status = "loading";
  renderCatalogHome();
  try {
    const data = await apiRequest(path, { cache: "no-store", publicCache: false });
    return applyCatalogHomeSummary(data);
  } catch (error) {
    state.catalogHomeSummary.status = "fallback";
    renderCatalogHome();
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return false;
  }
}
function replaceLoadedProduct(product) {
  const normalized = normalizeProduct(product);
  const key = productKey(normalized);
  let replaced = false;
  products = products.map((item) => {
    if (item.id === normalized.id || productKey(item) === key) {
      replaced = true;
      return normalized;
    }
    return item;
  });
  if (!replaced) products.push(normalized);
  addMissingCatalogCategories(products);
  return normalized;
}
function refreshCachedProductDetail(path) {
  apiRequest(path)
    .then((data) => {
      if (data.product) replaceLoadedProduct(data.product);
    })
    .catch((error) => {
      if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    });
}
async function loadProductDetailForModal(product) {
  if (!product || shouldLoadAdminCatalog()) return product;
  try {
    const params = new URLSearchParams();
    if (product.id) params.set("id", product.id);
    else if (product.baseSku) params.set("baseSku", product.baseSku);
    const path = `/api/catalog-detail?${params.toString()}`;
    const cached = getPublicApiCache(path);
    if (cached?.product) {
      const normalized = replaceLoadedProduct(cached.product);
      refreshCachedProductDetail(path);
      return normalized;
    }
    const data = await apiRequest(path);
    return data.product ? replaceLoadedProduct(data.product) : product;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return product;
  }
}
function shouldLoadAdminCatalog() {
  return isAdminProductsPage || isAdminPricesPage || isAdminImportPage;
}
async function loadAdminCatalogProducts() {
  if (!shouldLoadAdminCatalog() || !canManageProducts(getUsers()[state.currentUser])) return false;
  try {
    const data = await apiRequest("/api/admin/catalog");
    if (!Array.isArray(data.products) || !data.products.length) return false;
    const loaded = applyLoadedProducts(data.products);
    if (loaded) localStorage.setItem(STORAGE.products, JSON.stringify(cleanProductsForStorage()));
    return loaded;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) console.warn(error);
    return false;
  }
}
async function loadPublishedProducts() {
  if (await loadAdminCatalogProducts()) return;
  if (shouldUseServerCatalogList()) {
    const loadedQuery = await refreshServerCatalogList();
    if (loadedQuery) {
      renderFilters();
      renderProducts();
      return;
    }
  }
  if (await loadServerProducts()) return;
  try {
    const response = await fetch("data/products-live.json", { cache: "default" });
    if (!response.ok) return;
    const liveProducts = await response.json();
    const saved = loadStoredProducts();
    state.productReviews = [];
    applyLoadedProducts(liveProducts, { mergeWithStored: Boolean(saved?.length) });
  } catch {
    // The static catalog file is optional in local prototype mode.
  }
}
function cleanProductsForStorage() {
  return products.map(({ variants, minPrice, maxPrice, ...product }) => product);
}
function normalizeReview(item) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(item?.rating || 0))));
  return {
    id: String(item?.id || ""),
    productId: String(item?.productId || ""),
    baseSku: String(item?.baseSku || ""),
    productName: String(item?.productName || ""),
    rating,
    text: String(item?.text || "").trim(),
    status: item?.status === "hidden" || item?.status === "approved" ? item.status : "pending",
    userEmail: String(item?.userEmail || ""),
    authorName: String(item?.authorName || item?.userEmail || "Покупатель"),
    createdAt: String(item?.createdAt || ""),
    updatedAt: String(item?.updatedAt || item?.createdAt || ""),
    moderatedBy: String(item?.moderatedBy || ""),
  };
}
function normalizeReviews(items) {
  return (Array.isArray(items) ? items : []).map(normalizeReview).filter((item) => item.id && item.productId && item.rating);
}
function reviewsForProduct(product, statuses = ["approved"]) {
  const allowed = new Set(statuses);
  return state.productReviews.filter(
    (review) =>
      allowed.has(review.status) &&
      (review.productId === product.id || baseSkuKey(review.baseSku) === baseSkuKey(product.baseSku))
  );
}
const REVIEW_ELIGIBLE_ORDER_STATUSES = new Set(["shipped", "done"]);
function reviewEligibleOrderStatus(status) {
  return REVIEW_ELIGIBLE_ORDER_STATUSES.has(String(status || "").trim().toLowerCase());
}
function reviewProductSkuKeys(product) {
  return new Set([product?.baseSku, ...(product?.variants || []).map((variant) => variant?.sku)].map(baseSkuKey).filter(Boolean));
}
function orderItemMatchesReviewProduct(item = {}, product = {}) {
  const productId = String(product.id || "").trim().toLowerCase();
  const itemProductId = String(item.productId || "").trim().toLowerCase();
  if (productId && itemProductId && productId === itemProductId) return true;
  const skuKeys = reviewProductSkuKeys(product);
  return [item.baseSku, item.key, item.variant?.sku, item.sku, item.variantSku].some((value) => skuKeys.has(baseSkuKey(value)));
}
function userHasEligibleReviewOrder(user, product) {
  return (user?.orders || []).some(
    (order) => reviewEligibleOrderStatus(order.status) && (order.items || []).some((item) => orderItemMatchesReviewProduct(item, product))
  );
}
function userHasSubmittedReview(user, product) {
  const productId = String(product?.id || "").trim().toLowerCase();
  const skuKeys = reviewProductSkuKeys(product);
  return normalizeReviews(user?.reviews || []).some((review) => {
    const reviewProductId = String(review.productId || "").trim().toLowerCase();
    return (productId && reviewProductId === productId) || skuKeys.has(baseSkuKey(review.baseSku));
  });
}
function reviewStats(product) {
  const reviews = reviewsForProduct(product);
  if (!reviews.length) return { count: 0, average: 0 };
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { count: reviews.length, average };
}
function starsHtml(value, label = "") {
  const rounded = Math.round(Number(value || 0));
  return `<span class="review-stars" aria-label="${escapeHtml(label || `${rounded} из 5`)}">${[1, 2, 3, 4, 5]
    .map((star) => `<span class="${star <= rounded ? "is-filled" : ""}">★</span>`)
    .join("")}</span>`;
}
let productServerSaveTimer = null;
let productServerSavePromise = Promise.resolve(false);
function syncProductsToBackend(cleanProducts) {
  const user = getUsers()[state.currentUser];
  if (!canManageProducts(user)) return Promise.resolve(false);
  window.clearTimeout(productServerSaveTimer);
  productServerSavePromise = new Promise((resolve) => {
    productServerSaveTimer = window.setTimeout(async () => {
      try {
        const result = await apiRequest("/api/admin/catalog", { method: "PUT", body: { products: cleanProducts } });
        showToast(`Каталог сохранен на сервере: ${result.count || cleanProducts.length} товаров.`);
        resolve(true);
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          console.warn(error);
          showToast("Каталог сохранен локально, но серверное сохранение не прошло.");
        }
        resolve(false);
      }
    }, 250);
  });
  return productServerSavePromise;
}
function saveProducts() {
  const clean = cleanProductsForStorage();
  localStorage.setItem(STORAGE.products, JSON.stringify(clean));
  return syncProductsToBackend(clean);
}
async function syncCatalogNow() {
  const saved = await saveProducts();
  if (!saved) showToast("Каталог сохранен локально. Для серверного сохранения войдите через админ-аккаунт.");
}
const DEV_ADMIN_FALLBACK_FLAG = "sobag.devAdminFallback";
const DEV_ADMIN_PASSWORD_KEY = "sobag.devAdminPassword";
function isLocalDevelopmentHost() {
  const host = String(window.location.hostname || "").toLowerCase();
  return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "::1";
}
function devAdminFallbackPassword() {
  if (!isLocalDevelopmentHost()) return "";
  if (localStorage.getItem(DEV_ADMIN_FALLBACK_FLAG) !== "true") return "";
  const password = String(localStorage.getItem(DEV_ADMIN_PASSWORD_KEY) || "");
  return password.length >= 6 ? password : "";
}
function isLocalAuthFallbackAllowed() {
  return isLocalDevelopmentHost();
}
function failClosedAuthUnavailable(form) {
  const message = "Server authentication is temporarily unavailable.";
  setFieldError(form, "password", message);
  showToast(message);
}
function seedUsers() {
  const users = JSON.parse(localStorage.getItem(STORAGE.users) || "null") || {};
  const legacyAdmin = users["admin@sobag.local"];
  const currentAdmin = users["admin@sobag"];
  const adminOrders = currentAdmin?.orders || legacyAdmin?.orders || [];
  const devPassword = devAdminFallbackPassword();
  if (devPassword) {
    users["admin@sobag"] = {
      ...currentAdmin,
      email: "admin@sobag",
      password: devPassword,
      name: currentAdmin?.name || legacyAdmin?.name || "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440",
      phone: formatPhoneNumber(currentAdmin?.phone || legacyAdmin?.phone || "+7 900 000-00-00"),
      role: "admin",
      owner: true,
      orders: adminOrders,
    };
  } else if (currentAdmin?.password === "admin") {
    delete users["admin@sobag"];
  }
  if (legacyAdmin) delete users["admin@sobag.local"];
  if (localStorage.getItem(STORAGE.user) === "admin@sobag.local" && users["admin@sobag"]) {
    localStorage.setItem(STORAGE.user, "admin@sobag");
    state.currentUser = "admin@sobag";
  } else if (localStorage.getItem(STORAGE.user) === "admin@sobag.local" || (localStorage.getItem(STORAGE.user) === "admin@sobag" && !users["admin@sobag"])) {
    localStorage.removeItem(STORAGE.user);
    state.currentUser = "";
  }
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
  return users;
}
function getUsers() {
  return seedUsers();
}
function saveUsers(users) {
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
}
function getOrders() {
  return JSON.parse(localStorage.getItem(STORAGE.orders) || "[]");
}
function saveOrders(orders) {
  localStorage.setItem(STORAGE.orders, JSON.stringify(orders));
}
function isOwnerAccount(user) {
  return Boolean(user?.owner);
}
function roleLabel(role, user = null) {
  if (isOwnerAccount(user)) return "Владелец";
  if (role === "admin") return "Администратор";
  if (role === "manager") return "Менеджер";
  if (role === "content") return "Контент-менеджер";
  return "Покупатель";
}
function canManageOrders(user) {
  return user?.role === "admin" || user?.role === "manager";
}
function canManageContent(user) {
  return user?.role === "admin" || user?.role === "content";
}
function saveOrderRecord(order, userKey = state.currentUser) {
  const users = getUsers();
  const orders = getOrders();
  const customer = order.customer || {};
  const record = {
    status: "new",
    source: "cart",
    userEmail: userKey || customer.email || "",
    ...order,
  };
  saveOrders([record, ...orders]);
  if (userKey && users[userKey]) {
    users[userKey].orders = [record, ...(users[userKey].orders || [])];
    users[userKey].company = customer.company || users[userKey].company || "";
    users[userKey].inn = customer.inn || users[userKey].inn || "";
    users[userKey].kpp = customer.kpp || users[userKey].kpp || "";
    users[userKey].legalAddress = customer.legalAddress || users[userKey].legalAddress || "";
    users[userKey].phone = customer.phone || users[userKey].phone || "";
    users[userKey].city = customer.city || users[userKey].city || "";
    users[userKey].address = customer.address || users[userKey].address || "";
    users[userKey].addresses = [...new Set([customer.address, ...(users[userKey].addresses || [])].filter(Boolean))].slice(0, 10);
    users[userKey].delivery = customer.delivery || users[userKey].delivery || "";
    users[userKey].packaging = customer.packaging || users[userKey].packaging || "";
    users[userKey].layoutFiles = uniqueTextList([customer.layoutFileName, ...(users[userKey].layoutFiles || [])], 20, 240);
    users[userKey].orderComment = customer.comment || users[userKey].orderComment || "";
    users[userKey].orderComments = uniqueTextList([customer.comment, ...(users[userKey].orderComments || [])], 10, 500);
    users[userKey].companies = parseCompanyProfiles(companiesToText(users[userKey]), {
      name: users[userKey].company,
      inn: users[userKey].inn,
      kpp: users[userKey].kpp,
      legalAddress: users[userKey].legalAddress,
    });
    users[userKey].lastCustomer = customer;
    saveUsers(users);
  }
  return record;
}
function updateOrderRecord(orderId, patch) {
  let preparedPatch = null;
  const { crmEntry: crmEntryInput, ...orderPatch } = patch;
  const orders = getOrders().map((order) => {
    if (order.id !== orderId) return order;
    const entry = orderHistoryEntry(order, orderPatch);
    const crmEntry = orderThreadEntry(crmEntryInput || {});
    preparedPatch = {
      ...orderPatch,
      updatedAt: new Date().toISOString(),
      crmThread: crmEntry ? [crmEntry, ...(order.crmThread || [])].slice(0, 200) : order.crmThread || [],
      statusHistory: entry ? [entry, ...(order.statusHistory || [])].slice(0, 100) : order.statusHistory || [],
    };
    return { ...order, ...preparedPatch };
  });
  if (!preparedPatch) return;
  const users = getUsers();
  Object.values(users).forEach((user) => {
    user.orders = (user.orders || []).map((order) => (order.id === orderId ? { ...order, ...preparedPatch } : order));
  });
  saveOrders(orders);
  saveUsers(users);
}
function appendLocalOrderComment(orderId, entry) {
  if (!entry) return false;
  updateOrderRecord(orderId, { crmEntry: entry });
  return true;
}
function updateOrderStatus(orderId, status) {
  updateOrderRecord(orderId, { status });
}
async function submitManagerOrderMessage(form) {
  const orderId = form.dataset.orderManagerMessageForm;
  const data = Object.fromEntries(new FormData(form).entries());
  const text = normalizeOrderCommentText(data.commentText || "");
  if (!text) {
    showToast("Напишите комментарий по заказу.");
    return;
  }
  const visibility = data.commentVisibility === "customer" ? "customer" : "internal";
  try {
    const result = await apiRequest("/api/admin/orders", {
      method: "PATCH",
      body: { id: orderId, commentText: text, commentVisibility: visibility },
    });
    if (result.order) mirrorServerOrder(result.order, result.order.userEmail || result.order.customer?.email || "");
    await loadBackendAccountData();
  } catch (error) {
    showToast(serverSaveErrorMessage(error, "Не удалось сохранить комментарий на сервере."));
    return;
  }
  form.reset();
  if (isAdminOrdersPage || isAdminOrderPage || isAdminCustomerPage) renderManagementPages();
  else rerenderAccountModal();
  showToast(visibility === "customer" ? "Сообщение покупателю добавлено." : "Внутренний комментарий добавлен.");
}
async function submitCustomerOrderMessage(form) {
  const orderId = form.dataset.orderCustomerMessageForm;
  const text = normalizeOrderCommentText(new FormData(form).get("commentText") || "");
  if (!text) {
    showToast("Напишите сообщение по заказу.");
    return;
  }
  const user = getUsers()[state.currentUser] || {};
  try {
    const result = await apiRequest("/api/orders", {
      method: "PATCH",
      body: { id: orderId, commentText: text },
    });
    if (result.order) mirrorServerOrder(result.order, result.order.userEmail || state.currentUser);
    await loadBackendAccountData();
  } catch (error) {
    showToast(serverSaveErrorMessage(error, "Не удалось сохранить сообщение на сервере."));
    return;
  }
  form.reset();
  rerenderAccountModal();
  showToast("Сообщение по заказу добавлено.");
}
function setUserRole(email, role) {
  const users = getUsers();
  if (!users[email] || users[email].role === "admin") return false;
  if (!["buyer", "manager", "content"].includes(role)) return false;
  users[email].role = role;
  saveUsers(users);
  return true;
}
function getFavoritesKey() {
  return state.currentUser ? `${FAVORITES_PREFIX}${state.currentUser}` : FAVORITES_KEY;
}
function loadFavorites() {
  const key = getFavoritesKey();
  const stored = cleanFavoriteIds(JSON.parse(localStorage.getItem(key) || "[]"));
  const legacy = key !== FAVORITES_KEY ? cleanFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")) : [];
  const merged = legacy.length && !localStorage.getItem(key) ? [...new Set([...stored, ...legacy])] : stored;
  state.favorites = new Set(merged);
  localStorage.setItem(key, JSON.stringify([...state.favorites]));
}
function saveFavorites() {
  localStorage.setItem(getFavoritesKey(), JSON.stringify([...state.favorites]));
  if (personalStateReady) syncFavoritesToBackend();
}
function getCartKey() {
  return state.currentUser ? `sobag.cart.${state.currentUser}` : STORAGE.guestCart;
}
function getSavedCartsKey(userKey = state.currentUser) {
  return userKey ? `${STORAGE.savedCartsPrefix}${userKey}` : STORAGE.guestSavedCarts;
}
function isPrototypeCartLine(line) {
  const productId = String(line?.productId || "");
  const sku = String(line?.variant?.sku || line?.variantSku || "");
  const image = String(line?.productImage || "");
  return PROTOTYPE_PRODUCT_IDS.has(productId) || sku.startsWith("SB-") || image.includes("assets/hero-products-");
}
function cleanCartEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(([, line]) => !isPrototypeCartLine(line));
}
function cleanFavoriteIds(ids) {
  return (Array.isArray(ids) ? ids : []).filter((id) => !PROTOTYPE_PRODUCT_IDS.has(String(id || "")));
}
function orderHasPrototypeItems(order) {
  return (order?.items || []).some(isPrototypeCartLine);
}
function cleanPrototypeStorage() {
  localStorage.removeItem("sobag.products.v8");
  Object.keys(localStorage)
    .filter((key) => key.startsWith("sobag.publicApiCache.v1."))
    .forEach((key) => localStorage.removeItem(key));
  const storedProducts = loadStoredProducts();
  localStorage.setItem(STORAGE.products, JSON.stringify(storedProducts));
  Object.keys(localStorage)
    .filter((key) => key === FAVORITES_KEY || key.startsWith(FAVORITES_PREFIX))
    .forEach((key) => {
      const favorites = cleanFavoriteIds(JSON.parse(localStorage.getItem(key) || "[]"));
      localStorage.setItem(key, JSON.stringify(favorites));
    });
  loadFavorites();
  Object.keys(localStorage)
    .filter((key) => key === STORAGE.guestCart || key.startsWith("sobag.cart."))
    .forEach((key) => {
      const entries = cleanCartEntries(JSON.parse(localStorage.getItem(key) || "[]"));
      localStorage.setItem(key, JSON.stringify(entries));
    });
  const orders = getOrders().filter((order) => !orderHasPrototypeItems(order));
  saveOrders(orders);
  const users = getUsers();
  Object.values(users).forEach((user) => {
    user.orders = (user.orders || []).filter((order) => !orderHasPrototypeItems(order));
  });
  saveUsers(users);
}
function loadCart() {
  const entries = cleanCartEntries(JSON.parse(localStorage.getItem(getCartKey()) || "[]"));
  state.cart = new Map(entries);
  localStorage.setItem(getCartKey(), JSON.stringify(entries));
}
function saveCart() {
  localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));
  if (personalStateReady) syncCartToBackend();
}
let cartSyncTimer = 0;
let favoritesSyncTimer = 0;
let savedCartsSyncTimer = 0;
function totalsFromCartEntries(entries) {
  const lines = cleanCartEntries(entries).map(([, line]) => line);
  const qty = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.variant?.price || 0), 0);
  const discount = getBasketDiscount(subtotal);
  const total = Math.round(subtotal * (1 - discount / 100));
  return { qty, subtotal, discount, total };
}
function getQuantityDiscount(qty) {
  return quantityTiers.reduce((current, tier) => (qty >= tier.qty ? tier.discount : current), 0);
}
function getBasketDiscount(amount) {
  return basketDiscountTiers.reduce((current, tier) => (amount >= tier.amount ? tier.discount : current), 0);
}
function discountedUnitPrice(price, discount) {
  return Math.round(price * (1 - discount / 100));
}
function getBasketDiscountHint(amount) {
  const nextTier = basketDiscountTiers.find((tier) => amount < tier.amount);
  if (!nextTier) return "Максимальная скидка по корзине применена";
  return `${formatMoney(Math.max(nextTier.amount - amount, 0))} до скидки ${nextTier.discount}%`;
}
const customCalcPrices = {
  pillow: 520,
  cover: 290,
  blanket: 820,
  bag: 210,
  flag: 360,
  remuvka: 95,
};
const customCalcMaterialAdds = {
  velour: 0,
  gabardine: -35,
  fleece: 80,
};
const customCalcPackAdds = {
  none: 0,
  simple: 18,
  marketplace: 42,
};
function getCustomCalcDiscount(qty) {
  if (qty >= 300) return 18;
  if (qty >= 150) return 12;
  if (qty >= 70) return 7;
  if (qty >= 30) return 3;
  return 0;
}
function updateCustomCalculator() {
  const calculator = document.querySelector("#customCalculator");
  if (!calculator) return;
  const product = document.querySelector("#customCalcProduct")?.value || "pillow";
  const material = document.querySelector("#customCalcMaterial")?.value || "velour";
  const pack = document.querySelector("#customCalcPack")?.value || "none";
  const qty = Math.max(Number(document.querySelector("#customCalcQty")?.value || 0), 0);
  const base = customCalcPrices[product] || customCalcPrices.pillow;
  const unitBeforeDiscount = Math.max(base + (customCalcMaterialAdds[material] || 0) + (customCalcPackAdds[pack] || 0), 1);
  const discount = getCustomCalcDiscount(qty);
  const unit = discountedUnitPrice(unitBeforeDiscount, discount);
  const total = qty * unit;
  const totalNode = document.querySelector("#customCalcTotal");
  const unitNode = document.querySelector("#customCalcUnit");
  const hintNode = document.querySelector("#customCalcHint");
  if (totalNode) totalNode.textContent = formatMoney(total);
  if (unitNode) unitNode.textContent = qty ? `${formatMoney(unit)} за шт. · скидка ${discount}%` : "Введите тираж";
  if (hintNode) {
    const nextTier = quantityTiers.find((tier) => qty < tier.qty);
    hintNode.textContent = nextTier
      ? `${Math.max(nextTier.qty - qty, 0)} шт. до скидки ${nextTier.discount}%. Расчет ориентировочный, финальную цену подтвердит менеджер после проверки макета.`
      : "Применена максимальная скидка по тиражу. Финальную цену подтвердит менеджер после проверки макета.";
  }
}
async function submitCustomBrief(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const quantity = Math.round(Number(data.quantity || 0));
  if (!String(data.product || "").trim()) {
    showToast("Выберите изделие для расчета.");
    return;
  }
  if (quantity < 1) {
    showToast("Укажите тираж.");
    return;
  }
  if (!String(data.contact || data.email || "").trim()) {
    showToast("Укажите телефон, Telegram или email.");
    return;
  }
  try {
    const result = await apiRequest("/api/briefs", {
      method: "POST",
      body: {
        product: data.product,
        quantity,
        name: data.name,
        contact: data.contact,
        email: data.email,
        layoutReference: data.layoutReference,
        comment: data.comment,
      },
    });
    if (result.order) mirrorServerOrder(result.order, result.order.userEmail || result.order.customer?.email || "");
    form.reset();
    updateCustomCalculator();
    showToast(`Заявка ${result.brief?.id || ""} сохранена на сервере. Менеджер увидит ее в админке.`);
  } catch (error) {
    showToast(serverSaveErrorMessage(error, "Не удалось сохранить заявку на сервере. Попробуйте еще раз."));
  }
}
function lineTotals(line, discount = getBasketDiscount(getCartTotals().subtotal)) {
  const subtotal = line.variant.price * line.qty;
  const total = discountedUnitPrice(line.variant.price, discount) * line.qty;
  return { subtotal, discount, total };
}
function getCartTotals() {
  const lines = [...state.cart.values()];
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.variant.price * line.qty, 0);
  const discount = getBasketDiscount(subtotal);
  const total = Math.round(subtotal * (1 - discount / 100));
  return { subtotal, total, qty, discount };
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}
async function copyText(value, label = "Артикул") {
  const text = String(value || "").trim();
  if (!text) return;
  const fallbackCopy = () => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.append(field);
    field.focus();
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  };
  try {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        if (!fallbackCopy()) throw new Error("fallback-copy-failed");
      }
    } else if (!fallbackCopy()) {
      throw new Error("fallback-copy-failed");
    }
    showToast(`${label} скопирован: ${text}`);
  } catch {
    showToast("Не удалось скопировать. Попробуйте выделить артикул вручную.");
  }
}
function stockLabel(stock) {
  return stock === "ready" ? "В наличии" : "Под заказ";
}
function serverFacetBucketKey(key) {
  return {
    category: "categories",
    collection: "collections",
    holiday: "holidays",
    size: "sizes",
    material: "materials",
  }[key] || key;
}
function selectedFilterValues(key) {
  return [...(state.filters[key] || new Set())];
}
function serverFacetOptionsForKey(key) {
  const result = currentServerCatalogResult();
  if (!result) return null;
  const bucket = serverFacetBucketKey(key);
  const source = result.facetOptions?.[bucket] || result.facets?.[bucket];
  if (!Array.isArray(source)) return null;
  return uniqueList([...source.map((item) => item?.value || item), ...selectedFilterValues(key)]).sort((left, right) =>
    left.localeCompare(right, "ru", { sensitivity: "base", numeric: true })
  );
}
function productsForFilterOptions(key) {
  return products.filter((product) => {
    if (product.hidden) return false;
    if (isFavoritesPage && !state.favorites.has(product.id)) return false;
    if (state.selectedCategory && !productHasCategory(product, state.selectedCategory)) return false;
    if (state.selectedCollection && !productHasCollection(product, state.selectedCollection)) return false;
    if (state.selectedHoliday && !productHasHoliday(product, state.selectedHoliday)) return false;
    if (key !== "category" && state.filters.category.size && ![...state.filters.category].some((category) => productHasCategory(product, category))) return false;
    if (key !== "collection" && state.filters.collection.size && ![...state.filters.collection].some((collection) => productHasCollection(product, collection))) return false;
    if (key !== "holiday" && state.filters.holiday.size && ![...state.filters.holiday].some((holiday) => productHasHoliday(product, holiday))) return false;
    if (key === "size" || key === "material") {
      return product.variants.some((variant) => {
        if (key !== "size" && state.filters.size.size && !state.filters.size.has(variant.size)) return false;
        if (key !== "material" && state.filters.material.size && !state.filters.material.has(variant.material)) return false;
        return true;
      });
    }
    return true;
  });
}
function uniqueOptions(key) {
  const serverOptions = serverFacetOptionsForKey(key);
  if (serverOptions) return serverOptions;
  const sourceProducts = productsForFilterOptions(key);
  if (key === "size" || key === "material") {
    const variants = sourceProducts.flatMap((product) => product.variants);
    return [
      ...new Set(
        variants
          .filter((variant) => {
            if (key !== "size" && state.filters.size.size && !state.filters.size.has(variant.size)) return false;
            if (key !== "material" && state.filters.material.size && !state.filters.material.has(variant.material)) return false;
            return true;
          })
          .map((variant) => variant[key])
      ),
    ];
  }
  if (key === "collection") return [...new Set(sourceProducts.flatMap((product) => product.collections))];
  if (key === "holiday") return [...new Set(sourceProducts.flatMap((product) => product.holidays))];
  if (key === "category") return [...new Set(sourceProducts.flatMap((product) => product.categories || [product.category]))];
  return [...new Set(sourceProducts.map((product) => product[key]))];
}
function productMatchesFilters(product) {
  const filters = state.filters;
  if (state.selectedCategory && !productHasCategory(product, state.selectedCategory)) return false;
  if (state.selectedCollection && !productHasCollection(product, state.selectedCollection)) return false;
  if (state.selectedHoliday && !productHasHoliday(product, state.selectedHoliday)) return false;
  if (filters.category.size && ![...filters.category].some((category) => productHasCategory(product, category))) return false;
  if (filters.collection.size && ![...filters.collection].some((collection) => productHasCollection(product, collection))) return false;
  if (filters.holiday.size && ![...filters.holiday].some((holiday) => productHasHoliday(product, holiday))) return false;
  const variantFilters = ["size", "material"];
  return product.variants.some((variant) =>
    variantFilters.every((key) => !filters[key].size || filters[key].has(variant[key]))
  );
}
function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\u0451/g, "\u0435")
    .replace(/[\s_-]+/g, " ")
    .replace(/\s+/g, " ");
}
function skuSearchKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}
function productSearchText(product) {
  return normalizeSearchText(
    [
      product.name,
      product.baseSku,
      product.description,
      product.collections.join(" "),
      product.holidays.join(" "),
      product.tags.join(" "),
      (product.categories || []).join(" "),
      product.variants.map((variant) => variant.sku).join(" "),
    ].join(" ")
  );
}
function productHasExactSearchMatch(product, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  const querySku = skuSearchKey(rawQuery);
  if (!query || !querySku) return false;
  const skuMatch = [product.baseSku, ...product.variants.map((variant) => variant.sku)].some((sku) => skuSearchKey(sku) === querySku);
  return skuMatch || normalizeSearchText(product.name) === query;
}
function searchScore(product, rawQuery = state.search) {
  const query = normalizeSearchText(rawQuery);
  const querySku = skuSearchKey(rawQuery);
  if (!query) return 1;
  const skuKeys = [product.baseSku, ...product.variants.map((variant) => variant.sku)].map(skuSearchKey);
  if (querySku && skuKeys.includes(querySku)) return 10000;
  if (normalizeSearchText(product.name) === query) return 9000;
  if (querySku && skuKeys.some((sku) => sku.startsWith(querySku))) return 7000;
  if (querySku && skuKeys.some((sku) => sku.includes(querySku))) return 5000;
  if (querySku && /\d/.test(querySku)) return 0;
  const name = normalizeSearchText(product.name);
  if (name.startsWith(query)) return 4000;
  if (name.includes(query)) return 3000;
  const text = productSearchText(product);
  if (text.includes(query)) return 1600;
  const tokens = query.split(" ").filter((token) => token.length > 2);
  if (tokens.length && tokens.every((token) => text.includes(token))) return 1200;
  if (tokens.length && tokens.some((token) => text.includes(token))) return 650;
  return 0;
}
function getSearchSuggestions() {
  const query = state.search.trim();
  if (normalizeSearchText(query).length < 2) return [];
  return products
    .filter((product) => !product.hidden)
    .map((product) => ({ product, score: searchScore(product, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.product.popular - a.product.popular)
    .slice(0, 5)
    .map(({ product }) => product);
}
function countSearchValues(list, getter, limit = 6) {
  const counts = new Map();
  list.forEach((product) => {
    getter(product).forEach((value) => {
      const prepared = String(value || "").trim();
      if (!prepared) return;
      counts.set(prepared, (counts.get(prepared) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}
function setSearchQuery(query) {
  state.search = String(query || "").trim();
  if (searchInput) searchInput.value = state.search;
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderSearchResultsPanel(list, total = list.length) {
  if (!searchResultsPanel) return;
  const query = state.search.trim();
  const resultTotal = Number(total || 0) || 0;
  const suggestions = getSearchSuggestions();
  const source = list.length ? list : suggestions.length ? suggestions : products.filter((product) => !product.hidden).slice(0, 80);
  const categories = countSearchValues(source, (product) => product.categories || [product.category], 5);
  const collections = countSearchValues(source, (product) => product.collections || [], 5);
  const holidays = countSearchValues(source, (product) => product.holidays || [], 4);
  const tags = countSearchValues(source, (product) => product.tags || [], 6);
  const hasQuickFilters = categories.length || collections.length || holidays.length || tags.length;
  searchResultsPanel.innerHTML = `
    <div class="search-results-panel__main">
      <span>Результаты поиска</span>
      <h3>${query ? escapeHtml(query) : "Введите запрос в поисковой строке"}</h3>
      <p>${query ? `${resultTotal} ${productWord(resultTotal)} найдено. Сначала идут точные совпадения по артикулу, затем по названию и тематике.` : "Ищите по артикулу, названию, подборке, празднику или тегу."}</p>
    </div>
    ${
      suggestions.length
        ? `<div class="search-results-panel__suggestions">
            <span>Возможно, вы искали</span>
            <div>${suggestions
              .map(
                (product) => `
                  <button type="button" data-open-product="${escapeHtml(product.id)}">
                    <img src="${escapeHtml(product.image || "assets/production-workshop-1.png")}" alt="" loading="lazy" />
                    <b>${escapeHtml(product.baseSku)}</b>
                    <span>${escapeHtml(product.name)}</span>
                  </button>
                `
              )
              .join("")}</div>
          </div>`
        : ""
    }
    ${
      hasQuickFilters
        ? `<div class="search-results-panel__quick">
            <span>Быстрые фильтры</span>
            <div>
              ${categories.map((item) => `<button type="button" data-open-category="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
              ${collections.map((item) => `<button type="button" data-open-collection="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
              ${holidays.map((item) => `<button type="button" data-open-holiday="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
              ${tags.map((item) => `<button type="button" data-search-query="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
            </div>
          </div>`
        : ""
    }
  `;
}
function renderSearchSuggestions() {
  const searchBox = searchInput?.closest(".search");
  if (!searchBox) return;
  let node = searchBox.querySelector(".search-suggestions");
  if (!node) {
    node = document.createElement("div");
    node.className = "search-suggestions";
    node.setAttribute("aria-live", "polite");
    searchBox.appendChild(node);
  }
  const suggestions = getSearchSuggestions();
  if (!suggestions.length) {
    node.hidden = true;
    node.innerHTML = "";
    return;
  }
  node.hidden = false;
  node.innerHTML = `
    <span>Похожие товары</span>
    ${suggestions
      .map(
        (product) => `
          <button type="button" data-open-product="${escapeHtml(product.id)}">
            <img src="${escapeHtml(product.image || "assets/production-workshop-1.png")}" alt="" loading="lazy" ${imageAttrs(56, 56)} />
            <span>
              <strong>${escapeHtml(product.baseSku)}</strong>
              <em>${escapeHtml(product.name)}</em>
            </span>
          </button>
        `
      )
      .join("")}
  `;
}
function getFilteredProducts() {
  if (
    isSearchPage &&
    !state.search.trim() &&
    !state.selectedCategory &&
    !state.selectedCollection &&
    !state.selectedHoliday &&
    !Object.values(state.filters).some((bucket) => bucket.size)
  ) {
    return [];
  }
  return products
    .map((product) => ({ product, score: searchScore(product) }))
    .filter(
      ({ product, score }) =>
        !product.hidden &&
        (!isFavoritesPage || state.favorites.has(product.id)) &&
        productMatchesFilters(product) &&
        (state.search.trim() ? score > 0 : true)
    )
    .sort((a, b) => {
      if (state.search.trim() && b.score !== a.score) return b.score - a.score;
      if (state.sort === "priceAsc") return a.product.minPrice - b.product.minPrice;
      if (state.sort === "priceDesc") return b.product.maxPrice - a.product.maxPrice;
      if (state.sort === "minQty") return 30 - 30;
      return b.product.popular - a.product.popular;
    })
    .map(({ product }) => product);
}
function activeFilterItems() {
  const items = [];
  if (state.selectedCategory) items.push({ label: state.selectedCategory, key: "selectedCategory" });
  if (state.selectedCollection) items.push({ label: state.selectedCollection, key: "selectedCollection" });
  if (state.selectedHoliday) items.push({ label: state.selectedHoliday, key: "selectedHoliday" });
  if (state.search.trim()) items.push({ label: `Поиск: ${state.search.trim()}`, key: "search" });
  Object.entries(state.filters).forEach(([key, values]) => {
    values.forEach((value) => items.push({ label: value, key, value }));
  });
  return items;
}
function renderActiveFilterChips() {
  if (!activeFilterChips) return;
  const items = activeFilterItems();
  activeFilterChips.classList.toggle("is-hidden", !items.length);
  activeFilterChips.innerHTML = [
    `<button class="active-filter-chips__reset" type="button" data-clear-all-filters>
      <i data-lucide="rotate-ccw"></i>
      <span>Снять все фильтры</span>
    </button>`,
    ...items
    .map(
      (item) => `
        <button type="button" data-clear-filter="${escapeHtml(item.key)}" data-clear-value="${escapeHtml(item.value || "")}">
          <span>${escapeHtml(item.label)}</span>
          <i data-lucide="x"></i>
        </button>
      `
    ),
  ].join("");
}
function catalogContentItem(items = [], name = "") {
  const prepared = String(name || "").trim().toLocaleLowerCase("ru-RU");
  return items.find((item) => String(item.name || "").trim().toLocaleLowerCase("ru-RU") === prepared) || null;
}
function catalogSeoCopyData(total = 0) {
  if (isFavoritesPage || isSearchPage || (!state.selectedCategory && !state.selectedCollection && !state.selectedHoliday)) return null;
  const content = getSiteContent();
  const titleParts = [state.selectedCategory, state.selectedCollection, state.selectedHoliday].filter(Boolean);
  const label = titleParts.join(" · ");
  const category = catalogContentItem(content.catalogCategories, state.selectedCategory);
  const collection = catalogContentItem(content.catalogCollections, state.selectedCollection);
  const holiday = catalogContentItem(content.catalogHolidays, state.selectedHoliday);
  const countText = total ? `${total} ${productWord(total)} в текущей выдаче.` : "Ассортимент обновляется после уточнения фильтров.";
  const intro = category?.description
    ? category.description
    : collection?.description
    ? collection.description
    : holiday?.description
    ? holiday.description
    : state.selectedCollection
    ? "Подборка объединяет принты и изделия, которые удобно закупать одной партией для магазина, витрины или маркетплейса."
    : "Праздничная витрина помогает быстро собрать сезонную оптовую заявку по нужным изделиям, размерам и материалам.";
  return {
    title: `${label}: оптовая поставка текстиля с принтами`,
    text: `${intro} ${countText} Можно собрать корзину-заявку, сохранить коммерческое предложение и передать менеджеру требования по упаковке, маркировке и срокам.`,
  };
}
function renderCatalogSeoCopy(total = 0) {
  if (!catalogSeoCopy) return;
  catalogSeoCopy.innerHTML = "";
  catalogSeoCopy.classList.add("is-hidden");
}
function updateCatalogPageBack(isHome) {
  if (!catalogPageBack) return;
  updateButtonText(catalogPageBack, isHome ? "На главную" : getSiteContent().catalogBackButton, { preserveCase: true });
  if (isHome) {
    delete catalogPageBack.dataset.backCatalog;
    catalogPageBack.dataset.nav = "/";
    return;
  }
  if (catalogListingBack) {
    delete catalogPageBack.dataset.backCatalog;
    delete catalogPageBack.dataset.nav;
    return;
  }
  delete catalogPageBack.dataset.nav;
  catalogPageBack.dataset.backCatalog = "";
}
function setCatalogPageTitle(value) {
  if (catalogTitle) catalogTitle.textContent = value;
  if (catalogCompactTitle) catalogCompactTitle.textContent = value;
}
function miniProductCard(product) {
  return `
    <button class="mini-product-card" type="button" data-open-product="${escapeHtml(product.id)}">
      ${productPictureHtml(product, product.image, product.name, imageAttrs(160, 160))}
      <span>${escapeHtml(product.baseSku)}</span>
      <strong>${escapeHtml(product.name)}</strong>
      <b>от ${formatMoney(product.minPrice)}</b>
    </button>
  `;
}
function saveRecentProduct(productId) {
  if (!productId) return;
  state.recentProducts = [productId, ...state.recentProducts.filter((id) => id !== productId)].slice(0, 12);
  localStorage.setItem(STORAGE.recentProducts, JSON.stringify(state.recentProducts));
}
function relatedProducts(product, limit = 4) {
  if (!product) return [];
  const categories = new Set(product.categories || [product.category].filter(Boolean));
  const collections = new Set(product.collections || []);
  const holidays = new Set(product.holidays || []);
  return products
    .filter((item) => item.id !== product.id && !item.hidden)
    .map((item) => {
      let score = 0;
      (item.categories || [item.category]).forEach((value) => {
        if (categories.has(value)) score += 4;
      });
      (item.collections || []).forEach((value) => {
        if (collections.has(value)) score += 6;
      });
      (item.holidays || []).forEach((value) => {
        if (holidays.has(value)) score += 5;
      });
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.popular - a.item.popular)
    .slice(0, limit)
    .map(({ item }) => item);
}
function renderRecentProducts() {
  if (!recentProductsSection || !recentProductsNode) return;
  const currentList = new Set(getFilteredProducts().map((product) => product.id));
  const recent = state.recentProducts
    .map((id) => products.find((product) => product.id === id && !product.hidden))
    .filter((product) => product && !currentList.has(product.id))
    .slice(0, 6);
  recentProductsSection.classList.toggle("is-hidden", recent.length === 0);
  recentProductsNode.innerHTML = recent.map(miniProductCard).join("");
}
function clearCatalogFilter(key, value = "") {
  if (key === "selectedCategory") state.selectedCategory = "";
  else if (key === "selectedCollection") state.selectedCollection = "";
  else if (key === "selectedHoliday") state.selectedHoliday = "";
  else if (key === "search") {
    state.search = "";
    if (searchInput) searchInput.value = "";
  } else if (state.filters[key]) {
    if (value) state.filters[key].delete(value);
    else state.filters[key].clear();
  }
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
}
function clearAllCatalogFilters() {
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.search = "";
  if (searchInput) searchInput.value = "";
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
}
function renderCatalogHome() {
  if (!categoryTiles || !actualTiles || !collectionTiles || !holidayTiles) return;
  const content = getSiteContent();
  const serverCounts = hasCatalogHomeSummaryCounts() ? state.catalogHomeSummary.counts : {};
  const hasServerCounts = Object.keys(serverCounts).length > 0;
  const hasOnlyPartialCatalogPage = products.length > 0 && products.length <= CATALOG_PAGE_SIZE && state.serverCatalog.total > products.length;
  const hasOnlyPageSizedLocalCatalog = products.length > 0 && products.length <= CATALOG_PAGE_SIZE && state.catalogHomeSummary.status !== "ready";
  const shouldWaitForHomeSummary = !hasActiveCatalogState() && !hasServerCounts && (state.catalogHomeSummary.status !== "fallback" || hasOnlyPartialCatalogPage || hasOnlyPageSizedLocalCatalog);
  const countByCategory = Object.fromEntries(content.catalogCategories.map((category) => [category.name, 0]));
  if (!shouldWaitForHomeSummary) {
    products.forEach((product) => {
      (product.categories || [product.category]).forEach((category) => {
        countByCategory[category] = (countByCategory[category] || 0) + 1;
      });
    });
  }
  if (shouldWaitForHomeSummary) {
    categoryTiles.innerHTML = Array.from(
      { length: 6 },
      () => `<div class="category-tile-skeleton" aria-hidden="true"><span></span><strong></strong><small></small><b></b></div>`
    ).join("");
    renderCatalogHomeSecondarySections(content);
    refreshLucideIcons();
    return;
  }
  Object.entries(serverCounts).forEach(([category, count]) => {
    if (count > 0) countByCategory[category] = count;
  });
  const categoryItems = Object.keys(serverCounts).length
    ? addMissingCatalogItems(content.catalogCategories, Object.keys(serverCounts), fallbackCatalogCategory)
    : content.catalogCategories;
  const visibleCategories = categoryItems.filter((category) => (countByCategory[category.name] || 0) > 0);
  categoryTiles.innerHTML = visibleCategories
    .map(
      (category, index) => `
        <button class="category-tile" type="button" data-open-category="${escapeHtml(category.name)}">
          <span class="category-tile__top">
            <span class="category-tile__icon"><i data-lucide="${escapeHtml(category.icon)}"></i></span>
            <span class="category-tile__schema" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </span>
          <strong>${escapeHtml(category.name)}</strong>
          <small>${escapeHtml(category.description)}</small>
          <b>${countByCategory[category.name] || 0} ${productWord(countByCategory[category.name] || 0)}</b>
        </button>
      `
    )
    .join("");
  renderCatalogHomeSecondarySections(content);
  refreshLucideIcons();
}
function renderCatalogHomeSecondarySections(content) {
  actualTiles.innerHTML = content.actualSlides
    .map(
      (item, index) => `
        <button class="actual-tile actual-tile--${(index % 3) + 1}" type="button" data-open-${item.type}="${escapeHtml(item.label)}">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}" ${imageAttrs(640, 360)} />
          <span>${escapeHtml(item.label)}</span>
          <b>${escapeHtml(item.label)}</b>
        </button>
      `
    )
    .join("");
  const collectionLimit = 12;
  const visibleCollections = state.showAllCollections ? content.catalogCollections : content.catalogCollections.slice(0, collectionLimit);
  collectionTiles.innerHTML = [
    ...visibleCollections
    .map(
      (collection, index) => `
        <button class="theme-tile" type="button" data-open-collection="${escapeHtml(collection.name)}">
          ${collection.image ? `<img class="theme-tile__image" src="${escapeHtml(collection.image)}" alt="" ${imageAttrs(520, 520)} />` : `<i data-lucide="${escapeHtml(collection.icon)}"></i>`}
          <span>${escapeHtml(collection.name)}</span>
        </button>
      `
    ),
    content.catalogCollections.length > collectionLimit
      ? `<button class="theme-tile theme-tile--more" type="button" data-toggle-collections>${state.showAllCollections ? "Скрыть подборки" : `Показать еще ${content.catalogCollections.length - collectionLimit}`}</button>`
      : "",
  ].join("");
  holidayTiles.innerHTML = content.catalogHolidays
    .map(
      (holiday, index) => `
        <button class="theme-tile" type="button" data-open-holiday="${escapeHtml(holiday.name)}">
          ${holiday.image ? `<img class="theme-tile__image" src="${escapeHtml(holiday.image)}" alt="" ${imageAttrs(520, 520)} />` : `<i data-lucide="${escapeHtml(holiday.icon)}"></i>`}
          <span>${escapeHtml(holiday.name)}</span>
        </button>
      `
    )
    .join("");
  refreshLucideIcons();
  catalogHomeHasAnimated = true;
}
function priceListDateRange(row = {}) {
  const dates = [row.promoStartsAt, row.promoEndsAt].filter(Boolean);
  return dates.length ? dates.join(" — ") : "";
}
function priceListPreviewRowHtml(row) {
  const isPromo = row.type === "promo";
  const label = String(row.label || row.group || "").replace(/^Акция\s+/i, "");
  const count = [row.productCount ? `${row.productCount} товаров` : "", row.skuCount ? `${row.skuCount} SKU` : ""].filter(Boolean).join(" · ");
  const period = priceListDateRange(row);
  return `
    <article class="price-list-preview__row${isPromo ? " price-list-preview__row--promo" : ""}">
      <div>
        <span class="price-list-preview__badge">${isPromo ? "Акция" : "Категория"}</span>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml([count, period].filter(Boolean).join(" · "))}</small>
      </div>
      <b>${formatMoney(row.price)}</b>
    </article>
  `;
}
function renderPriceListPreview(status = "loading", rows = [], message = "") {
  if (!priceListPreview) return;
  if (status === "loading") {
    priceListPreview.innerHTML = `<div class="price-list-preview__skeleton" aria-hidden="true"><span></span><span></span><span></span></div>`;
    return;
  }
  if (status === "error") {
    priceListPreview.innerHTML = `
      <div class="price-list-preview__state" role="status" aria-live="polite">
        <strong>Прайс сейчас не загрузился.</strong>
        <span>${escapeHtml(message || "Скачивание остается доступным по кнопке.")}</span>
      </div>
    `;
    return;
  }
  if (!rows.length) {
    priceListPreview.innerHTML = `
      <div class="price-list-preview__state" role="status" aria-live="polite">
        <strong>В прайсе пока нет строк.</strong>
        <span>Добавьте цены в каталоге или загрузите импорт цен в админке.</span>
      </div>
    `;
    return;
  }
  priceListPreview.innerHTML = `
    <div class="price-list-preview__rows">
      ${rows.slice(0, 8).map(priceListPreviewRowHtml).join("")}
    </div>
    ${rows.length > 8 ? `<p class="price-list-preview__more">Еще ${rows.length - 8} строк в скачиваемом прайсе.</p>` : ""}
  `;
}
async function loadPriceListPreview() {
  if (!priceListPreview) return;
  renderPriceListPreview("loading");
  try {
    const result = await apiRequest("/api/price-list?format=json");
    renderPriceListPreview("ready", Array.isArray(result.rows) ? result.rows : []);
  } catch (error) {
    renderPriceListPreview("error", [], error.message);
  }
}
function renderCatalogShell() {
  if (!catalogHome || !catalogListing || !catalogTools || !catalogTitle) return;
  const isHome = !isSearchPage && !isFavoritesPage && !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !state.search.trim();
  document.body.classList.toggle("catalog-listing-active", document.body.classList.contains("catalog-page") && !isHome);
  catalogHome.classList.toggle("is-hidden", !isHome);
  catalogListing.classList.toggle("is-hidden", isHome);
  catalogTools.classList.toggle("is-hidden", isHome || isFavoritesPage);
  updateCatalogPageBack(isHome);
  document.body.classList.remove("filters-open");
  updateFilterToggle();
  if (isFavoritesPage) {
    setCatalogPageTitle("Избранное");
    filterToggle?.classList.remove("is-hidden");
    updateFilterToggle();
    updateCatalogSeo();
    return;
  }
  if (isSearchPage) {
    setCatalogPageTitle(state.search.trim() ? `Результаты поиска: ${state.search.trim()}` : "Поиск по каталогу");
    filterToggle?.classList.remove("is-hidden");
    updateFilterToggle();
    updateCatalogSeo();
    return;
  }
  if (isHome) {
    setCatalogPageTitle(getSiteContent().catalogTitleDefault);
    filterToggle?.classList.add("is-hidden");
    updateCatalogSeo();
    return;
  }
  const titleParts = [];
  if (state.selectedCategory) titleParts.push(state.selectedCategory);
  if (state.selectedCollection) titleParts.push(state.selectedCollection);
  if (state.selectedHoliday) titleParts.push(state.selectedHoliday);
  if (!titleParts.length && state.search.trim()) titleParts.push("Результаты поиска");
  setCatalogPageTitle(titleParts.join(" · "));
  filterToggle?.classList.remove("is-hidden");
  updateFilterToggle();
  updateCatalogSeo();
}
function setMetaContent(selector, content) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement(selector.includes("property=") ? "meta" : "meta");
    const nameMatch = selector.match(/name="([^"]+)"/);
    const propertyMatch = selector.match(/property="([^"]+)"/);
    if (nameMatch) node.setAttribute("name", nameMatch[1]);
    if (propertyMatch) node.setAttribute("property", propertyMatch[1]);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}
function setJsonLd(id, data) {
  let node = document.head.querySelector(`script#${id}`);
  if (!node) {
    node = document.createElement("script");
    node.id = id;
    node.type = "application/ld+json";
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(data);
}
function removeJsonLd(id) {
  document.head.querySelector(`script#${id}`)?.remove();
}
function absoluteUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    return new URL(url, location.origin).href;
  } catch {
    return url;
  }
}
function productSchemaImages(product) {
  return [
    product?.image,
    ...(product?.gallery || []),
    ...(product?.images || []).map(productImageMetadataUrl),
  ]
    .map(absoluteUrl)
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index);
}
function productSchemaReviews(product) {
  return reviewsForProduct(product)
    .filter((review) => review.text)
    .slice(0, 5)
    .map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.authorName || "Sobag Opt buyer",
      },
      datePublished: review.createdAt || undefined,
      reviewBody: review.text,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
}
function productSchemaData(product) {
  const variant = findVariant(product);
  const prices = (product.variants || [])
    .map((item) => Number(item.price || 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  const stats = reviewStats(product);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.detailDescription || product.description || product.name,
    sku: product.baseSku || variant?.sku || product.id,
    mpn: product.baseSku || variant?.sku || product.id,
    brand: {
      "@type": "Brand",
      name: "Sobag Opt",
    },
    category: product.category || (product.categories || [])[0],
    image: productSchemaImages(product),
    url: `${location.origin}${location.pathname}#product-${encodeURIComponent(product.id)}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "RUB",
      lowPrice: prices.length ? Math.min(...prices) : Number(product.minPrice || product.basePrice || 0) || 0,
      highPrice: prices.length ? Math.max(...prices) : Number(product.maxPrice || product.basePrice || 0) || 0,
      offerCount: Math.max((product.variants || []).length, prices.length, 1),
      availability: product.stock === "ready" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
    },
  };
  if (stats.count) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(stats.average.toFixed(1)),
      reviewCount: stats.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  const reviews = productSchemaReviews(product);
  if (reviews.length) data.review = reviews;
  if (!data.image.length) delete data.image;
  return data;
}
function syncProductJsonLd(product) {
  if (!product || shouldLoadAdminCatalog() || !isProductPublished(product)) {
    removeJsonLd("sobag-product-jsonld");
    return;
  }
  setJsonLd("sobag-product-jsonld", productSchemaData(product));
}
function syncFaqJsonLd() {
  const section = document.querySelector("[data-faq-schema]");
  if (!section) {
    removeJsonLd("sobag-faq-jsonld");
    return;
  }
  const questions = [...section.querySelectorAll("details")]
    .map((item) => {
      const question = item.querySelector("[data-faq-question]")?.textContent?.trim() || "";
      const answer = item.querySelector("[data-faq-answer]")?.textContent?.replace(/\s+/g, " ").trim() || "";
      return question && answer
        ? {
            "@type": "Question",
            name: question,
            acceptedAnswer: {
              "@type": "Answer",
              text: answer,
            },
          }
        : null;
    })
    .filter(Boolean);
  if (!questions.length) {
    removeJsonLd("sobag-faq-jsonld");
    return;
  }
  setJsonLd("sobag-faq-jsonld", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions,
  });
}
function updateCatalogSeo() {
  if (!document.body.classList.contains("catalog-page")) return;
  const content = getSiteContent();
  const titleParts = [];
  if (isFavoritesPage) titleParts.push("Избранное");
  else if (state.selectedCategory) titleParts.push(state.selectedCategory);
  else if (state.selectedCollection) titleParts.push(state.selectedCollection);
  else if (state.selectedHoliday) titleParts.push(state.selectedHoliday);
  else if (state.search.trim()) titleParts.push(`Поиск: ${state.search.trim()}`);
  else titleParts.push(content.catalogTitleDefault || "Каталог");
  const title = `${titleParts.join(" · ")} | Sobag Opt`;
  const description = `Оптовый каталог Sobag Opt: ${titleParts.join(", ")}. Текстиль с принтами, варианты по размеру, материалу и типу изделия.`;
  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  const canonicalPath = location.pathname === "/index.html" ? "/" : location.pathname;
  canonical.setAttribute("href", `${location.origin}${canonicalPath}`);
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sobag Opt",
    url: location.origin,
    email: content.footerEmail || "opt@sobag-shop.online",
  };
  if (phoneHref(content.footerPhone).startsWith("tel:")) organizationSchema.telephone = content.footerPhone;
  setJsonLd("sobag-organization-jsonld", organizationSchema);
  setJsonLd("sobag-catalog-jsonld", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: titleParts.join(" · "),
    description,
    url: `${location.origin}${location.pathname}${location.search}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Sobag Opt", item: location.origin },
        { "@type": "ListItem", position: 2, name: "Каталог", item: `${location.origin}/catalog` },
        ...(titleParts.length ? [{ "@type": "ListItem", position: 3, name: titleParts.join(" · "), item: `${location.origin}${location.pathname}${location.search}` }] : []),
      ],
    },
  });
}
function updateFilterToggle() {
  if (!filterToggle) return;
  const content = getSiteContent();
  const open = document.body.classList.contains("filters-open");
  filterToggle.innerHTML = `<i data-lucide="${open ? "x" : "sliders-horizontal"}"></i> ${buttonLabel(open ? content.filterCloseButton : content.filterOpenButton)}`;
}
function openCatalogCategory(category) {
  if (!catalogListing || document.body.classList.contains("home-page")) {
    navigateWithinSite(`catalog.html?category=${encodeURIComponent(category)}`);
    return;
  }
  state.selectedCategory = category;
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.filters.category.clear();
  resetVisibleProducts();
  syncCatalogRoute({ mode: "push" });
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function openCatalogCollection(collection) {
  if (!catalogListing || document.body.classList.contains("home-page")) {
    navigateWithinSite(`catalog.html?collection=${encodeURIComponent(collection)}`);
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = collection;
  state.selectedHoliday = "";
  state.filters.collection.clear();
  resetVisibleProducts();
  syncCatalogRoute({ mode: "push" });
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function openCatalogHoliday(holiday) {
  if (!catalogListing || document.body.classList.contains("home-page")) {
    navigateWithinSite(`catalog.html?holiday=${encodeURIComponent(holiday)}`);
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = holiday;
  state.filters.holiday.clear();
  resetVisibleProducts();
  syncCatalogRoute({ mode: "push" });
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function initCatalogRoute() {
  if (!catalogListing) return;
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const collection = params.get("collection");
  const holiday = params.get("holiday");
  const search = params.get("q");
  if (category) state.selectedCategory = category;
  if (collection) state.selectedCollection = collection;
  if (holiday) state.selectedHoliday = holiday;
  if (search) {
    state.search = search;
    if (searchInput) searchInput.value = search;
  }
}
function backToCatalogHome() {
  if (!catalogListing) {
    navigateWithinSite("catalog.html");
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.search = "";
  if (searchInput) searchInput.value = "";
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
}
function renderFilters() {
  if (!filterGroups) return;
  const groups = [];
  if (!state.selectedCategory) groups.push({ key: "category", title: "Категории", label: (value) => value });
  if (!state.selectedCollection) groups.push({ key: "collection", title: "Подборки", label: (value) => value });
  if (!state.selectedHoliday) groups.push({ key: "holiday", title: "Праздники", label: (value) => value });
  groups.push(
    { key: "size", title: "Размер", label: (value) => value },
    { key: "material", title: "Материал", label: (value) => value }
  );
  filterGroups.innerHTML = groups
    .map((group) => {
      const query = (state.filterSearch[group.key] || "").toLowerCase();
      const options = uniqueOptions(group.key).filter((value) => group.label(value).toLowerCase().includes(query));
      if (!options.length && !state.filters[group.key].size) return "";
      return `
        <div class="filters__block filter-group" data-filter-group="${group.key}">
          <h3>${group.title}</h3>
          <label class="filter-search">
            <i data-lucide="search"></i>
            <input type="search" value="${state.filterSearch[group.key] || ""}" placeholder="Поиск в фильтре" data-filter-search="${group.key}" />
          </label>
          <div class="filter-options">
            ${options
              .map((value) => {
                const checked = state.filters[group.key].has(value) ? "checked" : "";
                return `<label><input type="checkbox" value="${value}" data-filter="${group.key}" ${checked} /> ${group.label(value)}</label>`;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
  refreshLucideIcons();
}
function productCardHtml(product) {
  const favorite = state.favorites.has(product.id) ? " is-active" : "";
  const favoritePressed = state.favorites.has(product.id) ? "true" : "false";
  const productId = escapeHtml(product.id);
  const productName = escapeHtml(product.name);
  const productSku = escapeHtml(product.baseSku);
  return `
        <article class="product-card">
          <div class="product-card__image">
            <button class="product-card__image-button" type="button" data-open-product="${productId}" aria-label="Открыть ${productName}">
              ${productPictureHtml(product, product.image, product.name, imageAttrs(640, 640))}
            </button>
            <button class="favorite-button${favorite}" type="button" title="${favoritePressed === "true" ? "Убрать из избранного" : "В избранное"}" data-favorite="${productId}" aria-pressed="${favoritePressed}">
              <i data-lucide="heart"></i>
            </button>
          </div>
          <div class="product-card__body">
            <div class="product-card__sku-row">
              <span class="product-card__sku">${productSku}</span>
              <button class="copy-sku-button" type="button" data-copy-sku="${productSku}" data-tooltip="Скопировать артикул" title="Скопировать артикул" aria-label="Скопировать артикул ${productSku}">
                <i data-lucide="copy"></i>
              </button>
            </div>
            <h3>${productName}</h3>
            <div class="product-card__bottom">
              <button class="add-button product-card__price-button" type="button" data-open-product="${productId}" aria-label="Открыть ${productName}">
                <span>от ${formatMoney(product.minPrice)}</span>
              </button>
            </div>
          </div>
        </article>
      `;
}
function resetProductGridRenderState() {
  if (!productGrid) return;
  delete productGrid.dataset.renderKey;
  delete productGrid.dataset.renderedCount;
}
function isServerCatalogInitialLoading() {
  if (!shouldUseServerCatalogList()) return false;
  return state.serverCatalog.status === "loading" && state.serverCatalog.key === serverCatalogKey() && !state.serverCatalog.items.length;
}
function productCardSkeletonHtml() {
  return `
        <article class="product-card product-card--skeleton" aria-hidden="true">
          <div class="product-card__image"></div>
          <div class="product-card__body">
            <span class="skeleton-line skeleton-line--sku"></span>
            <span class="skeleton-line skeleton-line--title"></span>
            <span class="skeleton-line skeleton-line--title-short"></span>
            <span class="skeleton-line skeleton-line--button"></span>
          </div>
        </article>
      `;
}
function renderProductsLoading() {
  if (!productGrid) return;
  productGrid.setAttribute("aria-busy", "true");
  productGrid.innerHTML = Array.from({ length: 8 }, productCardSkeletonHtml).join("");
  if (catalogLoadMore) catalogLoadMore.innerHTML = "";
  resetProductGridRenderState();
}
function renderProductGridCards(visibleList, renderKey = "") {
  productGrid.removeAttribute("aria-busy");
  const renderedKey = productGrid.dataset.renderKey || "";
  const renderedCount = Number(productGrid.dataset.renderedCount || 0) || 0;
  const canAppend =
    renderKey &&
    renderedKey === renderKey &&
    renderedCount > 0 &&
    renderedCount < visibleList.length &&
    productGrid.children.length === renderedCount;
  if (canAppend) {
    productGrid.insertAdjacentHTML("beforeend", visibleList.slice(renderedCount).map(productCardHtml).join(""));
  } else {
    productGrid.innerHTML = visibleList.map(productCardHtml).join("");
  }
  if (renderKey) {
    productGrid.dataset.renderKey = renderKey;
    productGrid.dataset.renderedCount = String(visibleList.length);
  } else {
    resetProductGridRenderState();
  }
}
function renderProducts() {
  if (!productGrid || !productCount) return;
  queueServerCatalogRefresh();
  if (isServerCatalogInitialLoading()) {
    renderSearchSuggestions();
    renderSearchResultsPanel([], 0);
    renderActiveFilterChips();
    productCount.textContent = "загрузка";
    renderCatalogSeoCopy(0);
    renderProductsLoading();
    return;
  }
  productGrid.removeAttribute("aria-busy");
  const localList = getFilteredProducts();
  const serverResult = currentServerCatalogResult();
  const list = serverResult ? serverResult.items : localList;
  const total = serverResult ? serverResult.total : list.length;
  const visibleList = serverResult ? list : list.slice(0, state.visibleLimit);
  renderSearchSuggestions();
  renderSearchResultsPanel(list, total);
  renderActiveFilterChips();
  productCount.textContent = `${total} ${productWord(total)}`;
  renderCatalogSeoCopy(total);
  if (!list.length) {
    const searchPrompt = isSearchPage && !state.search.trim();
    productGrid.innerHTML = `
      <div class="empty-products">
        <i data-lucide="${isFavoritesPage ? "heart" : "search-x"}"></i>
        <strong>${isFavoritesPage ? "Избранное пока пустое" : "Товары не найдены"}</strong>
        <span>${isFavoritesPage ? "Нажмите сердечко в каталоге, чтобы сохранить товары здесь." : "Попробуйте изменить фильтры или запрос поиска."}</span>
        ${isFavoritesPage ? `<button class="ghost-button" type="button" data-nav="catalog.html">в каталог</button>` : ""}
      </div>
    `;
    if (searchPrompt) {
      const emptyTitle = productGrid.querySelector(".empty-products strong");
      const emptyText = productGrid.querySelector(".empty-products span");
      if (emptyTitle) emptyTitle.textContent = "Введите поисковый запрос";
      if (emptyText) emptyText.textContent = "Поиск работает по точному артикулу, названию, подборкам, праздникам и тегам.";
    }
    if (catalogLoadMore) catalogLoadMore.innerHTML = "";
    resetProductGridRenderState();
    renderRecentProducts();
    refreshLucideIcons();
    return;
  }
  renderProductGridCards(visibleList, serverResult ? `server:${serverResult.key}` : "");
  if (catalogLoadMore) {
    if (serverResult) {
      const remaining = Math.max(0, total - list.length);
      catalogLoadMore.innerHTML =
        serverResult.hasMore && remaining
          ? `<button class="ghost-button" type="button" data-show-more-products>${state.serverCatalog.loadingMore ? "Загрузка..." : `Показать ещё ${Math.min(SERVER_CATALOG_PAGE_SIZE, remaining)} из ${remaining}`}</button>`
          : "";
    } else {
      catalogLoadMore.innerHTML =
        list.length > visibleList.length
          ? `<button class="ghost-button" type="button" data-show-more-products>Показать ещё ${Math.min(CATALOG_PAGE_SIZE, list.length - visibleList.length)} из ${list.length - visibleList.length}</button>`
          : "";
    }
  }
  renderRecentProducts();
  refreshLucideIcons();
}
function renderCart() {
  const totals = getCartTotals();
  const lines = [...state.cart.values()];
  if (cartItems) {
    cartItems.innerHTML = lines
      .map((line) => {
        const lineSummary = lineTotals(line, totals.discount);
        const unitPrice = discountedUnitPrice(line.variant.price, totals.discount);
        return `
          <div class="cart-line">
            <div>
              <strong>${line.productName}</strong>
              <span>${line.variant.sku}</span>
              <span>${line.variant.type}, ${line.variant.size}, ${line.variant.material}</span>
              <span>${line.qty} шт. × ${formatMoney(unitPrice)} · скидка ${lineSummary.discount}%</span>
            </div>
            <button type="button" title="Удалить" data-remove="${line.key}">
              <i data-lucide="x"></i>
            </button>
          </div>
        `;
      })
      .join("");
  }
  cartEmpty?.classList.toggle("is-hidden", lines.length > 0);
  setTextWithPop(cartCount, totals.qty);
  setTextWithPop(cartHeaderTotal, formatMoney(totals.total));
  setTextWithPop(cartHeaderDiscount, totals.discount ? `скидка ${totals.discount}%` : getBasketDiscountHint(totals.subtotal));
  const headerCartButton = cartCount?.closest(".cart-button");
  headerCartButton?.classList.toggle("is-empty", totals.qty === 0);
  setTextWithPop(favoriteCount, state.favorites.size);
  if (subtotalNode) subtotalNode.textContent = formatMoney(totals.subtotal);
  if (discountValue) {
    discountValue.textContent = getBasketDiscountHint(totals.subtotal);
    if (discountValue.previousElementSibling) discountValue.previousElementSibling.hidden = true;
  }
  if (grandTotal) grandTotal.textContent = formatMoney(totals.total);
  const cartMinHint = document.querySelector("#cartMinHint");
  const checkoutButton = document.querySelector("#requestForm button[type='submit']");
  const content = getSiteContent();
  const cartReady = totals.total >= MIN_CART_TOTAL;
  if (cartMinHint) {
    cartMinHint.textContent = cartReady
      ? "Минимальная сумма набрана, корзину можно отправлять."
      : content.requestMinHint;
  }
  if (checkoutButton) {
    checkoutButton.disabled = !cartReady;
    checkoutButton.innerHTML = cartReady
      ? `<i data-lucide="send"></i> ${buttonLabel(content.requestSubmitReady)}`
      : `<i data-lucide="lock"></i> ${buttonLabel(content.requestSubmitLocked)}`;
  }
  const maxTier = quantityTiers[quantityTiers.length - 1];
  if (discountProgress) discountProgress.style.width = `${Math.min((totals.qty / maxTier.qty) * 100, 100)}%`;
  if (discountHint) {
    discountHint.textContent = getBasketDiscountHint(totals.subtotal);
  }
  saveCart();
  refreshLucideIcons();
}
function renderAccountButton() {
  const button = document.querySelector("#accountButton");
  if (!button) return;
  const users = getUsers();
  const user = users[state.currentUser];
  button.classList.remove("account-login-button");
  button.title = user ? `${user.name || user.email}` : "Войти или зарегистрироваться";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = user?.role === "admin"
    ? '<i data-lucide="shield"></i>'
    : user?.role === "manager"
    ? '<i data-lucide="briefcase-business"></i>'
    : '<i data-lucide="user"></i>';
  refreshLucideIcons();
}
function findVariant(product, selection = state.activeVariant) {
  return (
    product.variants.find(
      (variant) =>
        variant.type === selection.type && variant.size === selection.size && variant.material === selection.material
    ) || product.variants[0]
  );
}
function relatedProductsHtml(product) {
  const list = relatedProducts(product, 4);
  if (!list.length) return "";
  return `
    <section class="related-products" aria-label="Похожие товары">
      <div class="related-products__head">
        <h3>Похожие принты</h3>
        <span>Ещё товары из близких категорий и подборок</span>
      </div>
      <div class="mini-product-row">
        ${list.map(miniProductCard).join("")}
      </div>
    </section>
  `;
}
function reviewFormHtml(product) {
  const user = getUsers()[state.currentUser];
  if (!user) {
    return `
      <div class="review-login-note" role="status" aria-live="polite">
        <span>Отзывы могут оставлять только зарегистрированные покупатели после заказа.</span>
        <button class="ghost-button" type="button" data-open-account>Войти</button>
      </div>
    `;
  }
  if (userHasSubmittedReview(user, product)) {
    return `
      <div class="review-login-note" role="status" aria-live="polite">
        <span>Вы уже отправили отзыв на этот товар.</span>
      </div>
    `;
  }
  if (!userHasEligibleReviewOrder(user, product)) {
    return `
      <div class="review-login-note" role="status" aria-live="polite">
        <span>Оставить отзыв можно после заказа этого товара.</span>
      </div>
    `;
  }
  return `
    <form class="review-form" data-review-form="${escapeHtml(product.id)}">
      <input type="hidden" name="rating" value="5" />
      <div class="review-form__head">
        <span>Ваша оценка</span>
        <div class="review-rating-input" aria-label="Оценка товара">
          ${[1, 2, 3, 4, 5]
            .map((value) => `<button class="is-active" type="button" data-review-star="${value}" aria-pressed="true" aria-label="${value} из 5">★</button>`)
            .join("")}
        </div>
      </div>
      <textarea name="text" rows="3" maxlength="1000" placeholder="Напишите, что понравилось в товаре, качестве печати или упаковке"></textarea>
      <button class="primary-button" type="submit">Отправить отзыв</button>
      <small>Отзыв появится в карточке после модерации.</small>
    </form>
  `;
}
function productReviewsHtml(product) {
  const reviews = reviewsForProduct(product);
  const stats = reviewStats(product);
  return `
    <section class="product-reviews" aria-label="Отзывы о товаре">
      <div class="product-reviews__head">
        <div>
          <h3>Отзывы</h3>
          <span>${stats.count ? `${stats.average.toFixed(1)} из 5 · ${stats.count} ${reviewWord(stats.count)}` : "Пока нет одобренных отзывов"}</span>
        </div>
        ${stats.count ? starsHtml(stats.average, `Средняя оценка ${stats.average.toFixed(1)} из 5`) : ""}
      </div>
      ${
        reviews.length
          ? `<div class="review-list">${reviews
              .slice(0, 6)
              .map(
                (review) => `
                  <article class="review-card">
                    <div class="review-card__head">
                      <strong>${escapeHtml(review.authorName)}</strong>
                      ${starsHtml(review.rating, `Оценка ${review.rating} из 5`)}
                    </div>
                    <p>${escapeHtml(review.text)}</p>
                    <span>${escapeHtml(review.createdAt ? new Date(review.createdAt).toLocaleDateString("ru-RU") : "")}</span>
                  </article>
                `
              )
              .join("")}</div>`
          : '<p class="review-empty">Отзывы смогут оставить покупатели после заказа товара.</p>'
      }
      ${reviewFormHtml(product)}
    </section>
  `;
}
function productModalHtml(product) {
  const variant = findVariant(product);
  const previewSubtotal = getCartTotals().subtotal + variant.price * state.activeVariant.qty;
  const discount = getBasketDiscount(previewSubtotal);
  const unitPrice = discountedUnitPrice(variant.price, discount);
  const total = unitPrice * state.activeVariant.qty;
  const basketDiscountHint = getBasketDiscountHint(getCartTotals().subtotal + variant.price * state.activeVariant.qty);
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  return `
    <div class="modal is-visible" id="productModal" role="dialog" aria-modal="true" aria-labelledby="detailProductName">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel product-detail">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div class="product-detail__layout">
          <div class="product-detail__main">
            <div class="product-detail__media">
              ${productPictureHtml(product, gallery[0], product.name, `id="detailMainImage" ${imageAttrs(900, 900, "eager", "high")}`)}
              <div class="product-gallery" aria-label="Фотографии товара">
                ${gallery
                  .map(
                    (image, index) => `
                      <button class="product-gallery__thumb${index === 0 ? " is-active" : ""}" type="button" data-detail-image="${image}" aria-label="Фото ${index + 1}">
                        ${productPictureHtml(product, image, "", imageAttrs(160, 160))}
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
            <div class="product-detail__copy">
              <p class="eyebrow">${product.baseSku}</p>
              <h2 id="detailProductName">${variant.name}</h2>
              <p>${product.description}</p>
              <p class="product-detail__note">${product.detailDescription}</p>
              <div class="detail-tags" aria-label="Быстрые фильтры">
                ${(product.categories || [product.category])
                  .map((category) => `<button type="button" class="detail-tag" data-open-category="${category}">${category}</button>`)
                  .join("")}
                ${product.collections
                  .map((tag) => `<button type="button" class="detail-tag" data-open-collection="${tag}">${tag}</button>`)
                  .join("")}
                ${product.holidays
                  .map((tag) => `<button type="button" class="detail-tag" data-open-holiday="${tag}">${tag}</button>`)
                  .join("")}
              </div>
              ${relatedProductsHtml(product)}
              ${productReviewsHtml(product)}
            </div>
          </div>
          <aside class="product-detail__options">
            <div class="sku-line">
              <span>Выбранный артикул</span>
              <div class="sku-line__value">
                <strong id="selectedSku">${variant.sku}</strong>
                <button class="copy-sku-button copy-sku-button--detail" type="button" data-copy-sku="${variant.sku}" data-tooltip="Скопировать артикул" title="Скопировать артикул" aria-label="Скопировать выбранный артикул ${variant.sku}">
                  <i data-lucide="copy"></i>
                </button>
              </div>
            </div>
            ${variantControls("type", "Тип товара", product.types)}
            ${variantControls("size", "Размер", product.sizes)}
            ${variantControls("material", "Материал", product.materials)}
            <div class="detail-qty">
              <label>
                Количество, шт.
                <div class="detail-qty-control">
                  <button type="button" data-detail-qty-step="-1" aria-label="Уменьшить количество">
                    <i data-lucide="minus"></i>
                  </button>
                  <input id="detailQty" type="number" min="0" step="1" value="${state.activeVariant.qty}" />
                  <button type="button" data-detail-qty-step="1" aria-label="Увеличить количество">
                    <i data-lucide="plus"></i>
                  </button>
                </div>
              </label>
              <div class="detail-price">
                <span>Цена за шт.</span>
                <strong id="detailPrice">${formatMoney(unitPrice)}</strong>
                <small id="detailDiscount">${basketDiscountHint}</small>
              </div>
            </div>
            <a class="ghost-button detail-price-download" href="/api/price-list" download="sobag-price-list.csv" data-price-download data-price-format="csv" title="Скачать прайс CSV для Excel" aria-label="Скачать прайс CSV">
              <i data-lucide="download"></i>
              Прайс
            </a>
            <div class="detail-total">
              <span>ИТОГО</span>
              <strong id="detailTotal">${formatMoney(total)}</strong>
            </div>
            <button class="primary-button" type="button" data-add-variant="${product.id}">
              <i data-lucide="shopping-cart"></i>
              Добавить в корзину
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}
function handleProductImageError(event) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.productImage !== "true") return;
  const fallbackSrc = img.dataset.fallbackSrc || "assets/production-workshop-1.png";
  if (img.dataset.fallbackApplied === "true" || img.getAttribute("src") === fallbackSrc) return;
  const ownSrc = new URL(img.getAttribute("src") || "", document.baseURI).href;
  if (img.closest("picture")?.querySelector("source[data-product-source]") && img.currentSrc && img.currentSrc !== ownSrc) return;
  img.dataset.fallbackApplied = "true";
  img.classList.add("is-fallback-image");
  img.closest("picture")?.querySelectorAll("source").forEach((source) => source.remove());
  const fallbackImage = img.cloneNode(false);
  fallbackImage.removeAttribute("srcset");
  fallbackImage.removeAttribute("sizes");
  fallbackImage.src = new URL(fallbackSrc, document.baseURI).href;
  fallbackImage.setAttribute("src", fallbackSrc);
  img.replaceWith(fallbackImage);
}
function variantControls(key, title, options) {
  return `
    <fieldset class="variant-group">
      <legend>${title}</legend>
      <div class="variant-options">
        ${options
          .map((option) => {
            const active = state.activeVariant[key] === option ? " is-active" : "";
            return `<button class="variant-option${active}" type="button" data-variant-key="${key}" data-variant-value="${option}">${option}</button>`;
          })
          .join("")}
      </div>
    </fieldset>
  `;
}
async function openProduct(productId) {
  const baseProduct = products.find((item) => item.id === productId);
  const product = await loadProductDetailForModal(baseProduct);
  if (!product) return;
  state.activeProductId = product.id;
  saveRecentProduct(product.id);
  state.activeVariant = {
    type: product.types[0],
    size: product.sizes.includes("40x40") ? "40x40" : product.sizes[0],
    material: product.materials[0],
    qty: 1,
  };
  document.body.insertAdjacentHTML("beforeend", productModalHtml(product));
  syncProductJsonLd(product);
  activateModal(document.querySelector("#productModal"));
  refreshLucideIcons();
}
function refreshProductModal() {
  const modal = document.querySelector("#productModal");
  if (!modal) return;
  const product = products.find((item) => item.id === state.activeProductId);
  const variant = findVariant(product);
  const detailQtyInput = document.querySelector("#detailQty");
  const rawQty = detailQtyInput?.value ?? state.activeVariant.qty;
  const qty = Math.max(0, Math.round(Number(rawQty === "" ? 0 : rawQty || 0)));
  state.activeVariant.qty = qty;
  if (detailQtyInput && (document.activeElement !== detailQtyInput || detailQtyInput.value !== "")) detailQtyInput.value = qty;
  const discount = getBasketDiscount(getCartTotals().subtotal + variant.price * qty);
  const unitPrice = discountedUnitPrice(variant.price, discount);
  const basketDiscountHint = getBasketDiscountHint(getCartTotals().subtotal + variant.price * qty);
  document.querySelector("#selectedSku").textContent = variant.sku;
  document.querySelector("#detailProductName").textContent = variant.name;
  const detailCopySkuButton = modal.querySelector(".copy-sku-button--detail");
  if (detailCopySkuButton) {
    detailCopySkuButton.dataset.copySku = variant.sku;
    detailCopySkuButton.setAttribute("aria-label", `Скопировать выбранный артикул ${variant.sku}`);
  }
  document.querySelector("#detailPrice").textContent = formatMoney(unitPrice);
  document.querySelector("#detailDiscount").textContent = basketDiscountHint;
  document.querySelector("#detailTotal").textContent = formatMoney(unitPrice * qty);
  const addButton = modal.querySelector("[data-add-variant]");
  if (addButton) addButton.disabled = qty <= 0;
  modal.querySelectorAll(".variant-option").forEach((button) => {
    button.classList.toggle("is-active", state.activeVariant[button.dataset.variantKey] === button.dataset.variantValue);
  });
  syncProductJsonLd(product);
}
function addVariantLineToCart(product, variant, qty) {
  if (!product || !variant || !qty) {
    showToast("Укажите количество товара перед добавлением в корзину.");
    return false;
  }
  const key = `${product.id}:${variant.sku}`;
  const existing = state.cart.get(key);
  state.cart.set(key, {
    key,
    productId: product.id,
    productName: variant.name,
    productImage: product.image,
    variant,
    qty: existing ? existing.qty + qty : qty,
  });
  renderCart();
  return true;
}
function addVariantToCart(productId) {
  const product = products.find((item) => item.id === productId);
  const variant = findVariant(product);
  const qty = Math.max(0, Number(document.querySelector("#detailQty")?.value || state.activeVariant.qty || 0));
  if (!qty) {
    showToast("Укажите количество товара перед добавлением в корзину.");
    return;
  }
  const key = `${product.id}:${variant.sku}`;
  const existing = state.cart.get(key);
  state.cart.set(key, {
    key,
    productId: product.id,
    productName: variant.name,
    productImage: product.image,
    variant,
    qty: existing ? existing.qty + qty : qty,
  });
  renderCart();
  closeModal();
  showToast("Вариант добавлен в корзину и сохранен за текущим пользователем.");
}
function setActualSlide(index) {
  const slides = [...document.querySelectorAll("[data-actual-slide]")];
  if (!slides.length) return;
  actualSlideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === actualSlideIndex;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.tabIndex = active ? 0 : -1;
  });
}
function nextActualSlide(direction = 1) {
  setActualSlide(actualSlideIndex + direction);
}
function startActualSlider() {
  window.clearInterval(actualSlideTimer);
  actualSlideTimer = window.setInterval(() => nextActualSlide(1), 15000);
}
function initActualSlider() {
  setActualSlide(0);
  startActualSlider();
}
function downloadTemplate() {
  downloadCsv("sobag-products-template.csv", [
    productExportColumns.map((column) => column.label),
    [
      "Коллекция Sample",
      "SB-PIL-SMP",
      "Подушки; Наволочки",
      "Аниме",
      "Аниме; Подарки",
      "Новый год",
      "Аниме; Подарки; интерьер",
      "Подушка; Наволочка",
      "30x30; 35x35; 40x40; 45x45; 50x50",
      "Велюр; Габардин",
      "220",
      "",
      "draft",
      "made",
      "Краткое описание для каталога",
      "Подробное описание для карточки товара",
      "Новинка",
      "60",
      "SB-PIL-SMP",
      "2.jpg; 3.jpg; 4.jpg",
    ],
  ]);
}
function downloadXlsxTemplate() {
  window.location.href = "templates/sobag-products-template.xlsx";
}
function productGalleryForExport(product) {
  const generatedImages = new Set();
  return (product.gallery || [])
    .filter((image) => image && image !== product.image && !generatedImages.has(image))
    .join("; ");
}
function productExportValue(product, key) {
  if (["category", "types", "sizes", "materials", "collections", "holidays", "tags"].includes(key)) {
    if (key === "category") return product.categories || [product.category].filter(Boolean);
    return product[key] || [];
  }
  if (key === "gallery") return productGalleryForExport(product);
  if (key === "photoFolder") return product.photoFolder || product.baseSku;
  return product[key] ?? "";
}
function productExportRow(product) {
  return productExportColumns.map((column) => productExportValue(product, column.key));
}
function downloadProductsCsv(source, fileName) {
  const rows = source.map(productExportRow);
  downloadCsv(fileName, [productExportColumns.map((column) => column.label), ...rows]);
  showToast(`Скачано товаров: ${source.length}.`);
}
function productVariantPriceRows(source) {
  return source.flatMap((product) =>
    product.variants.map((variant) => [
      product.baseSku,
      variant.sku,
      variant.name,
      variant.type,
      variant.size,
      variant.material,
      variant.price,
      product.categories || [product.category].filter(Boolean),
      product.collections || [],
      product.holidays || [],
      product.tags || [],
      product.photoFolder || product.baseSku,
    ])
  );
}
function downloadVariantPricesCsv(source, fileName) {
  const rows = productVariantPriceRows(source);
  downloadCsv(fileName, [variantPriceExportColumns, ...rows]);
  showToast(`Скачано вариантов: ${rows.length}.`);
}
function downloadAdminPriceRowsCsv(rows, fileName = "sobag-admin-prices.csv") {
  const preparedRows = rows.map(({ product, variant }) => [
    product.baseSku,
    variant.sku,
    variant.name,
    variant.type,
    variant.size,
    variant.material,
    variant.price,
    product.categories || [product.category].filter(Boolean),
    product.collections || [],
    product.holidays || [],
    product.tags || [],
  ]);
  downloadCsv(fileName, [variantPriceExportColumns.slice(0, 11), ...preparedRows]);
  showToast(`Скачано строк цен: ${preparedRows.length}.`);
}
async function downloadAdminPriceRowsXlsx(rows, fileName = "sobag-admin-prices.xlsx") {
  if (!(await ensureXlsxLibrary())) {
    downloadAdminPriceRowsCsv(rows, fileName.replace(/\.xlsx$/i, ".csv"));
    return;
  }
  const preparedRows = rows.map(({ product, variant }) => [
    product.baseSku,
    variant.sku,
    variant.name,
    variant.type,
    variant.size,
    variant.material,
    variant.price,
    (product.categories || [product.category].filter(Boolean)).join("; "),
    (product.collections || []).join("; "),
    (product.holidays || []).join("; "),
    (product.tags || []).join("; "),
  ]);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([variantPriceExportColumns.slice(0, 11), ...preparedRows]);
  sheet["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 34 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Цены вариантов");
  XLSX.writeFile(workbook, fileName);
  showToast(`Скачано строк цен в XLSX: ${preparedRows.length}.`);
}
function downloadOrdersCsv() {
  const rows = getOrders().map((order) => {
    const customer = order.customer || {};
    const items = order.items || [];
    return [
      order.id || "",
      order.date || order.createdAt || "",
      orderStatusLabel(order.status),
      order.managerName || order.managerEmail || "",
      customer.name || "",
      customer.company || "",
      customer.inn || "",
      customer.kpp || "",
      customer.phone || "",
      customer.email || order.userEmail || "",
      customer.city || "",
      customer.address || "",
      customer.legalAddress || "",
      customer.delivery || "",
      customer.packaging || "",
      customer.layoutFileName || "",
      order.total || 0,
      order.promo || "",
      items.length,
      items.map((line) => `${line.variant?.sku || ""} x ${line.qty || 0}`).join("; "),
      order.managerNote || "",
      customer.comment || "",
    ];
  });
  downloadCsv("sobag-orders.csv", [
    ["Номер", "Дата", "Статус", "Менеджер", "Имя", "Компания", "ИНН", "КПП", "Телефон", "Email", "Город", "Адрес", "Юр. адрес", "Доставка", "Упаковка", "Макет", "Сумма", "Промокод", "Позиций", "Артикулы", "Комментарий менеджера", "Комментарий клиента"],
    ...rows,
  ]);
  showToast(`Скачано заказов: ${rows.length}.`);
}
function orderCsvRows(order) {
  const customer = order?.customer || {};
  const items = order?.items || [];
  return [
    ["Поле", "Значение"],
    ["Номер", order?.id || ""],
    ["Дата", order?.date || order?.createdAt || ""],
    ["Статус", orderStatusLabel(order?.status)],
    ["Менеджер", order?.managerName || order?.managerEmail || ""],
    ["Имя", customer.name || ""],
    ["Компания", customer.company || ""],
    ["ИНН", customer.inn || ""],
    ["КПП", customer.kpp || ""],
    ["Телефон", customer.phone || ""],
    ["Email", customer.email || order?.userEmail || ""],
    ["Город", customer.city || ""],
    ["Адрес", customer.address || ""],
    ["Юр. адрес", customer.legalAddress || ""],
    ["Доставка", customer.delivery || ""],
    ["Упаковка", customer.packaging || ""],
    ["Макет", customer.layoutFileName || ""],
    ["Сумма", order?.total || 0],
    ["Промокод", order?.promo || ""],
    [],
    ["Артикул", "Наименование", "Тип", "Размер", "Материал", "Количество", "Цена"],
    ...items.map((line) => {
      const variant = line.variant || {};
      return [variant.sku || "", variant.name || line.productName || "", variant.type || "", variant.size || "", variant.material || "", line.qty || 0, variant.price || 0];
    }),
  ];
}
function downloadOrderCsv(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) {
    showToast("Заказ не найден.");
    return;
  }
  downloadCsv(`sobag-order-${order.id || "order"}.csv`, orderCsvRows(order));
}
async function downloadOrderXlsx(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) {
    showToast("Заказ не найден.");
    return;
  }
  const rows = orderCsvRows(order);
  if (await downloadRowsXlsx(rows, `sobag-order-${order.id || "order"}.xlsx`, "Заказ")) {
    showToast("Заказ скачан в XLSX.");
    return;
  }
  downloadCsv(`sobag-order-${order.id || "order"}.csv`, rows);
  showToast("XLSX недоступен на этой странице, скачан CSV.");
}
function printOrder(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) {
    showToast("Заказ не найден.");
    return;
  }
  const customer = order.customer || {};
  const lines = (order.items || [])
    .map((line) => {
      const variant = line.variant || {};
      return `<tr><td>${escapeHtml(variant.sku || "")}</td><td>${escapeHtml(variant.name || line.productName || "")}</td><td>${escapeHtml([variant.type, variant.size, variant.material].filter(Boolean).join(", "))}</td><td>${line.qty || 0}</td><td>${formatMoney(variant.price || 0)}</td></tr>`;
    })
    .join("");
  const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!win) {
    showToast("Браузер заблокировал печатное окно.");
    return;
  }
  win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Заказ ${escapeHtml(order.id || "")}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:28px}dl{display:grid;grid-template-columns:180px 1fr;gap:8px 16px}dt{color:#666}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style></head><body><h1>Заказ ${escapeHtml(order.id || "")}</h1><dl><dt>Статус</dt><dd>${escapeHtml(orderStatusLabel(order.status))}</dd><dt>Дата</dt><dd>${escapeHtml(order.date || order.createdAt || "")}</dd><dt>Покупатель</dt><dd>${escapeHtml(customer.name || customer.company || "")}</dd><dt>Компания</dt><dd>${escapeHtml(customer.company || "")}</dd><dt>ИНН</dt><dd>${escapeHtml(customer.inn || "")}</dd><dt>КПП</dt><dd>${escapeHtml(customer.kpp || "")}</dd><dt>Телефон</dt><dd>${escapeHtml(customer.phone || "")}</dd><dt>Email</dt><dd>${escapeHtml(customer.email || order.userEmail || "")}</dd><dt>Город</dt><dd>${escapeHtml(customer.city || "")}</dd><dt>Адрес</dt><dd>${escapeHtml(customer.address || "")}</dd><dt>Юр. адрес</dt><dd>${escapeHtml(customer.legalAddress || "")}</dd><dt>Доставка</dt><dd>${escapeHtml(customer.delivery || "")}</dd><dt>Упаковка</dt><dd>${escapeHtml(customer.packaging || "")}</dd><dt>Макет</dt><dd>${escapeHtml(customer.layoutFileName || "")}</dd><dt>Комментарий</dt><dd>${escapeHtml(customer.comment || "")}</dd><dt>Итого</dt><dd><b>${formatMoney(order.total || 0)}</b></dd></dl><table><thead><tr><th>Артикул</th><th>Наименование</th><th>Параметры</th><th>Кол-во</th><th>Цена</th></tr></thead><tbody>${lines}</tbody></table><script>window.print();</script></body></html>`);
  win.document.close();
}
function adminOrderUrl(orderId) {
  return `admin-order.html?id=${encodeURIComponent(orderId || "")}`;
}
function adminCustomerUrl(email) {
  return `admin-customer.html?email=${encodeURIComponent(email || "")}`;
}
function addMissingCatalogCategories(sourceProducts) {
  const content = getSiteContent();
  const catalogCategories = addMissingCatalogItems(
    content.catalogCategories,
    sourceProducts.flatMap((product) => product.categories || [product.category]),
    (name) => ({
      name,
      icon: "tag",
      description: "Категория добавлена из импорта. Эмблему и описание можно уточнить в админке.",
      image: "",
    })
  );
  const catalogCollections = addMissingCatalogItems(content.catalogCollections, sourceProducts.flatMap((product) => product.collections || []), (name) => ({
    name,
    icon: "tag",
    description: "Подборка добавлена из импорта. Название, описание и эмблему можно уточнить в админке.",
    image: "",
  }));
  const catalogHolidays = addMissingCatalogItems(content.catalogHolidays, sourceProducts.flatMap((product) => product.holidays || []), (name) => ({
    name,
    icon: "calendar-days",
    description: "Праздник добавлен из импорта. Сезонное описание и эмблему можно уточнить в админке.",
    image: "",
  }));
  if (
    catalogCategories.length === content.catalogCategories.length &&
    catalogCollections.length === content.catalogCollections.length &&
    catalogHolidays.length === content.catalogHolidays.length
  ) {
    return;
  }
  saveSiteContent({
    ...content,
    catalogCategories,
    catalogCollections,
    catalogHolidays,
  });
}
function addMissingCatalogItems(currentItems, names, makeItem) {
  const existing = new Set(currentItems.map((item) => normalizeTaxonomyItem(item.name).toLocaleLowerCase("ru-RU")));
  const additions = [];
  names.forEach((rawName) => {
    const name = normalizeTaxonomyItem(rawName);
    const key = name.toLocaleLowerCase("ru-RU");
    if (!name || existing.has(key)) return;
    existing.add(key);
    additions.push(makeItem(name));
  });
  return additions.length ? [...currentItems, ...additions] : currentItems;
}
async function importExcel(file) {
  const rows = await readProductRowsFromFile(file);
  const updateExisting = Boolean(state.importUpdateExisting);
  const existingBySku = new Map(products.map((product) => [baseSkuKey(product.baseSku), product]));
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const seenSkus = new Set();
  let skippedDuplicates = 0;
  const imported = rows.reduce((items, row) => {
    if (!rowValue(row, "name") || !rowValue(row, "baseSku")) return items;
    const baseSku = normalizeBaseSku(rowValue(row, "baseSku"));
    const skuKey = baseSkuKey(baseSku);
    const existingProduct = updateExisting ? existingBySku.get(skuKey) : null;
    if ((existingSkus.has(skuKey) && !updateExisting) || seenSkus.has(skuKey)) {
      skippedDuplicates += 1;
      return items;
    }
    seenSkus.add(skuKey);
    if (existingProduct) {
      if (!rowValue(row, "category")) row.category = existingProduct.category;
      if (!rowValue(row, "description")) row.description = existingProduct.description;
      if (!rowValue(row, "detailDescription")) row.detailDescription = existingProduct.detailDescription;
    }
    const gallery = splitList(rowValue(row, "gallery") || "");
    const rowImage = rowValue(row, "image");
    const rowStatus = rowValue(row, "status");
    items.push(
      normalizeProduct({
        id: existingProduct?.id || `${rowValue(row, "baseSku")}-${Date.now()}-${Math.random().toString(16).slice(2)}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        baseSku,
        name: String(rowValue(row, "name")).trim(),
        category: String(rowValue(row, "category") || "Подушки").trim(),
        categories: splitList(rowValue(row, "category") || "Подушки"),
        theme: String(rowValue(row, "theme") || existingProduct?.theme || "").trim(),
        collections: splitList(rowValue(row, "collections") || rowValue(row, "theme") || existingProduct?.collections?.join(";") || existingProduct?.theme || ""),
        holidays: splitList(rowValue(row, "holidays") || existingProduct?.holidays?.join(";") || ""),
        tags: splitList(rowValue(row, "tags") || rowValue(row, "theme") || existingProduct?.tags?.join(";") || existingProduct?.theme || ""),
        types: splitList(rowValue(row, "types") || existingProduct?.types?.join(";") || TYPE_OPTIONS.join(";")),
        sizes: splitList(rowValue(row, "sizes") || existingProduct?.sizes?.join(";") || SIZE_OPTIONS.join(";")),
        materials: splitList(rowValue(row, "materials") || existingProduct?.materials?.join(";") || MATERIAL_OPTIONS.join(";")),
        basePrice: Number(rowValue(row, "basePrice") || existingProduct?.basePrice || 220),
        image: rowImage || existingProduct?.image || "assets/production-workshop-1.png",
        status: rowStatus || existingProduct?.status || "draft",
        stock: rowValue(row, "stock") || existingProduct?.stock || "made",
        gallery: gallery.length ? gallery : existingProduct?.gallery || [],
        images: existingProduct?.images || [],
        photoFolder: rowValue(row, "photoFolder") || existingProduct?.photoFolder || rowValue(row, "baseSku"),
        badge: rowValue(row, "badge") || existingProduct?.badge || "Excel",
        description: rowValue(row, "description") || "Карточка импортирована из Excel.",
        detailDescription: rowValue(row, "detailDescription") || "Карточка импортирована из Excel. Фото и параметры можно уточнить перед публикацией.",
        popular: Number(rowValue(row, "popular") || existingProduct?.popular || 55),
        variantPrices: existingProduct?.variantPrices || {},
      })
    );
    return items;
  }, []);
  addMissingCatalogCategories(imported);
  await createImportBatch(imported, file.name || "admin-import", { updateExisting });
  if (state.importPhotoFiles.length) {
    buildImportPhotoReport(state.importPhotoFiles);
    renderAdminImportPage();
  }
  if (updateExisting) {
    showToast(
      skippedDuplicates
        ? `Из Excel загружено строк для предпросмотра: ${imported.length}. Повторы в файле пропущены: ${skippedDuplicates}.`
        : `Из Excel загружено строк для предпросмотра: ${imported.length}.`
    );
    return;
  }
  showToast(
    skippedDuplicates
      ? `Из Excel загружено новых карточек: ${imported.length}. Дубли пропущены: ${skippedDuplicates}.`
      : `Из Excel загружено новых карточек: ${imported.length}.`
  );
}
function readContentFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 1_500_000) {
    showToast("Изображение слишком тяжелое для локального хранения. Лучше загрузить файл до 1.5 МБ.");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    input.dataset.imageValue = String(reader.result);
    const preview = input.closest(".admin-image-upload")?.querySelector("img");
    if (preview) preview.src = String(reader.result);
    showToast("Изображение загружено в предпросмотр. Нажмите «Сохранить контент».");
  });
  reader.readAsDataURL(file);
}
async function importPriceFile(file) {
  const rows = await readTabularFileRows(file, {
    onXlsxUnavailable: () => showToast("XLSX библиотека недоступна. Загрузите CSV или повторите позже."),
  });
  if (!rows.length) return;
  const showServerImportError = (message) => {
    setBackendPricePreview(
      {
        source: "server",
        errors: [{ row: "", message }],
        changes: [],
      },
      rows
    );
  };
  try {
    const response = await fetch("/api/admin/prices", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", rows }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok || Array.isArray(result.errors)) {
      setBackendPricePreview(result, rows);
      return;
    }
    showServerImportError(result.message || "Серверный предпросмотр импорта цен недоступен. Применение отключено до успешной проверки.");
    return;
  } catch (error) {
    if (!isBackendUnavailable(error)) console.warn(error);
    showServerImportError("Серверный предпросмотр импорта цен недоступен. Применение отключено до успешной проверки.");
    return;
  }
}
function findCatalogItemByName(items, name) {
  const prepared = String(name || "").trim().toLocaleLowerCase("ru-RU");
  return items.find((item) => String(item.name || item.label || "").trim().toLocaleLowerCase("ru-RU") === prepared);
}
function looksLikeIconName(value) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(String(value || "").trim());
}
function parseCatalogLines(text, currentItems, fallbackItems, options = {}) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = rows.map((line, index) => {
    const [nameRaw, secondRaw, thirdRaw] = line.split("|").map((part) => part.trim());
    const previous = findCatalogItemByName(currentItems, nameRaw) || currentItems[index] || {};
    if (options.description) {
      const secondIsLegacyIcon = options.optionalDescription && !thirdRaw && looksLikeIconName(secondRaw);
      return {
        name: nameRaw || previous.name || "",
        description: secondIsLegacyIcon ? previous.description || "" : secondRaw || previous.description || "",
        icon: secondIsLegacyIcon ? secondRaw || previous.icon || "tag" : thirdRaw || previous.icon || "tag",
        image: previous.image || "",
      };
    }
    return {
      name: nameRaw || previous.name || "",
      icon: secondRaw || previous.icon || "tag",
      image: previous.image || "",
    };
  });
  return normalizeCatalogList(parsed, fallbackItems, options);
}
function parseActualLines(text, currentItems) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = rows.map((line, index) => {
    const [labelRaw, typeRaw] = line.split("|").map((part) => part.trim());
    const previous = findCatalogItemByName(currentItems, labelRaw) || currentItems[index] || {};
    const preparedType = String(typeRaw || previous.type || "holiday").toLocaleLowerCase("ru-RU");
    return {
      label: labelRaw || previous.label || "",
      type: preparedType.includes("collection") || preparedType.includes("подбор") ? "collection" : "holiday",
      image: previous.image || "",
    };
  });
  return normalizeActualSlides(parsed);
}
function applyAdminIndexedImages(form, kind, items, currentItems) {
  return items.map((item, index) => {
    const input = form.querySelector(`[data-content-image="${kind}"][data-content-index="${index}"]`);
    const previous = findCatalogItemByName(currentItems, item.name || item.label) || currentItems[index] || {};
    return {
      ...item,
      image: input?.dataset.imageValue || item.image || previous.image || "",
    };
  });
}
function contentFromAdminForm(form) {
  const current = getSiteContent();
  const data = Object.fromEntries(new FormData(form).entries());
  const brandLogoInput = form.querySelector('[data-content-image="brandLogo"][data-content-index="0"]');
  const heroImages = [0, 1, 2].map((index) => {
    const input = form.querySelector(`[data-content-image="heroImages"][data-content-index="${index}"]`);
    return input?.dataset.imageValue || current.heroImages[index] || defaultSiteContent.heroImages[index];
  });
  const actualTextChanged = data.actualSlidesText && data.actualSlidesText !== serializeActualList(current.actualSlides);
  const slideRows = data.actualSlidesText ? parseActualLines(data.actualSlidesText, current.actualSlides) : current.actualSlides;
  const actualSlides = slideRows.map((slide, index) => {
    const input = form.querySelector(`[data-content-image="actualSlides"][data-content-index="${index}"]`);
    const previous = findCatalogItemByName(current.actualSlides, slide.label) || current.actualSlides[index] || {};
    return {
      label: actualTextChanged ? slide.label : data[`actualLabel${index}`] || slide.label || previous.label,
      type: actualTextChanged ? slide.type : data[`actualType${index}`] || slide.type || previous.type,
      image: input?.dataset.imageValue || slide.image || previous.image || defaultSiteContent.actualSlides[index % defaultSiteContent.actualSlides.length].image,
    };
  });
  const catalogCategories = parseCatalogLines(data.catalogCategoriesText, current.catalogCategories, defaultSiteContent.catalogCategories, { description: true });
  const catalogCollections = applyAdminIndexedImages(
    form,
    "catalogCollections",
    parseCatalogLines(data.catalogCollectionsText, current.catalogCollections, defaultSiteContent.catalogCollections, { description: true, optionalDescription: true }),
    current.catalogCollections
  );
  const catalogHolidays = applyAdminIndexedImages(
    form,
    "catalogHolidays",
    parseCatalogLines(data.catalogHolidaysText, current.catalogHolidays, defaultSiteContent.catalogHolidays, { description: true, optionalDescription: true }),
    current.catalogHolidays
  );
  const textContent = Object.fromEntries(
    siteTextFields.map((field) => [field.key, data[field.key] || defaultSiteContent[field.key] || ""])
  );
  return normalizeSiteContent({
    ...textContent,
    brandName: data.brandName || defaultSiteContent.brandName,
    brandLogo: brandLogoInput?.dataset.imageValue || current.brandLogo || defaultSiteContent.brandLogo,
    heroImages,
    catalogCategories,
    catalogCollections,
    catalogHolidays,
    actualSlides,
  });
}
function finishModalClose() {
  document.body.classList.remove("modal-open");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}
function closeModal() {
  const modals = [...document.querySelectorAll(".modal")];
  if (!modals.length) return;
  if (modals.some((modal) => modal.id === "productModal")) removeJsonLd("sobag-product-jsonld");
  if (prefersReducedMotion()) {
    modals.forEach((modal) => modal.remove());
    finishModalClose();
    return;
  }
  modals.forEach((modal) => {
    modal.classList.remove("is-visible");
    modal.classList.add("is-closing");
  });
  window.setTimeout(() => {
    modals.forEach((modal) => modal.remove());
    finishModalClose();
  }, 220);
}
async function submitOrder(form) {
  clearFormErrors(form);
  if (state.cart.size === 0) {
    showToast("Сначала добавьте товары в корзину.");
    return;
  }
  const users = getUsers();
  const user = users[state.currentUser];
  const totals = getCartTotals();
  if (totals.total < MIN_CART_TOTAL) {
    showToast(`Минимальная сумма корзины ${formatMoney(MIN_CART_TOTAL)}. Осталось ${formatMoney(MIN_CART_TOTAL - totals.total)}.`);
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const customerPhone = formatPhoneNumber(data.phone || user?.phone || "");
  if (!customerPhone) {
    setFieldError(form, "phone", "Укажите телефон для связи.");
    return;
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) {
    setFieldError(form, "email", "Проверьте формат email.");
    return;
  }
  const inn = String(data.inn || "").replace(/\D/g, "");
  if (inn && ![10, 12].includes(inn.length)) {
    setFieldError(form, "inn", "ИНН должен содержать 10 или 12 цифр.");
    return;
  }
  const kpp = String(data.kpp || "").replace(/\D/g, "");
  if (kpp && kpp.length !== 9) {
    setFieldError(form, "kpp", "КПП должен содержать 9 цифр.");
    return;
  }
  const layoutFile = form.elements.layoutFile?.files?.[0] || null;
  const customer = {
    name: user?.name || data.company || "",
    company: data.company || "",
    inn,
    kpp,
    phone: customerPhone,
    email: data.email || user?.email || "",
    city: data.city || "",
    address: data.address || user?.address || "",
    legalAddress: data.legalAddress || user?.legalAddress || "",
    delivery: data.delivery || user?.delivery || "",
    packaging: data.packaging || user?.packaging || "",
    layoutFileName: layoutFile ? layoutFile.name : String(data.layoutReference || user?.layoutFiles?.[0] || "").trim(),
    comment: data.comment || user?.orderComment || "",
  };
  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: {
        customer,
        items: [...state.cart.values()],
        total: totals.total,
        source: "catalog",
      },
    });
    if (!result.order) {
      showToast("Сервер не вернул номер заказа. Попробуйте еще раз.");
      return;
    }
    mirrorServerOrder(result.order, state.currentUser);
    form.reset();
    state.cart.clear();
    renderCart();
    showToast("Заказ отправлен и сохранен на сервере.");
    return;
  } catch (error) {
    showToast(serverSaveErrorMessage(error, "Не удалось сохранить заказ на сервере. Попробуйте еще раз."));
    return;
  }
}
function boot() {
  seedUsers();
  cleanPrototypeStorage();
  initTheme();
  initCatalogRoute();
  if (categoryTiles && !hasActiveCatalogState()) state.catalogHomeSummary.status = "loading";
  loadCart();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderCart();
  renderAccountButton();
  renderSiteContent();
  syncFaqJsonLd();
  renderManagementPages();
  renderSavedQuotesPage();
  renderAdminProductsPage();
  renderAdminPricesPage();
  renderAdminImportPage();
  updateCustomCalculator();
  initActualSlider();
  loadServerSiteContent();
  refreshCatalogHomeSummary();
  loadPriceListPreview();
  loadPublishedProducts();
  loadImportBatches();
  initFormEnhancements();
  loadBackendAccountData().then(async (changed) => {
    if (!changed) {
      renderManagementPages();
      renderAdminProductsPage();
      renderAdminPricesPage();
      renderAdminImportPage();
      return;
    }
    loadCart();
    loadFavorites();
    await loadServerPersonalState();
    renderCart();
    renderProducts();
    renderAccountButton();
    renderManagementPages();
    renderSavedQuotesPage();
    renderAdminProductsPage();
    renderAdminPricesPage();
    renderAdminImportPage();
    loadImportBatches();
  });
  window.addEventListener("popstate", () => {
    if (!catalogListing) return;
    applyCatalogUrl(new URL(window.location.href), { sync: false });
  });
  document.addEventListener("error", handleProductImageError, true);
  document.addEventListener("click", async (event) => {
    if (event.target.dataset.closeModal !== undefined) {
      closeModal();
      return;
    }
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.reviewStar) {
      setReviewFormRating(button.closest("[data-review-form]"), button.dataset.reviewStar);
      return;
    }
    if (button.dataset.actualPrev !== undefined) {
      nextActualSlide(-1);
      startActualSlider();
      return;
    }
    if (button.dataset.actualNext !== undefined) {
      nextActualSlide(1);
      startActualSlider();
      return;
    }
    if (button.dataset.themeToggle !== undefined) {
      toggleTheme();
      return;
    }
    if (button.dataset.nav) {
      navigateWithinSite(button.dataset.nav);
      return;
    }
    if (button.dataset.openCart !== undefined) {
      navigateWithinSite("cart.html");
      return;
    }
    if (button.dataset.scroll) {
      const target = document.querySelector(button.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const routes = {
          "#catalog": "catalog.html",
          "#custom": "custom.html",
          "#briefForm": "custom.html#briefForm",
          "#marketplaces": "marketplaces.html",
          "#wholesale": "business.html",
        };
        if (routes[button.dataset.scroll]) navigateWithinSite(routes[button.dataset.scroll]);
      }
      return;
    }
    if (button.dataset.openCategory) {
      closeModal();
      openCatalogCategory(button.dataset.openCategory);
      return;
    }
    if (button.dataset.openCollection) {
      closeModal();
      openCatalogCollection(button.dataset.openCollection);
      return;
    }
    if (button.dataset.openHoliday) {
      closeModal();
      openCatalogHoliday(button.dataset.openHoliday);
      return;
    }
    if (button.dataset.toggleFilters !== undefined) {
      document.body.classList.toggle("filters-open");
      updateFilterToggle();
      return;
    }
    if (button.dataset.backCatalog !== undefined) {
      backToCatalogHome();
      return;
    }
    if (button.dataset.clearFilter) {
      clearCatalogFilter(button.dataset.clearFilter, button.dataset.clearValue || "");
      return;
    }
    if (button.dataset.clearAllFilters !== undefined) {
      clearAllCatalogFilters();
      return;
    }
    if (button.dataset.searchQuery) {
      setSearchQuery(button.dataset.searchQuery);
      return;
    }
    if (button.dataset.showMoreProducts !== undefined) {
      if (await loadMoreServerCatalogProducts()) return;
      state.visibleLimit += CATALOG_PAGE_SIZE;
      renderProducts();
      return;
    }
    if (button.dataset.toggleCollections !== undefined) {
      state.showAllCollections = !state.showAllCollections;
      renderCatalogHome();
      return;
    }
    if (button.dataset.copySku) {
      copyText(button.dataset.copySku);
      return;
    }
    if (button.id === "accountButton" || button.dataset.openAccount !== undefined) openAccount();
    if (button.dataset.closeModal !== undefined) closeModal();
    if (button.dataset.authModeSwitch) {
      state.authMode = button.dataset.authModeSwitch === "register" ? "register" : "login";
      rerenderAccountModal();
      return;
    }
    if (button.dataset.accountTab) {
      switchAccountTab(button.dataset.accountTab);
      return;
    }
    if (button.dataset.openProduct) {
      const currentModal = activeModal();
      if (currentModal) currentModal.remove();
      document.body.classList.remove("modal-open");
      openProduct(button.dataset.openProduct);
      return;
    }
    if (button.dataset.detailImage) {
      const image = document.querySelector("#detailMainImage");
      if (image) {
        image.src = button.dataset.detailImage;
        applyProductImageVariantSrcset(image, products.find((product) => product.id === state.activeProductId), button.dataset.detailImage);
      }
      document.querySelectorAll(".product-gallery__thumb").forEach((node) => node.classList.toggle("is-active", node === button));
    }
    if (button.dataset.variantKey) {
      state.activeVariant[button.dataset.variantKey] = button.dataset.variantValue;
      refreshProductModal();
    }
    if (button.dataset.detailQtyStep) {
      const input = document.querySelector("#detailQty");
      if (input) {
        input.value = Math.max(0, Number(input.value || 0) + Number(button.dataset.detailQtyStep));
        refreshProductModal();
      }
      return;
    }
    if (button.dataset.addVariant) addVariantToCart(button.dataset.addVariant);
    if (button.dataset.repeatOrder) {
      repeatOrder(button.dataset.repeatOrder);
      closeModal();
      navigateWithinSite("cart.html");
      return;
    }
    if (button.dataset.saveCurrentCart !== undefined) {
      const title = window.prompt("Название черновика корзины", `Корзина от ${new Date().toLocaleDateString("ru-RU")}`) || "";
      saveCurrentCartDraft(title.trim());
      refreshSavedCartViews();
      return;
    }
    if (button.dataset.restoreSavedCart) {
      restoreSavedCart(button.dataset.restoreSavedCart);
      return;
    }
    if (button.dataset.renameSavedCart) {
      renameSavedCart(button.dataset.renameSavedCart);
      return;
    }
    if (button.dataset.downloadSavedCart) {
      await downloadSavedCartQuote(button.dataset.downloadSavedCart);
      return;
    }
    if (button.dataset.printSavedCart) {
      printSavedCartQuote(button.dataset.printSavedCart);
      return;
    }
    if (button.dataset.sendSavedCart) {
      await sendSavedCartToManager(button.dataset.sendSavedCart);
      return;
    }
    if (button.dataset.deleteSavedCart) {
      deleteSavedCart(button.dataset.deleteSavedCart);
      return;
    }
    if (button.dataset.favorite) {
      if (state.favorites.has(button.dataset.favorite)) state.favorites.delete(button.dataset.favorite);
      else state.favorites.add(button.dataset.favorite);
      saveFavorites();
      if (isFavoritesPage && !state.favorites.has(button.dataset.favorite)) {
        renderProducts();
      } else {
        updateFavoriteButtons(button.dataset.favorite);
      }
      renderCart();
    }
    if (button.dataset.remove) {
      state.cart.delete(button.dataset.remove);
      renderCart();
      showToast("Позиция удалена из корзины.");
    }
    if (button.id === "clearCart") {
      state.cart.clear();
      renderCart();
      showToast("Корзина очищена.");
    }
    if (button.dataset.logout !== undefined) {
      try {
        await apiRequest("/api/auth/logout", { method: "POST" });
      } catch (error) {
        if (!isBackendUnavailable(error)) console.warn(error);
      }
      localStorage.removeItem(STORAGE.user);
      state.currentUser = "";
      loadCart();
      loadFavorites();
      closeModal();
      renderCart();
      renderProducts();
      renderAccountButton();
      renderManagementPages();
    }
    if (button.dataset.orderStatus) {
      const status = button.dataset.statusValue || "new";
      try {
        const result = await apiRequest("/api/admin/orders", { method: "PATCH", body: { id: button.dataset.orderStatus, status } });
        if (result.order) mirrorServerOrder(result.order, result.order.userEmail || result.order.customer?.email || "");
        await loadBackendAccountData();
      } catch (error) {
        showToast(serverSaveErrorMessage(error, "Не удалось сохранить статус заказа на сервере."));
        return;
      }
      if (isAdminOrdersPage || isAdminOrderPage || isAdminCustomerPage) {
        renderManagementPages();
        showToast("Статус заказа обновлен.");
        return;
      }
      closeModal();
      openAccount();
      showToast("Статус заказа обновлен.");
      return;
    }
    if (button.dataset.setRole) {
      let updated = false;
      try {
        const result = await apiRequest("/api/admin/users", {
          method: "PATCH",
          body: { email: button.dataset.setRole, role: button.dataset.roleValue || "buyer" },
        });
        if (result.user) {
          const users = getUsers();
          users[result.user.email] = { ...(users[result.user.email] || {}), ...result.user, password: users[result.user.email]?.password || "__server__" };
          saveUsers(users);
          updated = true;
        }
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          showToast(error.message || "Не удалось обновить роль.");
          return;
        }
        updated = setUserRole(button.dataset.setRole, button.dataset.roleValue || "buyer");
      }
      closeModal();
      openAccount();
      showToast(updated ? "Роль пользователя обновлена." : "Роль пользователя не изменена.");
      return;
    }
    if (button.dataset.removeManager) {
      await removeManagerEmployee(button.dataset.removeManager);
      return;
    }
    if (button.dataset.openAdmin !== undefined) openAdmin();
    if (button.dataset.refreshReviews !== undefined) {
      await loadAdminReviews();
      return;
    }
    if (button.dataset.reviewStatus) {
      await moderateReview(button.dataset.reviewStatus, { status: button.dataset.reviewStatusValue || "pending" });
      return;
    }
    if (button.dataset.deleteReview) {
      if (window.confirm("Удалить отзыв без восстановления?")) {
        await moderateReview(button.dataset.deleteReview, { delete: true });
      }
      return;
    }
    if (button.dataset.saveGenerated !== undefined) saveGeneratedProducts();
    if (button.dataset.refreshImportBatches !== undefined) {
      await loadImportBatches();
      return;
    }
    if (button.dataset.uploadImportPhotos !== undefined) {
      await uploadImportPhotos();
      return;
    }
    if (button.dataset.clearImportPhotoReport !== undefined) {
      state.importPhotoFiles = [];
      state.importPhotoReport = [];
      renderAdminImportPage();
      return;
    }
    if (button.dataset.exportImportPhotoReport !== undefined) {
      downloadCsv("sobag-import-photo-report.csv", [
        ["Статус", "Основной артикул", "Товар", "Файл", "Причина", "URL", "Storage key"],
        ...state.importPhotoReport.map((row) => [
          importPhotoStatusLabel(row.status),
          row.baseSku || "",
          row.productName || "",
          row.fileName || "",
          importPhotoReasonLabel(row.reason),
          row.url || "",
          row.storageKey || "",
        ]),
      ]);
      return;
    }
    if (button.dataset.applyImportBatch) {
      await applyImportBatch(button.dataset.applyImportBatch);
      return;
    }
    if (button.dataset.rejectImportBatch) {
      await rejectImportBatch(button.dataset.rejectImportBatch);
      return;
    }
    if (button.dataset.rollbackImportBatch) {
      if (window.confirm("Откатить последнюю примененную партию и вернуть snapshot каталога?")) {
        await rollbackImportBatch(button.dataset.rollbackImportBatch);
      }
      return;
    }
    if (button.dataset.exportImportBatch) {
      const batch = importBatchById(button.dataset.exportImportBatch);
      if (batch) {
        downloadCsv(`sobag-import-batch-${batch.id}.csv`, [
          ["Партия", "Статус партии", "Строка", "Основной артикул", "Название", "Статус строки", "Действие", "Причина", "Вариантов", "Предупреждения"],
          ...(batch.rows || []).map((row) => [
            batch.id,
            importBatchStatusLabel(batch.status),
            row.row || "",
            row.baseSku || "",
            row.name || "",
            row.status || "",
            row.action || "",
            importBatchReasonLabel(row.reason),
            row.variantCount || "",
            row.warnings || "",
          ]),
        ]);
      }
      return;
    }
    if (button.dataset.downloadTemplate !== undefined) downloadTemplate();
    if (button.dataset.downloadXlsxTemplate !== undefined) downloadXlsxTemplate();
    if (button.dataset.exportProducts !== undefined) downloadProductsCsv(products, "sobag-products-all.csv");
    if (button.dataset.exportFilteredProducts !== undefined) downloadProductsCsv(getFilteredProducts(), "sobag-products-filtered.csv");
    if (button.dataset.exportVariantPrices !== undefined) downloadVariantPricesCsv(products, "sobag-variant-prices-all.csv");
    if (button.dataset.exportFilteredVariantPrices !== undefined) downloadVariantPricesCsv(getFilteredProducts(), "sobag-variant-prices-filtered.csv");
    if (button.dataset.refreshAdminOrders !== undefined) {
      await refreshAdminOrdersFromBackend({ notify: true, rerender: true });
      return;
    }
    if (button.dataset.exportOrders !== undefined) downloadOrdersCsv();
    if (button.dataset.exportOrder) downloadOrderCsv(button.dataset.exportOrder);
    if (button.dataset.exportOrderXlsx) await downloadOrderXlsx(button.dataset.exportOrderXlsx);
    if (button.dataset.printOrder) printOrder(button.dataset.printOrder);
    if (button.dataset.adminSyncCatalog !== undefined) {
      syncCatalogNow();
      return;
    }
    if (button.dataset.adminExportProducts !== undefined) downloadProductsCsv(selectedAdminProducts(), "sobag-admin-products-selected.csv");
    if (button.dataset.adminExportVariants !== undefined) downloadVariantPricesCsv(selectedAdminProducts(), "sobag-admin-variant-prices-selected.csv");
    if (button.dataset.adminExportPriceRows !== undefined) downloadAdminPriceRowsCsv(selectedAdminPriceRows(), "sobag-admin-prices-selected.csv");
    if (button.dataset.adminExportPriceXlsx !== undefined) await downloadAdminPriceRowsXlsx(selectedAdminPriceRows(), "sobag-admin-prices-selected.xlsx");
    if (button.dataset.adminExportPriceProducts !== undefined) {
      const productIds = new Set(selectedAdminPriceRows().map(({ product }) => product.id));
      downloadVariantPricesCsv(products.filter((product) => productIds.has(product.id)), "sobag-admin-product-variant-prices.csv");
    }
    if (button.dataset.adminPreviewManualPrices !== undefined) {
      previewManualPriceChanges();
      return;
    }
    if (button.dataset.adminApplyPricePreview !== undefined) {
      await applyPricePreview();
      return;
    }
    if (button.dataset.adminToggleProduct) {
      const product = products.find((item) => item.id === button.dataset.adminToggleProduct);
      if (product) {
        product.status = isProductPublished(product) ? "hidden" : "published";
        product.hidden = product.status !== "published";
        Object.assign(product, normalizeProduct(product));
        saveProducts();
        renderCatalogHome();
        renderFilters();
        renderProducts();
        renderAdminProductsPage();
        renderAdminPricesPage();
        showToast(isProductPublished(product) ? "Товар опубликован в каталоге." : "Товар скрыт из каталога.");
      }
      return;
    }
    if (button.dataset.resetContent !== undefined) {
      localStorage.removeItem(STORAGE.content);
      renderSiteContent();
      closeModal();
      openAdmin();
      showToast("Контент сброшен к значениям по умолчанию.");
      return;
    }
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.dataset.priceDownload !== undefined) {
      link.setAttribute("aria-busy", "true");
      showToast("Прайс CSV скачивается. Если файл не открылся, проверьте загрузки браузера.");
      window.setTimeout(() => link.removeAttribute("aria-busy"), 1800);
    }
    if (link.target && link.target !== "_self") return;
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.endsWith(".pdf")) return;
    if (href === "#") {
      event.preventDefault();
      return;
    }
    const targetUrl = new URL(href, window.location.href);
    if (targetUrl.origin !== window.location.origin) return;
    if (routeKey(targetUrl.pathname) !== routeKey(window.location.pathname)) return;
    event.preventDefault();
    navigateWithinSite(targetUrl.href);
  });
  document.addEventListener("keydown", (event) => {
    if (event.target?.id === "searchInput" && event.key === "Enter") {
      event.preventDefault();
      const query = event.target.value.trim();
      if (query) navigateWithinSite(`search?q=${encodeURIComponent(query)}`);
      return;
    }
    const modal = activeModal();
    if (modal) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      trapModalFocus(event);
      return;
    }
    if (event.target.closest?.(".hero__actual")) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nextActualSlide(-1);
        startActualSlider();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextActualSlide(1);
        startActualSlider();
      }
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "searchInput") {
      state.search = event.target.value;
      resetVisibleProducts();
      renderSearchSuggestions();
      if (!catalogListing && state.search.trim().length >= 2) return;
      syncCatalogRoute();
      renderCatalogShell();
      renderProducts();
    }
    if (event.target.id === "mapAddressInput") {
      event.target.dataset.userEdited = "true";
    }
    if (event.target.dataset.filterSearch) {
      const key = event.target.dataset.filterSearch;
      state.filterSearch[event.target.dataset.filterSearch] = event.target.value;
      renderFilters();
      const nextInput = document.querySelector(`[data-filter-search="${CSS.escape(key)}"]`);
      nextInput?.focus();
      nextInput?.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
    if (event.target.id === "detailQty") refreshProductModal();
    if (event.target.closest?.("#customCalculator")) updateCustomCalculator();
  });
  document.addEventListener("change", (event) => {
    if (event.target.dataset.filter) {
      const bucket = state.filters[event.target.dataset.filter];
      if (event.target.checked) bucket.add(event.target.value);
      else bucket.delete(event.target.value);
      resetVisibleProducts();
      renderFilters();
      renderProducts();
    }
    if (event.target.id === "sortSelect") {
      state.sort = event.target.value;
      resetVisibleProducts();
      renderProducts();
    }
    if (event.target.id === "importUpdateExisting") {
      state.importUpdateExisting = event.target.checked;
      renderAdminImportPage();
      return;
    }
    if (event.target.id === "excelInput" && event.target.files[0]) importExcel(event.target.files[0]);
    if (event.target.id === "photoUploadInput" || event.target.id === "photoFolderInput") {
      buildImportPhotoReport(event.target.files || []);
      renderAdminImportPage();
      showToast("Отчет по фото подготовлен.");
    }
    if (event.target.dataset.contentImage) readContentFile(event.target);
    if (event.target.dataset.adminPriceImport !== undefined && event.target.files[0]) {
      importPriceFile(event.target.files[0]).finally(() => {
        event.target.value = "";
      });
    }
    if (event.target.closest?.("#customCalculator")) updateCustomCalculator();
  });
  document.addEventListener("submit", async (event) => {
    if (event.target.id === "requestForm") {
      event.preventDefault();
      await submitOrder(event.target);
    }
    if (event.target.id === "briefForm") {
      event.preventDefault();
      await submitCustomBrief(event.target);
    }
    if (event.target.id === "mapAddressForm") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      updateYandexMap(data.mapAddress);
      showToast("Карта обновлена по введенному адресу.");
    }
    if (event.target.dataset.profileForm !== undefined) {
      event.preventDefault();
      clearFormErrors(event.target);
      await saveProfileForm(event.target);
      return;
    }
    if (event.target.dataset.employeeForm !== undefined) {
      event.preventDefault();
      await addManagerEmployee(event.target);
      return;
    }
    if (event.target.dataset.reviewForm) {
      event.preventDefault();
      await submitProductReview(event.target);
      return;
    }
    if (event.target.dataset.savedCartCommentForm) {
      event.preventDefault();
      saveSavedCartComments(event.target);
      return;
    }
    if (event.target.id === "authForm") {
      event.preventDefault();
      clearFormErrors(event.target);
      const data = Object.fromEntries(new FormData(event.target).entries());
      const mode = event.target.dataset.authMode === "register" ? "register" : "login";
      const users = getUsers();
      const login = String(data.login || "").trim();
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");
      const name = String(data.name || "").trim();
      const phone = formatPhoneNumber(data.phone);
      const existingEmailKey = Object.keys(users).find((key) => key.toLowerCase() === email);
      if (!password) {
        setFieldError(event.target, "password", "Укажите пароль.");
        return;
      }
      if (mode === "register") {
        if (!email) {
          setFieldError(event.target, "email", "Укажите email.");
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email !== "admin@sobag") {
          setFieldError(event.target, "email", "Проверьте формат email.");
          return;
        }
        if (password.length < 6) {
          setFieldError(event.target, "password", "Пароль должен быть не короче 6 символов.");
          showToast("Пароль должен быть не короче 6 символов.");
          return;
        }
        if (!name || !phone) {
          if (!name) setFieldError(event.target, "name", "Для регистрации укажите имя или компанию.");
          else setFieldError(event.target, "phone", "Для регистрации укажите телефон.");
          showToast("Для регистрации укажите имя и телефон.");
          return;
        }
        if (data.personalDataConsent !== "on") {
          setFieldError(event.target, "personalDataConsent", "Подтвердите согласие на обработку персональных данных.");
          showToast("Для регистрации подтвердите согласие на обработку персональных данных.");
          return;
        }
        if (existingEmailKey && users[existingEmailKey]?.password !== "__server__") {
          setFieldError(event.target, "email", "Этот email уже зарегистрирован в системе.");
          showToast("Этот email уже зарегистрирован в системе.");
          return;
        }
        try {
          const result = await apiRequest("/api/auth/register", {
            method: "POST",
            body: {
              email,
              password,
              name,
              phone,
              personalDataConsent: data.personalDataConsent === "on",
            },
          });
          saveServerUserProfile(result.user);
          await loadBackendAccountData();
          loadCart();
          await loadServerPersonalState();
          closeModal();
          renderCart();
          renderProducts();
          renderAccountButton();
          renderManagementPages();
          showToast("Вы зарегистрированы. Аккаунт сохранен на сервере.");
          return;
        } catch (error) {
          if (!isBackendUnavailable(error)) {
            setFieldError(event.target, error.code === "email_exists" ? "email" : "password", error.message);
            showToast(error.message);
            return;
          }
          if (!isLocalAuthFallbackAllowed()) {
            failClosedAuthUnavailable(event.target);
            return;
          }
        }
        users[email] = {
          ...(users[email] || {}),
          email,
          password,
          name: name || email,
          phone,
          role: users[email]?.role || "buyer",
          orders: [],
          personalDataConsent: true,
          consentAt: new Date().toISOString(),
          consentTextVersion: "personal-data-consent-2026-05-29",
        };
        saveUsers(users);
        state.currentUser = email;
        localStorage.setItem(STORAGE.user, email);
      } else {
        if (!login) {
          setFieldError(event.target, "login", "Укажите почту или телефон.");
          return;
        }
        try {
          const result = await apiRequest("/api/auth/login", { method: "POST", body: { login, password } });
          saveServerUserProfile(result.user);
          await loadBackendAccountData();
          loadCart();
          await loadServerPersonalState();
          closeModal();
          renderCart();
          renderProducts();
          renderAccountButton();
          renderManagementPages();
          showToast("Вы вошли. Серверная сессия активна.");
          return;
        } catch (error) {
          if (!isBackendUnavailable(error)) {
            setFieldError(event.target, "password", error.message);
            showToast(error.message);
            return;
          }
          if (!isLocalAuthFallbackAllowed()) {
            failClosedAuthUnavailable(event.target);
            return;
          }
        }
        const userKey = findUserKeyByLogin(users, login);
        if (!userKey || !users[userKey] || users[userKey].password !== password) {
          setFieldError(event.target, "password", "Проверьте логин и пароль.");
          showToast("Проверьте логин и пароль.");
          return;
        }
        state.currentUser = userKey;
        localStorage.setItem(STORAGE.user, userKey);
      }
      loadCart();
      loadFavorites();
      await loadServerPersonalState();
      closeModal();
      renderCart();
      renderProducts();
      renderAccountButton();
      renderManagementPages();
      showToast("Вы вошли. Корзина и заказы сохраняются за аккаунтом.");
    }
    if (event.target.dataset.adminProductForm) {
      event.preventDefault();
      const product = products.find((item) => item.id === event.target.dataset.adminProductForm);
      if (!product) {
        showToast("Товар не найден.");
        return;
      }
      const data = Object.fromEntries(new FormData(event.target).entries());
      product.name = String(data.name || product.name).trim() || product.name;
      product.basePrice = Math.max(0, Number(data.basePrice || product.basePrice || 0));
      product.description = String(data.description || "").trim();
      product.detailDescription = String(data.detailDescription || "").trim();
      product.status = productStatusFromValue(data.status) || normalizeProductStatus(product);
      product.hidden = product.status !== "published";
      const normalized = normalizeProduct(product);
      Object.assign(product, normalized);
      saveProducts();
      renderCatalogHome();
      renderFilters();
      renderProducts();
      renderAdminProductsPage();
      renderAdminPricesPage();
      showToast("Товар сохранен. Варианты и цены пересчитаны.");
      return;
    }
    if (event.target.dataset.adminPriceBulkForm !== undefined) {
      event.preventDefault();
      previewBulkPriceChanges(event.target);
      return;
    }
    if (event.target.id === "adminGenerator") {
      event.preventDefault();
      renderAdminPreview([productFromForm(event.target)]);
    }
    if (event.target.id === "adminContentForm") {
      event.preventDefault();
      const statusNode = event.target.querySelector("[data-content-save-status]");
      if (statusNode) statusNode.textContent = "Сохраняю изменения...";
      const savedContent = saveSiteContent(contentFromAdminForm(event.target), { sync: false });
      renderSiteContent();
      const synced = await syncSiteContentToBackend(savedContent);
      if (statusNode) {
        statusNode.textContent = synced
          ? "Сохранено на сервере. Изменения будут видны на других устройствах."
          : "Сохранено локально. Серверное сохранение не выполнено.";
      }
      showToast(synced ? "Контент сайта сохранен на сервере." : "Контент сохранен локально, сервер недоступен.");
    }
    if (event.target.dataset.orderManagerForm) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const managerEmail = String(formData.get("managerEmail") || "");
      const manager = managerEmail ? getUsers()[managerEmail] : null;
      const patch = {
        managerEmail,
        managerName: manager ? manager.name || manager.email : "",
        managerNote: String(formData.get("managerNote") || "").trim(),
      };
      try {
        const result = await apiRequest("/api/admin/orders", { method: "PATCH", body: { id: event.target.dataset.orderManagerForm, ...patch } });
        if (result.order) mirrorServerOrder(result.order, result.order.userEmail || "");
        await loadBackendAccountData();
      } catch (error) {
        showToast(serverSaveErrorMessage(error, "Не удалось сохранить данные заказа на сервере."));
        return;
      }
      if (isAdminOrdersPage || isAdminOrderPage || isAdminCustomerPage) {
        renderManagementPages();
        showToast("Данные заказа сохранены.");
        return;
      }
      closeModal();
      openAccount();
      showToast("Данные заказа сохранены.");
      return;
    }
    if (event.target.dataset.orderManagerMessageForm) {
      event.preventDefault();
      await submitManagerOrderMessage(event.target);
      return;
    }
    if (event.target.dataset.orderCustomerMessageForm) {
      event.preventDefault();
      await submitCustomerOrderMessage(event.target);
      return;
    }
  });
  refreshLucideIcons();
}
boot();
