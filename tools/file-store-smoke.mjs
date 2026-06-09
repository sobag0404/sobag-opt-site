import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tempDir = mkdtempSync(join(tmpdir(), "sobag-file-store-"));

process.env.SOBAG_STORE_PROVIDER = "file";
process.env.SOBAG_FILE_STORE_DIR = tempDir;

const {
  deleteSession,
  getCatalog,
  getContent,
  getImportBatches,
  getSession,
  getStore,
  saveCatalog,
  saveContent,
  saveImportBatches,
  saveSession,
  saveStore,
} = require("../api/_lib/store.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const empty = await getStore();
  assert(empty.version === 1, "empty file store should normalize store payload");
  assert(Array.isArray(empty.orders) && empty.orders.length === 0, "empty file store should include orders array");

  const savedStore = await saveStore({ ...empty, users: { "admin@sobag": { email: "admin@sobag", role: "admin" } } });
  assert(savedStore.users["admin@sobag"].role === "admin", "file store should save users");
  assert((await getStore()).users["admin@sobag"].role === "admin", "file store should read saved users");

  const products = [
    {
      id: "file-store-product",
      baseSku: "FILE_STORE_001",
      name: "File store product",
      status: "published",
      category: "Подушки",
      variants: [{ sku: "FILE_STORE_001_A", price: 100 }],
    },
  ];
  const catalog = await saveCatalog(products, "smoke", { source: "file-store-smoke" });
  assert(catalog.pim?.products?.length === 1, "file catalog save should build PIM sidecar");
  assert((await getCatalog()).products[0].baseSku === "FILE_STORE_001", "file catalog should round-trip products");

  await saveImportBatches([{ id: "batch-file-store", status: "preview", rows: [] }]);
  assert((await getImportBatches())[0].id === "batch-file-store", "file import batches should round-trip");

  await saveContent({ brandName: "Sobag Opt File" }, "smoke");
  assert((await getContent()).content.brandName === "Sobag Opt File", "file content should round-trip");

  await saveSession("session-file-store", { email: "admin@sobag" }, 60);
  assert((await getSession("session-file-store")).email === "admin@sobag", "file sessions should round-trip");
  await deleteSession("session-file-store");
  assert((await getSession("session-file-store")) === null, "file sessions should delete");

  await saveSession("expired-file-store", { email: "expired@sobag" }, 1);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert((await getSession("expired-file-store")) === null, "file sessions should respect ttl expiry");

  console.log(`file-store smoke passed: ${tempDir}`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
