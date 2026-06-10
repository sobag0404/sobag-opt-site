import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");
const { productCard, productDetail } = require("../api/_lib/catalog-query.js");

const root = process.cwd();
const CARD_FORBIDDEN_FIELDS = new Set(["variants", "images", "gallery", "detailDescription", "reviews", "variantPrices", "types", "sizes", "materials"]);

function text(value) {
  return String(value || "").trim();
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : text(value).split(text(value).includes(";") ? ";" : ",").map(text).filter(Boolean);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-postgres-query-contract.mjs [--products data/products-live.json]

Options:
  --json       Print machine-readable report.
  --self-test  Run fixture checks.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function loadProducts(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("Products JSON must contain a non-empty array.");
  return parsed;
}

function taxonomiesByProduct(pim) {
  const buckets = new Map();
  (pim.taxonomyAssignments || []).forEach((assignment) => {
    const productId = text(assignment.productId);
    if (!productId) return;
    const current =
      buckets.get(productId) ||
      {
        categories: [],
        collections: [],
        holidays: [],
        tags: [],
      };
    if (assignment.type === "category") current.categories.push(assignment.name);
    if (assignment.type === "collection") current.collections.push(assignment.name);
    if (assignment.type === "holiday") current.holidays.push(assignment.name);
    if (assignment.type === "tag") current.tags.push(assignment.name);
    buckets.set(productId, current);
  });
  return buckets;
}

function primaryImageForProduct(pim, productId) {
  const images = (pim.images || []).filter((image) => image.productId === productId);
  return (
    images.find((image) => image.role === "main") ||
    images.find((image) => image.role === "legacy-main") ||
    images[0] ||
    null
  );
}

function publicProductRows(pim) {
  const taxonomyMap = taxonomiesByProduct(pim);
  return (pim.products || [])
    .filter((product) => product.status === "published" && product.hidden === false)
    .map((product) => {
      const taxonomy = taxonomyMap.get(product.id) || {};
      return {
        id: product.id,
        baseSku: product.baseSku,
        name: product.name,
        status: product.status,
        hidden: product.hidden,
        category: list(taxonomy.categories)[0] || product.category || "",
        categories: list(taxonomy.categories),
        collections: list(taxonomy.collections),
        holidays: list(taxonomy.holidays),
        tags: list(taxonomy.tags),
        description: product.description,
        detailDescription: product.detailDescription,
        stock: product.stock,
        minPrice: product.minPrice,
        maxPrice: product.maxPrice,
        variantCount: product.variantCount,
        popular: product.popular,
      };
    });
}

function publicCardRows(pim) {
  return publicProductRows(pim).map((product) => {
    const image = primaryImageForProduct(pim, product.id);
    const imageMeta = image
      ? {
          url: image.url,
          storageKey: image.storageKey,
          provider: image.provider,
          width: image.width,
          height: image.height,
          mime: image.mime,
          variants: Array.isArray(image.variants) ? image.variants : [],
        }
      : null;
    return {
      id: product.id,
      baseSku: product.baseSku,
      name: product.name,
      category: product.category,
      categories: product.categories,
      collections: product.collections,
      holidays: product.holidays,
      tags: product.tags,
      description: product.description,
      stock: product.stock,
      image: imageMeta?.url || "",
      imageMeta,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
      variantCount: product.variantCount,
      popular: product.popular,
    };
  });
}

function publicDetailRow(pim, baseSku) {
  const product = publicProductRows(pim).find((row) => row.baseSku === baseSku || row.id === baseSku);
  if (!product) return null;
  return {
    ...product,
    images: (pim.images || []).filter((image) => image.productId === product.id),
    variants: (pim.variants || []).filter((variant) => variant.productId === product.id),
  };
}

function assertCardShape(cards, errors) {
  cards.forEach((card) => {
    if (!text(card.id)) errors.push("card missing id");
    if (!text(card.baseSku)) errors.push(`card ${card.id || "unknown"} missing baseSku`);
    if (!text(card.name)) errors.push(`card ${card.id || "unknown"} missing name`);
    if (!(Number(card.variantCount) >= 0)) errors.push(`card ${card.id || "unknown"} has invalid variantCount`);
    CARD_FORBIDDEN_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(card, field)) errors.push(`card ${card.id || "unknown"} leaks field ${field}`);
    });
    if (card.imageMeta) {
      ["url", "storageKey", "provider", "width", "height", "mime", "variants"].forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(card.imageMeta, field)) errors.push(`card ${card.id || "unknown"} imageMeta missing ${field}`);
      });
    }
  });
}

