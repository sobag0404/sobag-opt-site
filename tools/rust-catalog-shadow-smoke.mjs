#!/usr/bin/env node

const DEFAULT_NODE_BASE = "https://sobag-shop.online";
const DEFAULT_RUST_BASE = "http://127.0.0.1:3001";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { nodeBase: DEFAULT_NODE_BASE, rustBase: DEFAULT_RUST_BASE, timeout: 10000 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--node-base") args.nodeBase = argv[++index] || args.nodeBase;
    else if (token === "--rust-base") args.rustBase = argv[++index] || args.rustBase;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/rust-catalog-shadow-smoke.mjs --node-base https://sobag-shop.online --rust-base http://127.0.0.1:3001

Compares read-only catalog query/detail responses between current Node and Rust catalog APIs.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  args.nodeBase = args.nodeBase.replace(/\/+$/, "");
  args.rustBase = args.rustBase.replace(/\/+$/, "");
  return args;
}

async function getJson(base, path, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${base}${path}`, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`${base}${path} -> HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function skuList(payload) {
  return (Array.isArray(payload?.items) ? payload.items : []).map((item) => item.baseSku).filter(Boolean);
}

function compareLists(label, nodePayload, rustPayload) {
  assert(Number(nodePayload.total) === Number(rustPayload.total), `${label}: total mismatch ${nodePayload.total} != ${rustPayload.total}`);
  const nodeSkus = skuList(nodePayload);
  const rustSkus = skuList(rustPayload);
  assert(nodeSkus.length === rustSkus.length, `${label}: item count mismatch ${nodeSkus.length} != ${rustSkus.length}`);
  assert(nodeSkus.join("|") === rustSkus.join("|"), `${label}: sku order mismatch`);
  assert(Boolean(nodePayload.pageInfo?.hasMore) === Boolean(rustPayload.pageInfo?.hasMore), `${label}: hasMore mismatch`);
  assert(String(nodePayload.pageInfo?.nextCursor || "") === String(rustPayload.pageInfo?.nextCursor || ""), `${label}: nextCursor mismatch`);
}

function compareDetail(label, nodePayload, rustPayload) {
  const nodeProduct = nodePayload.product || {};
  const rustProduct = rustPayload.product || {};
  assert(nodeProduct.baseSku === rustProduct.baseSku, `${label}: baseSku mismatch`);
  assert(nodeProduct.name === rustProduct.name, `${label}: name mismatch`);
  assert((nodeProduct.variants || []).length === (rustProduct.variants || []).length, `${label}: variants count mismatch`);
  assert((nodeProduct.images || []).length === (rustProduct.images || []).length, `${label}: images count mismatch`);
}

async function main() {
  const args = parseArgs();
  const health = await getJson(args.rustBase, "/api/health-rust", args.timeout);
  assert(health?.ok === true, "rust health is not ok");

  const paths = [
    ["popular", "/api/catalog-query?pageSize=12&sort=popular"],
    ["category", "/api/catalog-query?pageSize=12&category=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B8"],
    ["search lowercase", "/api/catalog-query?pageSize=12&q=%D0%BF%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B0"],
    ["search uppercase", "/api/catalog-query?pageSize=12&q=%D0%9F%D0%9E%D0%94%D0%A3%D0%A8%D0%9A%D0%90"],
    ["page 2", "/api/catalog-query?pageSize=12&cursor=MTI&sort=popular"],
  ];

  for (const [label, path] of paths) {
    const [nodePayload, rustPayload] = await Promise.all([getJson(args.nodeBase, path, args.timeout), getJson(args.rustBase, path, args.timeout)]);
    compareLists(label, nodePayload, rustPayload);
    console.log(`OK ${label}`);
  }

  const detailPath = "/api/catalog-detail?baseSku=opt_70190";
  const [nodeDetail, rustDetail] = await Promise.all([getJson(args.nodeBase, detailPath, args.timeout), getJson(args.rustBase, detailPath, args.timeout)]);
  compareDetail("detail", nodeDetail, rustDetail);
  console.log("OK detail");
  console.log("Rust catalog shadow smoke passed");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
