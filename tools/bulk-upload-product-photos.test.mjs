import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { makeTempBulkUploadFixture, runBulkUpload } from "./bulk-upload-product-photos.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fixture = await makeTempBulkUploadFixture();
const result = await runBulkUpload([
  "--products",
  relative(process.cwd(), fixture.productsPath),
  "--photos",
  relative(process.cwd(), fixture.photos),
  "--report",
  relative(process.cwd(), fixture.reportPath),
  "--dry-run",
]);

const report = await readFile(fixture.reportPath, "utf8");
assert(result.summary.products === 2, "expected two products in dry-run fixture");
assert(result.summary.ready === 1, "expected one ready image row");
assert(result.summary.missing === 1, "expected one missing product row");
assert(report.includes("opt_100") && report.includes("ready"), "report should include ready row");
assert(report.includes("opt_200") && report.includes("missing"), "report should include missing row");

console.log("bulk-upload-product-photos dry-run test passed");
