import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { cardFromDbRow, detailFromDbRows } = require("../api/_lib/catalog-db-rows.js");

function smokeCardRow() {
  const card = cardFromDbRow({
    id: "p1",
    base_sku: "OPT_1",
    name: "Catalog item",
    category: "Pillows",
    categories: JSON.stringify(["Pillows"]),
    collections: JSON.stringify(["Basic"]),
    holidays: JSON.stringify(["New year"]),
    tags: JSON.stringify(["B2B"]),
    description: "Short",
    stock: "in_stock",
    image_meta: JSON.stringify({
      url: "/img/p1.webp",
      storageKey: "products/OPT_1/main.webp",
      provider: "s3",
      width: 900,
      height: 900,
      mime: "image/webp",
      variants: [{ url: "/img/p1.avif", width: 450, height: 450, mime: "image/avif" }],
    }),
    min_price: 220,
    max_price: 260,
    variant_count: 2,
    popular: 10,
  });
  assert.equal(card.baseSku, "OPT_1");
  assert.equal(card.categories[0], "Pillows");
  assert.equal(card.collections[0], "Basic");
  assert.equal(card.image, "/img/p1.webp");
  assert.equal(card.imageMeta.storageKey, "products/OPT_1/main.webp");
  assert.equal(card.imageMeta.variants.length, 1);
  assert.equal(card.minPrice, 220);
  assert.equal(card.variantCount, 2);
  ["variants", "images", "detailDescription", "reviews"].forEach((field) => assert.equal(Object.hasOwn(card, field), false));
}

function smokeDetailRows() {
  const detail = detailFromDbRows(
    {
      id: "p1",
      base_sku: "OPT_1",
      name: "Catalog item",
      status: "published",
      hidden: false,
      categories: JSON.stringify(["Pillows"]),
      collections: JSON.stringify(["Basic"]),
      detail_description: "Full",
      min_price: 220,
      max_price: 260,
    },
    [
      {
        id: "v1",
        product_id: "p1",
        base_sku: "OPT_1",
        sku: "OPT_1_PIL_40_VEL",
        type: "Pillow",
        size: "40x40",
        material: "Velour",
        price: 220,
      },
    ],
    [
      {
        id: "i1",
        product_id: "p1",
        base_sku: "OPT_1",
        role: "main",
        url: "/img/p1.webp",
        storage_key: "products/OPT_1/main.webp",
        provider: "s3",
        width: 900,
        height: 900,
        mime: "image/webp",
      },
    ]
  );
  assert.equal(detail.hidden, false);
  assert.equal(detail.detailDescription, "Full");
  assert.equal(detail.variants.length, 1);
  assert.equal(detail.images.length, 1);
  assert.equal(detail.images[0].storageKey, "products/OPT_1/main.webp");
}

function main() {
  smokeCardRow();
  smokeDetailRows();
  console.log("catalog DB row adapter smoke passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
