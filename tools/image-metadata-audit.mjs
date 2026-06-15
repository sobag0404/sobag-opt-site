import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PRODUCT_STATUSES = new Set(["draft", "published", "hidden", "archive"]);
const IMAGE_PROVIDERS = new Set(["s3-compatible"]);
const RESPONSIVE_FORMATS = new Set(["webp", "avif"]);

const root = process.cwd();

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    requireMetadata: false,
    requireResponsive: false,
    requireSquare: false,
    publishedOnly: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--require-metadata") args.requireMetadata = true;
    else if (token === "--require-responsive") args.requireResponsive = true;
    else if (token === "--require-square") args.requireSquare = true;
    else if (token === "--published-only") args.publishedOnly = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/image-metadata-audit.mjs [--products data/products-live.json]

Options:
  --require-metadata    Require url, storageKey, provider, dimensions, mime, uploadedAt.
  --require-responsive  Require WebP and AVIF variants for metadata images.
  --require-square      Require square metadata dimensions.
  --published-only      Apply requirements only to published products.
  --self-test           Run the built-in fixture.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function text(value) {
  return String(value || "").trim();
}

function statusOf(product) {
  const status = text(product?.status).toLocaleLowerCase("ru-RU");
  if (PRODUCT_STATUSES.has(status)) return status;
  return product?.hidden ? "hidden" : "published";
}

function imageKey(image) {
  return text(image?.storageKey || image?.url || image?.publicUrl || image?.downloadUrl || image?.src);
}

function imageUrl(image) {
  return text(image?.url || image?.publicUrl || image?.downloadUrl || image?.src);
}

function imageMime(image) {
  return text(image?.mime || image?.contentType);
}

function imageFormat(image) {
  const explicit = text(image?.format || imageMime(image)).replace(/^image\//i, "").toLocaleLowerCase("en-US");
  if (explicit) return explicit;
  const url = imageUrl(image).toLocaleLowerCase("en-US");
  const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/);
  return match?.[1] || "";
}

function dimensions(image) {
  const width = Number(image?.width || 0) || 0;
  const height = Number(image?.height || 0) || 0;
  return { width, height };
}

function isSquare(image) {
  const { width, height } = dimensions(image);
  return width > 0 && height > 0 && Math.abs(width - height) <= 1;
}

function metadataComplete(image) {
  const { width, height } = dimensions(image);
  return Boolean(
    imageUrl(image) &&
      text(image?.storageKey) &&
      text(image?.provider) &&
      width > 0 &&
      height > 0 &&
      imageMime(image) &&
      text(image?.uploadedAt)
  );
}

function variantsFor(image) {
  return Array.isArray(image?.variants) ? image.variants.filter((variant) => variant && typeof variant === "object") : [];
}

function responsiveFormats(image) {
  return new Set(variantsFor(image).map(imageFormat).filter((format) => RESPONSIVE_FORMATS.has(format)));
}

function productLabel(product, index) {
  return text(product?.baseSku || product?.id || `product-${index + 1}`);
}

function shouldRequire(product, args) {
  return !args.publishedOnly || statusOf(product) === "published";
}

