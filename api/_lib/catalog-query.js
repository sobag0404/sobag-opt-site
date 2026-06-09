const { imageRecordsForProduct, productStatus, variantRecordsForProduct } = require("./pim");

const DEFAULT_PAGE_SIZE = 48;
const MAX_PAGE_SIZE = 120;
const SORT_OPTIONS = new Set(["relevance", "name", "price_asc", "price_desc", "sku", "popular"]);
const FACET_BUCKETS = {
  category: "categories",
  collection: "collections",
  holiday: "holidays",
  tag: "tags",
  type: "types",
  size: "sizes",
  material: "materials",
  stock: "stock",
};

function text(value) {
  return String(value || "").trim();
}

function list(value) {
  const items = Array.isArray(value) ? value : text(value).split(text(value).includes(";") ? ";" : ",");
  const seen = new Set();
  return items
    .map((item) => text(item).replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalize(value) {
  return text(value).toLocaleLowerCase("ru-RU");
}

function skuKey(value) {
  return text(value)
    .toLocaleUpperCase("ru-RU")
    .replace(/[^\p{L}0-9]+/gu, "");
}

function publicProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter((product) => productStatus(product) === "published");
}

function productCategories(product) {
  const categories = list(product?.categories);
  return categories.length ? categories : list(product?.category);
}

function firstImageMetadata(product) {
  const images = imageRecordsForProduct(product);
  const image = images.find((item) => item.role === "main") || images[0] || null;
  return image
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
}

function variantSummary(product) {
  const variants = variantRecordsForProduct(product);
  const prices = variants.map((variant) => Number(variant.price || 0)).filter((price) => Number.isFinite(price) && price > 0);
  return {
    count: variants.length,
    minPrice: prices.length ? Math.min(...prices) : Number(product?.basePrice || 0) || 0,
    maxPrice: prices.length ? Math.max(...prices) : Number(product?.basePrice || 0) || 0,
    skus: variants.map((variant) => variant.sku).filter(Boolean),
  };
}

function productSearchText(product, variants = []) {
  return normalize(
    [
      product?.baseSku,
      product?.name,
      product?.category,
      productCategories(product).join(" "),
      list(product?.collections).join(" "),
      list(product?.holidays).join(" "),
      list(product?.tags).join(" "),
      list(product?.types).join(" "),
      list(product?.sizes).join(" "),
      list(product?.materials).join(" "),
      product?.theme,
      product?.description,
      product?.detailDescription,
      variants.join(" "),
    ].join(" ")
  );
}

function scoreProduct(product, query, variants) {
  const prepared = normalize(query);
  if (!prepared) return 1;
  const preparedSku = skuKey(query);
  const baseSku = skuKey(product?.baseSku);
  const variantSkus = variants.map(skuKey);
  if (preparedSku && baseSku === preparedSku) return 1000;
  if (preparedSku && variantSkus.includes(preparedSku)) return 900;
  if (normalize(product?.name) === prepared) return 800;
  const haystack = productSearchText(product, variants);
  if (haystack.includes(prepared)) return 400;
  const tokens = prepared.split(/\s+/).filter((token) => token.length > 2);
  if (tokens.length && tokens.every((token) => haystack.includes(token))) return 200 + tokens.length;
  return 0;
}

function hasAny(source, selected = []) {
  if (!selected.length) return true;
  const values = new Set(list(source).map(normalize));
  return selected.some((item) => values.has(normalize(item)));
}

function productFilterValues(product) {
  return {
    category: productCategories(product),
    collection: list(product?.collections),
    holiday: list(product?.holidays),
    tag: list(product?.tags),
    type: list(product?.types),
    size: list(product?.sizes),
    material: list(product?.materials),
    stock: list(product?.stock),
  };
}

function productFilterIndex(product) {
  const values = productFilterValues(product);
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, items]) => [key, new Set(items.map(normalize))])
  );
  return { values, normalized };
}

function hasAnyIndexed(index, group, selected = []) {
  if (!selected.length) return true;
  const values = index?.normalized?.[group] || new Set();
  return selected.some((item) => values.has(normalize(item)));
}

function productMatchesFilters(product, filters) {
  const safeFilters = filters || {};
  if (!hasAny(productCategories(product), safeFilters.category)) return false;
  if (!hasAny(product?.collections, safeFilters.collection)) return false;
  if (!hasAny(product?.holidays, safeFilters.holiday)) return false;
  if (!hasAny(product?.tags, safeFilters.tag)) return false;
  if (!hasAny(product?.types, safeFilters.type)) return false;
  if (!hasAny(product?.sizes, safeFilters.size)) return false;
  if (!hasAny(product?.materials, safeFilters.material)) return false;
  if ((safeFilters.stock || []).length && !safeFilters.stock.some((stock) => normalize(stock) === normalize(product?.stock))) return false;
  return true;
}

function productMatchesFilterIndex(index, filters) {
  const safeFilters = filters || {};
  return Object.keys(FACET_BUCKETS).every((group) => hasAnyIndexed(index, group, safeFilters[group]));
}

