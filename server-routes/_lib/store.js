const { Redis } = require("@upstash/redis");
const fs = require("node:fs/promises");
const path = require("node:path");
const { buildCatalogPim, summarizeImportBatches } = require("./pim");

const STORE_KEY = process.env.SOBAG_STORE_KEY || "sobag:store:v1";
const CATALOG_KEY = process.env.SOBAG_CATALOG_KEY || "sobag:catalog:v1";
const CONTENT_KEY = process.env.SOBAG_CONTENT_KEY || "sobag:content:v1";
const IMPORT_BATCHES_KEY = process.env.SOBAG_IMPORT_BATCHES_KEY || "sobag:import-batches:v1";
const FILE_STORE_DEFAULT_DIR = ".sobag-store";

function storeProvider() {
  return String(process.env.SOBAG_STORE_PROVIDER || "redis").trim().toLowerCase();
}

function normalizedStoreProvider() {
  return ["file", "filesystem", "fs"].includes(storeProvider()) ? "file" : "redis";
}

function storeStatus() {
  const provider = normalizedStoreProvider();
  const configured = provider === "file" ? true : Boolean(redisConfig());
  return { provider, configured };
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function getRedisClient() {
  const config = redisConfig();
  if (!config) {
    const error = new Error("Backend-хранилище не подключено. Добавьте Redis переменные окружения для текущего VPS runtime.");
    error.statusCode = 503;
    error.code = "storage_not_configured";
    error.publicMessage = error.message;
    throw error;
  }
  return new Redis(config);
}

function fileStoreDir() {
  return path.resolve(process.env.SOBAG_FILE_STORE_DIR || FILE_STORE_DEFAULT_DIR);
}

function fileNameForKey(key) {
  return `${Buffer.from(String(key || ""), "utf8").toString("hex")}.json`;
}

function fileStorePath(key) {
  return path.join(fileStoreDir(), fileNameForKey(key));
}

function wrapFileValue(value, options = {}) {
  const ttlSeconds = Number(options.ex || options.EX || 0) || 0;
  return {
    version: 1,
    expiresAt: ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : "",
    value,
  };
}

function unwrapFileValue(record) {
  if (!record || typeof record !== "object" || Array.isArray(record) || !Object.prototype.hasOwnProperty.call(record, "value")) return record;
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return null;
  return record.value;
}

async function readFileStoreValue(key) {
  try {
    const record = JSON.parse(await fs.readFile(fileStorePath(key), "utf8"));
    const value = unwrapFileValue(record);
    if (value === null) await deleteFileStoreValue(key);
    return value;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeFileStoreValue(key, value, options = {}) {
  const dir = fileStoreDir();
  await fs.mkdir(dir, { recursive: true });
  const target = fileStorePath(key);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(wrapFileValue(value, options), null, 2)}\n`, "utf8");
  await fs.rename(temp, target);
}

async function deleteFileStoreValue(key) {
  try {
    await fs.unlink(fileStorePath(key));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function getStoreClient() {
  if (normalizedStoreProvider() === "file") {
    return {
      get: readFileStoreValue,
      set: writeFileStoreValue,
      del: deleteFileStoreValue,
    };
  }
  return getRedisClient();
}

function emptyStore() {
  return {
    users: {},
    orders: [],
    carts: {},
    savedCarts: {},
    favorites: {},
    reviews: [],
    briefs: [],
    audit: [],
    version: 1,
  };
}

function normalizeStore(value) {
  if (!value) return emptyStore();
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return {
    ...emptyStore(),
    ...parsed,
    users: parsed.users || {},
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    carts: parsed.carts && typeof parsed.carts === "object" && !Array.isArray(parsed.carts) ? parsed.carts : {},
    savedCarts: parsed.savedCarts && typeof parsed.savedCarts === "object" && !Array.isArray(parsed.savedCarts) ? parsed.savedCarts : {},
    favorites: parsed.favorites && typeof parsed.favorites === "object" && !Array.isArray(parsed.favorites) ? parsed.favorites : {},
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
    audit: Array.isArray(parsed.audit) ? parsed.audit : [],
  };
}

async function getStore() {
  const store = getStoreClient();
  return normalizeStore(await store.get(STORE_KEY));
}

async function saveStore(store) {
  const backend = getStoreClient();
  const prepared = normalizeStore(store);
  prepared.updatedAt = new Date().toISOString();
  await backend.set(STORE_KEY, prepared);
  return prepared;
}

function storedPimFor(products, parsed) {
  const pim = parsed?.pim && typeof parsed.pim === "object" && !Array.isArray(parsed.pim) ? parsed.pim : null;
  if (pim && Array.isArray(pim.products) && Array.isArray(pim.variants) && Array.isArray(pim.images) && pim.taxonomies) return pim;
  return buildCatalogPim(products, { source: "catalog-normalize", importBatches: pim?.importBatches || [] });
}

function normalizeCatalog(value) {
  if (!value) return null;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products) || !products.length) return null;
  const meta = Array.isArray(parsed) ? {} : parsed;
  return {
    products,
    updatedAt: meta.updatedAt || null,
    updatedBy: meta.updatedBy || "",
    version: Number(meta.version || 1),
    pim: storedPimFor(products, meta),
  };
}

function normalizeImportBatches(value) {
  if (!value) return [];
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const batches = Array.isArray(parsed) ? parsed : parsed.batches;
  return Array.isArray(batches) ? batches.filter((batch) => batch && typeof batch === "object") : [];
}

async function getCatalog() {
  const store = getStoreClient();
  return normalizeCatalog(await store.get(CATALOG_KEY));
}

async function getImportBatches() {
  const store = getStoreClient();
  return normalizeImportBatches(await store.get(IMPORT_BATCHES_KEY));
}

async function saveCatalog(products, updatedBy = "", options = {}) {
  const store = getStoreClient();
  let importBatches = Array.isArray(options.importBatches) ? options.importBatches : null;
  if (!importBatches) {
    const current = normalizeCatalog(await store.get(CATALOG_KEY));
    importBatches = current?.pim?.importBatches || [];
  }
  const updatedAt = options.updatedAt || new Date().toISOString();
  const payload = {
    products,
    updatedAt,
    updatedBy,
    version: 1,
    pim: buildCatalogPim(products, {
      source: options.source || "catalog-save",
      generatedAt: updatedAt,
      importBatches,
    }),
  };
  await store.set(CATALOG_KEY, payload);
  return payload;
}

async function saveImportBatches(batches) {
  const store = getStoreClient();
  const prepared = normalizeImportBatches(batches).slice(0, 50);
  await store.set(IMPORT_BATCHES_KEY, {
    batches: prepared,
    updatedAt: new Date().toISOString(),
    version: 1,
    pim: { version: 1, importBatches: summarizeImportBatches(prepared) },
  });
  return prepared;
}

function normalizeContent(value) {
  if (!value) return null;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const content = parsed.content && typeof parsed.content === "object" ? parsed.content : parsed;
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  return {
    content,
    updatedAt: parsed.updatedAt || null,
    updatedBy: parsed.updatedBy || "",
    version: Number(parsed.version || 1),
  };
}

async function getContent() {
  const store = getStoreClient();
  return normalizeContent(await store.get(CONTENT_KEY));
}

async function saveContent(content, updatedBy = "") {
  const store = getStoreClient();
  const payload = {
    content,
    updatedAt: new Date().toISOString(),
    updatedBy,
    version: 1,
  };
  await store.set(CONTENT_KEY, payload);
  return payload;
}

async function deleteSession(token) {
  if (!token) return;
  await getStoreClient().del(`sobag:session:${token}`);
}

async function getSession(token) {
  if (!token) return null;
  return getStoreClient().get(`sobag:session:${token}`);
}

async function saveSession(token, payload, ttlSeconds) {
  await getStoreClient().set(`sobag:session:${token}`, payload, { ex: ttlSeconds });
}

module.exports = {
  deleteSession,
  getCatalog,
  getContent,
  getImportBatches,
  getSession,
  getStore,
  getStoreClient,
  saveCatalog,
  saveContent,
  saveImportBatches,
  saveSession,
  saveStore,
  storeStatus,
};
