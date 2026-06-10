import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildGoalInputsReport } from "./goal-inputs-packet-audit.mjs";

const OUTPUT_DIR = "local-import-output";
const templates = {
  "final-content-packet.json": {
    companyName: "TODO: confirmed legal/company name",
    footerEmail: "opt@sobag-shop.online",
    footerPhone: "+7 TODO",
    footerAddress: "TODO: confirmed public address text",
    contactsLegalAddress: "TODO: confirmed legal address",
    contactsProductionAddress: "TODO: confirmed production or pickup address",
    contactsSchedule: "TODO: confirmed schedule",
    contactsLegalMapUrl: "https://yandex.ru/maps/?text=TODO",
    contactsProductionMapUrl: "https://yandex.ru/maps/?text=TODO",
  },
  "object-storage-env-packet.json": {
    provider: "s3-compatible",
    endpoint: "https://TODO-storage-endpoint",
    bucket: "TODO-bucket",
    region: "auto",
    publicBaseUrl: "https://TODO-public-cdn-or-bucket-url",
    credentialsConfirmed: false,
    publicReadConfirmed: false,
    corsConfirmed: false,
  },
  "catalog-db-env-packet.json": {
    provider: "postgres",
    databaseKind: "test",
    hostClass: "managed-or-vps",
    databaseName: "sobag_catalog_test",
    sslRequired: true,
    schemaApplied: false,
    seedSource: "bundle:pim:postgres",
    rollbackRehearsalConfirmed: false,
    productionCredentials: false,
    runtimeToggleApproved: false,
  },
  "cwv-field-audit-packet.json": {
    baseUrl: "https://sobag-shop.online",
    catalogProducts: 10000,
    imageMigrationReady: false,
    measuredAt: "TODO: ISO timestamp",
    tool: "TODO: Lighthouse/WebPageTest/Chrome UX workflow",
    pages: [
      { path: "/", lcpMs: 0, cls: 0, inpMs: 0, tbtMs: 0, firstPageApiKb: 0, usesWebpOrAvif: false },
      { path: "/catalog", lcpMs: 0, cls: 0, inpMs: 0, tbtMs: 0, firstPageApiKb: 0, usesWebpOrAvif: true },
      { path: "/catalog?category=Подушки", lcpMs: 0, cls: 0, inpMs: 0, tbtMs: 0, firstPageApiKb: 0, usesWebpOrAvif: true },
      { path: "/search?q=подушка", lcpMs: 0, cls: 0, inpMs: 0, tbtMs: 0, firstPageApiKb: 0, usesWebpOrAvif: true },
      { path: "/cart", lcpMs: 0, cls: 0, inpMs: 0, tbtMs: 0, firstPageApiKb: 0, usesWebpOrAvif: false },
      { path: "/product-modal?sku=TODO", lcpMs: 0, cls: 0, inpMs: 0, tbtMs: 0, firstPageApiKb: 0, usesWebpOrAvif: true },
    ],
  },
};

function parseArgs(argv = process.argv.slice(2)) {
  const args = { outDir: OUTPUT_DIR, force: false, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--out-dir") args.outDir = argv[++index] || args.outDir;
    else if (token === "--force") args.force = true;
    else if (token === "--self-test") args.selfTest = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function writeTemplates({ outDir = OUTPUT_DIR, force = false } = {}) {
  mkdirSync(outDir, { recursive: true });
  const written = [];
  const skipped = [];
  for (const [file, data] of Object.entries(templates)) {
    const path = join(outDir, file);
    if (existsSync(path) && !force) {
      skipped.push(path);
      continue;
    }
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    written.push(path);
  }
  return { outDir, written, skipped };
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "sobag-goal-inputs-"));
  try {
    const result = writeTemplates({ outDir: dir });
    if (result.written.length !== 4) throw new Error("template writer must create 4 packet files");
    const sample = JSON.parse(readFileSync(join(dir, "catalog-db-env-packet.json"), "utf8"));
    if (sample.productionCredentials !== false || sample.runtimeToggleApproved !== false) {
      throw new Error("catalog DB template must keep production credentials/toggle disabled");
    }
    const second = writeTemplates({ outDir: dir });
    if (second.skipped.length !== 4) throw new Error("template writer must not overwrite without --force");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Goal inputs packet template self-test passed");
    return;
  }
  const result = writeTemplates(args);
  console.log(`Goal input packet templates: ${result.written.length} written, ${result.skipped.length} skipped`);
  [...result.written, ...result.skipped].forEach((path) => console.log(path));
  const report = buildGoalInputsReport({ strict: false });
  console.log(`Goal inputs after template write: ${report.ready ? "ready" : "pending"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { writeTemplates };