function auditProducts(products, args = {}) {
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");

  const errors = [];
  const seenImages = new Set();
  const summary = {
    products: products.length,
    metadataImages: 0,
    legacyOnlyProducts: 0,
    webpVariants: 0,
    avifVariants: 0,
    squareMetadataImages: 0,
  };

  products.forEach((product, productIndex) => {
    const label = productLabel(product, productIndex);
    const images = Array.isArray(product.images) ? product.images : [];
    if (!images.length) {
      summary.legacyOnlyProducts += 1;
      if (args.requireMetadata && shouldRequire(product, args)) errors.push(`${label}: missing images metadata`);
      return;
    }

    images.forEach((image, imageIndex) => {
      const imageLabel = `${label}: images[${imageIndex}]`;
      if (!image || typeof image !== "object") {
        errors.push(`${imageLabel} must be an object`);
        return;
      }
      const key = imageKey(image);
      if (!key) errors.push(`${imageLabel} needs url or storageKey`);
      else if (seenImages.has(key)) errors.push(`${imageLabel} duplicates image key ${key}`);
      else seenImages.add(key);

      const provider = text(image.provider);
      const { width, height } = dimensions(image);
      if (provider && !IMAGE_PROVIDERS.has(provider)) errors.push(`${imageLabel} has unsupported provider ${provider}`);
      if (image.width !== undefined && width <= 0) errors.push(`${imageLabel} width must be positive`);
      if (image.height !== undefined && height <= 0) errors.push(`${imageLabel} height must be positive`);
      if (args.requireMetadata && shouldRequire(product, args) && !metadataComplete(image)) errors.push(`${imageLabel} metadata is incomplete`);
      if (args.requireSquare && shouldRequire(product, args) && !isSquare(image)) errors.push(`${imageLabel} metadata dimensions must be square`);

      summary.metadataImages += 1;
      if (isSquare(image)) summary.squareMetadataImages += 1;

      const formats = responsiveFormats(image);
      if (formats.has("webp")) summary.webpVariants += 1;
      if (formats.has("avif")) summary.avifVariants += 1;
      if (args.requireResponsive && shouldRequire(product, args) && (!formats.has("webp") || !formats.has("avif"))) {
        errors.push(`${imageLabel} needs WebP and AVIF variants`);
      }

      variantsFor(image).forEach((variant, variantIndex) => {
        const variantLabel = `${imageLabel}.variants[${variantIndex}]`;
        const variantProvider = text(variant.provider || image.provider);
        const variantKey = imageKey(variant);
        const variantDimensions = dimensions(variant);
        if (!variantKey) errors.push(`${variantLabel} needs url or storageKey`);
        if (variantProvider && !IMAGE_PROVIDERS.has(variantProvider)) errors.push(`${variantLabel} has unsupported provider ${variantProvider}`);
        if (variant.width !== undefined && variantDimensions.width <= 0) errors.push(`${variantLabel} width must be positive`);
        if (variant.height !== undefined && variantDimensions.height <= 0) errors.push(`${variantLabel} height must be positive`);
        const format = imageFormat(variant);
        if (format && !RESPONSIVE_FORMATS.has(format)) errors.push(`${variantLabel} has unsupported responsive format ${format}`);
      });
    });
  });

  if (errors.length) {
    throw new Error(`Image metadata audit failed:\n${errors.slice(0, 40).join("\n")}${errors.length > 40 ? `\n...and ${errors.length - 40} more` : ""}`);
  }

  return summary;
}

function selfTest() {
  const products = [
    {
      id: "audit-ok",
      baseSku: "audit_ok",
      status: "published",
      images: [
        {
          url: "https://cdn.example/audit.jpg",
          storageKey: "products/audit/audit.jpg",
          provider: "s3-compatible",
          width: 1200,
          height: 1200,
          mime: "image/jpeg",
          uploadedAt: "2026-06-09T00:00:00.000Z",
          variants: [
            {
              url: "https://cdn.example/audit-480.webp",
              storageKey: "products/audit/audit-480.webp",
              provider: "s3-compatible",
              width: 480,
              height: 480,
              mime: "image/webp",
              format: "webp",
            },
            {
              url: "https://cdn.example/audit-480.avif",
              storageKey: "products/audit/audit-480.avif",
              provider: "s3-compatible",
              width: 480,
              height: 480,
              mime: "image/avif",
              format: "avif",
            },
          ],
        },
      ],
    },
  ];
  const summary = auditProducts(products, { requireMetadata: true, requireResponsive: true, requireSquare: true, publishedOnly: true });
  if (summary.metadataImages !== 1 || summary.webpVariants !== 1 || summary.avifVariants !== 1) {
    throw new Error("Image metadata audit self-test summary mismatch");
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Image metadata audit self-test passed");
    return;
  }
  const products = JSON.parse(readFileSync(args.products, "utf8"));
  const summary = auditProducts(products, args);
  console.log(
    `Image metadata audit passed: ${summary.products} products, ${summary.metadataImages} metadata images, ${summary.legacyOnlyProducts} legacy-only products, ${summary.webpVariants} WebP sets, ${summary.avifVariants} AVIF sets`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { auditProducts };