function parseValues(params, names) {
  const values = names.flatMap((name) => params.getAll(name));
  return list(values.flatMap((value) => list(value)));
}

function paramsToQuery(url) {
  const params = url.searchParams;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("pageSize") || params.get("limit") || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE));
  const page = Math.max(1, Number(params.get("page") || 1) || 1);
  const cursor = decodeCursor(params.get("cursor"));
  const sort = SORT_OPTIONS.has(text(params.get("sort"))) ? text(params.get("sort")) : "relevance";
  return {
    q: text(params.get("q") || params.get("query")),
    filters: {
      category: parseValues(params, ["category", "categories"]),
      collection: parseValues(params, ["collection", "collections"]),
      holiday: parseValues(params, ["holiday", "holidays"]),
      tag: parseValues(params, ["tag", "tags"]),
      type: parseValues(params, ["type", "types"]),
      size: parseValues(params, ["size", "sizes"]),
      material: parseValues(params, ["material", "materials"]),
      stock: parseValues(params, ["stock"]),
    },
    minPrice: Number(params.get("minPrice") || 0) || 0,
    maxPrice: Number(params.get("maxPrice") || 0) || 0,
    sort,
    page,
    pageSize,
    offset: Number.isFinite(cursor) ? cursor : (page - 1) * pageSize,
  };
}

function encodeCursor(offset) {
  return Buffer.from(String(Math.max(0, Number(offset) || 0))).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const decoded = Number(Buffer.from(text(value), "base64url").toString("utf8"));
    return Number.isFinite(decoded) && decoded >= 0 ? decoded : null;
  } catch {
    return null;
  }
}

function productCard(product, summary = variantSummary(product), filterValues = productFilterValues(product)) {
  const image = firstImageMetadata(product);
  const categories = filterValues.category || productCategories(product);
  return {
    id: text(product?.id || product?.baseSku),
    baseSku: text(product?.baseSku),
    name: text(product?.name),
    category: categories[0] || "",
    categories,
    collections: filterValues.collection || list(product?.collections),
    holidays: filterValues.holiday || list(product?.holidays),
    tags: filterValues.tag || list(product?.tags),
    badge: text(product?.badge),
    description: text(product?.description),
    stock: text(product?.stock),
    image: image?.url || text(product?.image),
    imageMeta: image,
    galleryCount: list(product?.gallery).length + Math.max(0, imageRecordsForProduct(product).length - 1),
    minPrice: summary.minPrice,
    maxPrice: summary.maxPrice,
    variantCount: summary.count,
    popular: Number(product?.popular || 0) || 0,
  };
}

function productDetail(product) {
  if (!product) return null;
  return {
    ...product,
    status: productStatus(product),
    hidden: productStatus(product) !== "published",
    categories: productCategories(product),
    collections: list(product.collections),
    holidays: list(product.holidays),
    tags: list(product.tags),
    types: list(product.types),
    sizes: list(product.sizes),
    materials: list(product.materials),
    images: imageRecordsForProduct(product),
    variants: variantRecordsForProduct(product),
  };
}

function facetBuckets(products) {
  const buckets = {
    categories: new Map(),
    collections: new Map(),
    holidays: new Map(),
    tags: new Map(),
    types: new Map(),
    sizes: new Map(),
    materials: new Map(),
    stock: new Map(),
  };
  const add = (bucket, values) => {
    list(values).forEach((value) => {
      const key = normalize(value);
      buckets[bucket].set(key, { value, count: (buckets[bucket].get(key)?.count || 0) + 1 });
    });
  };
  products.forEach((product) => {
    add("categories", productCategories(product));
    add("collections", product.collections);
    add("holidays", product.holidays);
    add("tags", product.tags);
    add("types", product.types);
    add("sizes", product.sizes);
    add("materials", product.materials);
    add("stock", product.stock);
  });
  return Object.fromEntries(
    Object.entries(buckets).map(([key, map]) => [
      key,
      [...map.values()].sort((a, b) => a.value.localeCompare(b.value, "ru", { sensitivity: "base", numeric: true })),
    ])
  );
}

function facetBucketsFromItems(items) {
  const buckets = Object.fromEntries(Object.values(FACET_BUCKETS).map((bucket) => [bucket, new Map()]));
  const add = (bucket, values) => {
    list(values).forEach((value) => {
      const key = normalize(value);
      buckets[bucket].set(key, { value, count: (buckets[bucket].get(key)?.count || 0) + 1 });
    });
  };
  items.forEach((item) => {
    Object.entries(FACET_BUCKETS).forEach(([group, bucket]) => add(bucket, item.filterValues[group]));
  });
  return Object.fromEntries(
    Object.entries(buckets).map(([key, map]) => [
      key,
      [...map.values()].sort((a, b) => a.value.localeCompare(b.value, "ru", { sensitivity: "base", numeric: true })),
    ])
  );
}

