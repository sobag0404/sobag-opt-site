const { Redis } = require("@upstash/redis");

const STORE_KEY = process.env.SOBAG_STORE_KEY || "sobag:store:v1";
const CATALOG_KEY = process.env.SOBAG_CATALOG_KEY || "sobag:catalog:v1";
const CONTENT_KEY = process.env.SOBAG_CONTENT_KEY || "sobag:content:v1";

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function getRedis() {
  const config = redisConfig();
  if (!config) {
    const error = new Error("Backend-хранилище не подключено. Добавьте Upstash Redis/Vercel KV переменные в Vercel.");
    error.statusCode = 503;
    error.code = "storage_not_configured";
    error.publicMessage = error.message;
    throw error;
  }
  return new Redis(config);
}

function emptyStore() {
  return {
    users: {},
    orders: [],
    carts: {},
    savedCarts: {},
    favorites: {},
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
    audit: Array.isArray(parsed.audit) ? parsed.audit : [],
  };
}

async function getStore() {
  const redis = getRedis();
  return normalizeStore(await redis.get(STORE_KEY));
}

async function saveStore(store) {
  const redis = getRedis();
  const prepared = normalizeStore(store);
  prepared.updatedAt = new Date().toISOString();
  await redis.set(STORE_KEY, prepared);
  return prepared;
}

function normalizeCatalog(value) {
  if (!value) return null;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products) || !products.length) return null;
  return {
    products,
    updatedAt: parsed.updatedAt || null,
    updatedBy: parsed.updatedBy || "",
    version: Number(parsed.version || 1),
  };
}

async function getCatalog() {
  const redis = getRedis();
  return normalizeCatalog(await redis.get(CATALOG_KEY));
}

async function saveCatalog(products, updatedBy = "") {
  const redis = getRedis();
  const payload = {
    products,
    updatedAt: new Date().toISOString(),
    updatedBy,
    version: 1,
  };
  await redis.set(CATALOG_KEY, payload);
  return payload;
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
  const redis = getRedis();
  return normalizeContent(await redis.get(CONTENT_KEY));
}

async function saveContent(content, updatedBy = "") {
  const redis = getRedis();
  const payload = {
    content,
    updatedAt: new Date().toISOString(),
    updatedBy,
    version: 1,
  };
  await redis.set(CONTENT_KEY, payload);
  return payload;
}

async function deleteSession(token) {
  if (!token) return;
  await getRedis().del(`sobag:session:${token}`);
}

async function getSession(token) {
  if (!token) return null;
  return getRedis().get(`sobag:session:${token}`);
}

async function saveSession(token, payload, ttlSeconds) {
  await getRedis().set(`sobag:session:${token}`, payload, { ex: ttlSeconds });
}

module.exports = { deleteSession, getCatalog, getContent, getSession, getStore, saveCatalog, saveContent, saveSession, saveStore };
