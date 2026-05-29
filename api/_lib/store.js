const { Redis } = require("@upstash/redis");

const STORE_KEY = process.env.SOBAG_STORE_KEY || "sobag:store:v1";

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

module.exports = { deleteSession, getSession, getStore, saveSession, saveStore };