function facetBucketForGroup(items, group) {
  const map = new Map();
  items.forEach((item) => {
    list(item.filterValues[group]).forEach((value) => {
      const key = normalize(value);
      map.set(key, { value, count: (map.get(key)?.count || 0) + 1 });
    });
  });
  return [...map.values()].sort((a, b) => a.value.localeCompare(b.value, "ru", { sensitivity: "base", numeric: true }));
}

function filtersWithoutGroup(filters = {}, group) {
  return Object.fromEntries(
    Object.keys(FACET_BUCKETS).map((key) => [key, key === group ? [] : list(filters[key])])
  );
}

function facetOptionBuckets(scoredItems, filters = {}) {
  return Object.fromEntries(
    Object.entries(FACET_BUCKETS).map(([group, bucket]) => {
      const groupFilters = filtersWithoutGroup(filters, group);
      const items = scoredItems.filter((item) => productMatchesFilterIndex(item.filterIndex, groupFilters));
      return [bucket, facetBucketForGroup(items, group)];
    })
  );
}

function compareProducts(a, b, sort) {
  const aName = text(a.product.name);
  const bName = text(b.product.name);
  if (sort === "name") return aName.localeCompare(bName, "ru", { sensitivity: "base", numeric: true });
  if (sort === "sku") return text(a.product.baseSku).localeCompare(text(b.product.baseSku), "ru", { sensitivity: "base", numeric: true });
  if (sort === "price_asc") return a.summary.minPrice - b.summary.minPrice || aName.localeCompare(bName, "ru", { sensitivity: "base" });
  if (sort === "price_desc") return b.summary.maxPrice - a.summary.maxPrice || aName.localeCompare(bName, "ru", { sensitivity: "base" });
  if (sort === "popular") return (Number(b.product.popular || 0) || 0) - (Number(a.product.popular || 0) || 0) || aName.localeCompare(bName, "ru", { sensitivity: "base" });
  return b.score - a.score || (Number(b.product.popular || 0) || 0) - (Number(a.product.popular || 0) || 0) || aName.localeCompare(bName, "ru", { sensitivity: "base" });
}

function queryCatalog(products = [], options = {}) {
  const publicItems = publicProducts(products);
  const query = {
    q: text(options.q),
    filters: options.filters || {},
    minPrice: Number(options.minPrice || 0) || 0,
    maxPrice: Number(options.maxPrice || 0) || 0,
    sort: SORT_OPTIONS.has(options.sort) ? options.sort : "relevance",
    page: Math.max(1, Number(options.page || 1) || 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Number(options.pageSize || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE)),
    offset: Math.max(0, Number(options.offset || 0) || 0),
  };
  const needsVariantSummary =
    Boolean(query.q) ||
    Boolean(query.minPrice) ||
    Boolean(query.maxPrice) ||
    query.sort === "price_asc" ||
    query.sort === "price_desc";
  const scored = publicItems
    .map((product) => {
      const summary = needsVariantSummary ? variantSummary(product) : null;
      const score = query.q ? scoreProduct(product, query.q, summary.skus) : 1;
      const filterIndex = productFilterIndex(product);
      return { product, summary, score, filterIndex, filterValues: filterIndex.values };
    })
    .filter((item) => (!query.q ? true : item.score > 0))
    .filter((item) => !query.minPrice || item.summary.maxPrice >= query.minPrice)
    .filter((item) => !query.maxPrice || item.summary.minPrice <= query.maxPrice);

  const prepared = scored
    .filter((item) => productMatchesFilterIndex(item.filterIndex, query.filters))
    .sort((a, b) => compareProducts(a, b, query.sort));

  const offset = Math.min(query.offset, prepared.length);
  const pageItems = prepared.slice(offset, offset + query.pageSize);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems.map((item) => productCard(item.product, item.summary || variantSummary(item.product), item.filterValues)),
    total: prepared.length,
    facets: facetBucketsFromItems(prepared),
    facetOptions: facetOptionBuckets(scored, query.filters),
    pageInfo: {
      page: Math.floor(offset / query.pageSize) + 1,
      pageSize: query.pageSize,
      offset,
      total: prepared.length,
      totalPages: Math.max(1, Math.ceil(prepared.length / query.pageSize)),
      hasMore: nextOffset < prepared.length,
      nextCursor: nextOffset < prepared.length ? encodeCursor(nextOffset) : "",
    },
    applied: {
      q: query.q,
      filters: query.filters,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
    },
  };
}

function findProductDetail(products = [], lookup = {}) {
  const publicItems = publicProducts(products);
  const id = text(lookup.id);
  const baseSku = text(lookup.baseSku);
  const sku = skuKey(lookup.sku);
  const found = publicItems.find((product) => {
    if (id && text(product.id) === id) return true;
    if (baseSku && normalize(product.baseSku) === normalize(baseSku)) return true;
    if (sku && skuKey(product.baseSku) === sku) return true;
    if (sku && variantSummary(product).skus.some((variantSku) => skuKey(variantSku) === sku)) return true;
    return false;
  });
  return productDetail(found);
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  encodeCursor,
  findProductDetail,
  paramsToQuery,
  productCard,
  productDetail,
  publicProducts,
  queryCatalog,
};
