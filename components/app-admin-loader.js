const ADMIN_MODULE_SRC = "components/app-admin.js?v=20260626-admin-lazy";
let adminModuleLoadPromise = null;

function loadStoredPriceImportHistory() {
  try {
    const history = JSON.parse(localStorage.getItem("sobag.priceImportHistory.v1") || "[]");
    return Array.isArray(history) ? history.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveStoredPriceImportHistory() {
  localStorage.setItem("sobag.priceImportHistory.v1", JSON.stringify(state.priceImportHistory.slice(0, 8)));
}

function loadStoredImportBatches() {
  try {
    const batches = JSON.parse(localStorage.getItem(STORAGE.importBatches) || "[]");
    return Array.isArray(batches) ? batches : [];
  } catch {
    return [];
  }
}

function saveStoredImportBatches() {
  localStorage.setItem(STORAGE.importBatches, JSON.stringify(state.importBatches.slice(0, 30)));
}

function isAdminModuleLoaded() {
  const script = document.querySelector('script[src*="components/app-admin.js"]');
  return Boolean(script?.dataset.adminModuleLoaded);
}

function ensureAdminModule() {
  if (isAdminModuleLoaded()) return Promise.resolve(true);
  if (!adminModuleLoadPromise) {
    adminModuleLoadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = ADMIN_MODULE_SRC;
      script.defer = true;
      script.onload = () => {
        script.dataset.adminModuleLoaded = "true";
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
  return adminModuleLoadPromise;
}

const adminLoaderStubs = {};

async function callLoadedAdminFunction(name, args = []) {
  const loaded = await ensureAdminModule();
  const target = window[name];
  if (!loaded || typeof target !== "function" || target === adminLoaderStubs[name]) return undefined;
  return target(...args);
}

function renderAdminProductsPage() {}
function renderAdminPricesPage() {}
function renderAdminImportPage() {}
function renderManagementPages() {}
function selectedAdminProducts() {
  return [];
}
function selectedAdminPriceRows() {
  return [];
}
async function createImportBatch(...args) {
  return callLoadedAdminFunction("createImportBatch", args);
}
async function loadAdminReviews(...args) {
  return callLoadedAdminFunction("loadAdminReviews", args);
}
async function loadImportBatches(...args) {
  if (!document.querySelector("#adminImportPage")) return undefined;
  return callLoadedAdminFunction("loadImportBatches", args);
}
async function openAdmin(...args) {
  return callLoadedAdminFunction("openAdmin", args);
}
async function openAccount(...args) {
  return callLoadedAdminFunction("openAccount", args);
}
async function renderSavedQuotesPage(...args) {
  if (!document.querySelector("#savedQuotesPage")) return undefined;
  return callLoadedAdminFunction("renderSavedQuotesPage", args);
}
async function refreshSavedCartViews(...args) {
  return callLoadedAdminFunction("refreshSavedCartViews", args);
}
function renderAdminPreview(...args) {
  return callLoadedAdminFunction("renderAdminPreview", args);
}

Object.assign(adminLoaderStubs, {
  createImportBatch,
  loadAdminReviews,
  loadImportBatches,
  openAdmin,
  openAccount,
  refreshSavedCartViews,
  renderSavedQuotesPage,
  renderAdminPreview,
});
