import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { catalogDbEnabled, catalogDbStatus, getCatalogDbClient } = require("../api/_lib/catalog-db-client.js");

function main() {
  assert.equal(catalogDbEnabled({}), false);
  assert.equal(catalogDbEnabled({ SOBAG_CATALOG_SOURCE: "store" }), false);
  assert.equal(catalogDbEnabled({ SOBAG_CATALOG_SOURCE: "postgres" }), true);
  assert.deepEqual(catalogDbStatus({ SOBAG_CATALOG_SOURCE: "postgres" }), { enabled: true, configured: false });
  assert.deepEqual(catalogDbStatus({ SOBAG_CATALOG_SOURCE: "postgres", SOBAG_CATALOG_DATABASE_URL: "postgres://example" }), { enabled: true, configured: true });
  assert.equal(getCatalogDbClient({ SOBAG_CATALOG_SOURCE: "store" }), null);
  assert.throws(() => getCatalogDbClient({ SOBAG_CATALOG_SOURCE: "postgres" }), /not configured/);
  console.log("catalog DB client smoke passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
