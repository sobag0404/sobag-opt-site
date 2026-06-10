import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function makeResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end(body = "") {
      this.body = body;
      return this;
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

process.env.SOBAG_STORE_PROVIDER = "redis";
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const health = require("../server-routes/health.js");
const res = makeResponse();
await health({ method: "GET" }, res);
const payload = JSON.parse(res.body || "{}");

assert(res.statusCode === 503, "health should return 503 when default Redis/KV env is absent");
assert(payload.ok === false, "health should report ok=false when storage is absent");
assert(payload.store?.provider === "redis", "health should report redis provider by default");
assert(payload.store?.configured === false, "health should report redis as not configured without env");
assert(payload.catalogDb?.enabled === false, "health should report catalog DB disabled by default");
assert(payload.catalogDb?.configured === false, "health should report catalog DB unconfigured without env");
assert(!JSON.stringify(payload).includes("TOKEN"), "health payload should not expose token-like values");

console.log("health store status smoke passed");
