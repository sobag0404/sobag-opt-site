import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createObjectStorageAdapter, objectStorageStatus } = require("../api/_lib/object-storage.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const savedEnv = {};
const envKeys = [
  "SOBAG_OBJECT_STORAGE_PROVIDER",
  "SOBAG_S3_ENDPOINT",
  "SOBAG_S3_BUCKET",
  "SOBAG_S3_ACCESS_KEY_ID",
  "SOBAG_S3_SECRET_ACCESS_KEY",
  "SOBAG_S3_REGION",
  "SOBAG_S3_PUBLIC_BASE_URL",
  "SOBAG_S3_FORCE_PATH_STYLE",
];
envKeys.forEach((key) => {
  savedEnv[key] = process.env[key];
});
const savedFetch = globalThis.fetch;

try {
  process.env.SOBAG_OBJECT_STORAGE_PROVIDER = "s3-compatible";
  process.env.SOBAG_S3_ENDPOINT = "https://s3.example.test";
  process.env.SOBAG_S3_BUCKET = "sobag-test";
  process.env.SOBAG_S3_ACCESS_KEY_ID = "test-access-key";
  process.env.SOBAG_S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.SOBAG_S3_REGION = "auto";
  process.env.SOBAG_S3_PUBLIC_BASE_URL = "https://cdn.example.test/media";
  process.env.SOBAG_S3_FORCE_PATH_STYLE = "true";

  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(String(url));
    calls.push({ url: parsed, options });
    const headers = options.headers || {};
    assert(headers.Authorization?.startsWith("AWS4-HMAC-SHA256 "), "S3 request should be signed with AWS SigV4");
    assert(headers["x-amz-date"], "S3 request should include x-amz-date");
    assert(headers["x-amz-content-sha256"], "S3 request should include payload hash");
    assert(parsed.hostname === "s3.example.test", "S3 request should use configured endpoint");
    assert(parsed.pathname.startsWith("/sobag-test"), "S3 request should use path-style bucket path");

    if (options.method === "PUT") {
      assert(headers["content-type"] === "image/png", "S3 upload should keep image content type");
      assert(parsed.pathname.includes("/products/opt_100/"), "S3 upload should use product image prefix");
      return new Response("", { status: 200, headers: { etag: '"upload-etag"' } });
    }

    if (options.method === "GET") {
      assert(parsed.searchParams.get("list-type") === "2", "S3 list should use ListObjectsV2");
      assert(parsed.searchParams.get("prefix") === "products/opt_100/", "S3 list should request product prefix");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Contents>
    <Key>products/opt_100/1.png</Key>
    <LastModified>2026-06-09T00:00:00.000Z</LastModified>
    <ETag>&quot;listed-etag&quot;</ETag>
    <Size>3</Size>
  </Contents>
</ListBucketResult>`;
      return new Response(xml, { status: 200, headers: { "content-type": "application/xml" } });
    }

    if (options.method === "DELETE") {
      assert(parsed.pathname.endsWith("/products/opt_100/1.png"), "S3 delete should target image key");
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected S3 method: ${options.method}`);
  };

  const status = objectStorageStatus("s3-compatible");
  assert(status.configured === true, "S3 status should be configured when required env is present");
  assert(status.publicUrlConfigured === true, "S3 status should expose public URL readiness only as a boolean");

  const adapter = createObjectStorageAdapter("s3-compatible");
  const uploaded = await adapter.upload({
    productKey: "opt_100",
    fileName: "1.png",
    body: Buffer.from([1, 2, 3]),
    mime: "image/png",
    width: 1,
    height: 1,
  });
  assert(uploaded.provider === "s3-compatible", "uploaded image should keep s3-compatible provider");
  assert(uploaded.storageKey.startsWith("products/opt_100/"), "uploaded image should include generated storage key");
  assert(uploaded.url.startsWith("https://cdn.example.test/media/products/opt_100/"), "uploaded image should use public base URL");
  assert(uploaded.etag === "upload-etag", "uploaded image should include S3 ETag");

  const listed = await adapter.listByProduct("opt_100");
  assert(listed.length === 1, "S3 list should parse one image");
  assert(listed[0].storageKey === "products/opt_100/1.png", "S3 list should parse object key");
  assert(listed[0].url === "https://cdn.example.test/media/products/opt_100/1.png", "S3 list should build public URL");

  const deleted = await adapter.deleteOrMarkUnused(listed[0]);
  assert(deleted.status === "deleted", "S3 delete should return deleted metadata");

  const beforeMarkUnused = calls.length;
  const unused = await adapter.deleteOrMarkUnused(listed[0], { mode: "mark-unused" });
  assert(unused.status === "unused", "S3 mark-unused should avoid hard delete");
  assert(calls.length === beforeMarkUnused, "S3 mark-unused should not call object storage");

  assert(calls.map((call) => call.options.method).join(",") === "PUT,GET,DELETE", "S3 smoke should cover PUT, GET, and DELETE");
  console.log("object-storage s3-compatible smoke passed");
} finally {
  envKeys.forEach((key) => {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  });
  globalThis.fetch = savedFetch;
}