function auditPimPostgresQueryContract(products) {
  const pim = buildCatalogPim(products, { source: "pim-postgres-query-contract" });
  const expectedCards = products
    .filter((product) => product && typeof product === "object")
    .filter((product) => productCard(productDetail(product)) && productDetail(product).status === "published")
    .map((product) => productCard(productDetail(product)));
  const cards = publicCardRows(pim);
  const errors = [];
  const warnings = [];

  assertCardShape(cards, errors);
  if (cards.length !== expectedCards.length) errors.push(`card count mismatch: expected ${expectedCards.length}, got ${cards.length}`);

  const cardSkus = new Set(cards.map((card) => card.baseSku));
  expectedCards.forEach((expected) => {
    const actual = cards.find((card) => card.baseSku === expected.baseSku);
    if (!actual) {
      errors.push(`missing card for ${expected.baseSku}`);
      return;
    }
    ["name", "category", "description", "stock"].forEach((field) => {
      if (text(actual[field]) !== text(expected[field])) errors.push(`card ${expected.baseSku} field ${field} mismatch`);
    });
    ["minPrice", "maxPrice", "variantCount", "popular"].forEach((field) => {
      if (Number(actual[field] || 0) !== Number(expected[field] || 0)) errors.push(`card ${expected.baseSku} field ${field} mismatch`);
    });
  });

  products.forEach((product) => {
    const detail = productDetail(product);
    if (!detail || detail.status !== "published") {
      if (cardSkus.has(text(product?.baseSku))) errors.push(`non-public product leaked into card rows: ${text(product?.baseSku)}`);
      return;
    }
    const row = publicDetailRow(pim, detail.baseSku);
    if (!row) {
      errors.push(`missing detail row for ${detail.baseSku}`);
      return;
    }
    if (row.variants.length !== detail.variants.length) errors.push(`detail ${detail.baseSku} variant count mismatch`);
    if (row.images.length !== detail.images.length) errors.push(`detail ${detail.baseSku} image count mismatch`);
  });

  if (!cards.length) warnings.push("public card view is empty");
  if (cards.length > 48) warnings.push("live catalog exceeds one page; keep list API paginated and compact");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      publicCards: cards.length,
      pimProducts: pim.products.length,
      pimVariants: pim.variants.length,
      pimImages: pim.images.length,
    },
    contractVersion: 1,
    targetViews: ["public_catalog_products", "public_catalog_cards"],
  };
}

function selfTest() {
  const report = auditPimPostgresQueryContract([
    {
      id: "published-1",
      baseSku: "PUB_1",
      name: "Published item",
      status: "published",
      categories: ["Pillows"],
      collections: ["Basic"],
      types: ["Pillow"],
      sizes: ["40x40"],
      materials: ["Velour"],
      basePrice: 100,
      images: [
        {
          url: "/assets/test.png",
          storageKey: "products/PUB_1/main.png",
          provider: "s3",
          width: 900,
          height: 900,
          mime: "image/png",
          variants: [{ url: "/assets/test.webp", width: 450, height: 450, mime: "image/webp" }],
        },
      ],
    },
    {
      id: "draft-1",
      baseSku: "DRAFT_1",
      name: "Draft item",
      status: "draft",
      basePrice: 100,
    },
    {
      id: "hidden-1",
      baseSku: "HIDDEN_1",
      name: "Hidden item",
      hidden: true,
      basePrice: 100,
    },
  ]);
  if (!report.ok || report.counts.publicCards !== 1 || report.counts.pimProducts !== 3) {
    throw new Error("PIM PostgreSQL query contract self-test failed");
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("PIM PostgreSQL query contract self-test passed");
    return;
  }
  const report = auditPimPostgresQueryContract(loadProducts(args.products));
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `PIM PostgreSQL query contract ${report.ok ? "passed" : "failed"}: ${report.counts.publicCards} public cards, ${report.counts.pimVariants} variants, ${report.counts.pimImages} images`
    );
    if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
    if (report.errors.length) console.log(`Errors: ${report.errors.slice(0, 20).join("; ")}`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { auditPimPostgresQueryContract };
