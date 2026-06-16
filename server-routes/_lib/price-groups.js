const { variantRecordsForProduct } = require("./pim");

const PRICE_GROUP_COLUMNS = {
  group: ["Категория/группа", "Группа", "Ценовая группа", "priceGroup", "group", "category"],
  sku: ["Артикул", "Артикул варианта", "SKU", "sku", "variantSku"],
  price: ["Цена", "Базовая цена", "Новая цена", "price", "basePrice", "groupPrice"],
  promoPrice: ["Акция цена", "Акционная цена", "promoPrice", "salePrice"],
  promoActive: ["Акция активна", "promoActive", "saleActive"],
  promoStart: ["Акция с", "promoStart", "saleStart"],
  promoEnd: ["Акция до", "promoEnd", "saleEnd"],
};

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value).replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function skuKey(value) {
  return text(value).toLocaleUpperCase("ru-RU");
}

function groupKey(value) {
  return normalized(value);
}

function roundPrice(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? Math.round(number) : NaN;
}

function requirePositivePrice(value, field = "price") {
  const price = roundPrice(value);
  if (!Number.isFinite(price) || price <= 0) {
    const error = new Error(`${field} must be a positive number.`);
    error.code = "invalid_price";
    error.statusCode = 400;
    error.publicMessage = "Price must be a positive number.";
    throw error;
  }
  return price;
}

function isFormulaLike(value) {
  return /^[=+@]/.test(text(value));
}

function rejectFormulaLike(value, field) {
  if (!isFormulaLike(value)) return;
  const error = new Error(`${field} must not start with a spreadsheet formula marker.`);
  error.code = "formula_input_rejected";
  error.statusCode = 400;
  error.publicMessage = "Spreadsheet formulas are not accepted in price imports.";
  throw error;
}

function priceGroupName(product = {}, variant = {}) {
  const explicit = text(variant.priceGroup || product.priceGroup || product.priceGroupName);
  if (explicit) return explicit.replace(/\s+/g, " ");
  return [variant.type || product.name, variant.material, variant.size].map(text).filter(Boolean).join(" ").replace(/\s+/g, " ");
}

function promoFromPayload(payload = {}, options = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const price = roundPrice(source.promoPrice ?? source.salePrice ?? source.actionPrice ?? (options.allowPriceField ? source.price : undefined));
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    price,
    active: source.promoActive !== false && source.saleActive !== false && source.active !== false,
    startsAt: text(source.promoStart || source.saleStart || source.startsAt),
    endsAt: text(source.promoEnd || source.saleEnd || source.endsAt),
  };
}

function promoForProductVariant(product = {}, variant = {}) {
  const direct = promoFromPayload(variant);
  if (direct) return direct;
  const maps = [product.pricePromos, product.promoPrices, product.promos].filter((item) => item && typeof item === "object" && !Array.isArray(item));
  const keys = [variant.sku, priceGroupName(product, variant), groupKey(priceGroupName(product, variant))].map(text).filter(Boolean);
  for (const map of maps) {
    for (const key of keys) {
      const promo = promoFromPayload(map[key], { allowPriceField: true });
      if (promo) return promo;
    }
  }
  return null;
}

function promoIsActive(promo, now = new Date()) {
  if (!promo || promo.active === false) return false;
  const nowMs = now.getTime();
  const startMs = promo.startsAt ? Date.parse(promo.startsAt) : NaN;
  const endMs = promo.endsAt ? Date.parse(promo.endsAt) : NaN;
  if (Number.isFinite(startMs) && nowMs < startMs) return false;
  if (Number.isFinite(endMs) && nowMs > endMs) return false;
  return true;
}

function productVariantRecords(products = []) {
  return (Array.isArray(products) ? products : []).flatMap((product) =>
    variantRecordsForProduct(product).map((variant) => ({
      product,
      variant,
      group: priceGroupName(product, variant),
      promo: promoForProductVariant(product, variant),
    }))
  );
}

function modePrice(priceCounts) {
  return [...priceCounts.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0] || 0;
}

function collectPriceGroups(records = [], options = {}) {
  const groups = new Map();
  for (const record of records) {
    const price = requirePositivePrice(record.variant?.price, "variant price");
    const name = text(record.group || priceGroupName(record.product, record.variant));
    const key = groupKey(name);
    if (!key) continue;
    const group = groups.get(key) || {
      key,
      name,
      priceCounts: new Map(),
      skus: new Set(),
      productIds: new Set(),
      promoCounts: new Map(),
      promos: [],
    };
    group.priceCounts.set(price, (group.priceCounts.get(price) || 0) + 1);
    group.skus.add(text(record.variant?.sku));
    group.productIds.add(text(record.product?.id || record.variant?.productId));
    const promo = record.promo;
    if (promoIsActive(promo, options.now)) {
      group.promoCounts.set(promo.price, (group.promoCounts.get(promo.price) || 0) + 1);
      group.promos.push(promo);
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const price = modePrice(group.priceCounts);
      const promoPrice = modePrice(group.promoCounts);
      return {
        key: group.key,
        name: group.name,
        price,
        skuCount: group.skus.size,
        productCount: group.productIds.size,
        skus: [...group.skus].filter(Boolean).sort((a, b) => a.localeCompare(b, "ru", { numeric: true })),
        inconsistent: group.priceCounts.size > 1,
        prices: [...group.priceCounts.keys()].sort((a, b) => a - b),
        promoPrice: promoPrice || null,
        promoStartsAt: group.promos.find((promo) => promo.price === promoPrice)?.startsAt || "",
        promoEndsAt: group.promos.find((promo) => promo.price === promoPrice)?.endsAt || "",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ru", { sensitivity: "base", numeric: true }));
}

function collectPriceGroupsFromProducts(products, options = {}) {
  return collectPriceGroups(productVariantRecords(products), options);
}

function priceListRows(groups = []) {
  return groups.flatMap((group) => {
    const base = {
      type: "base",
      group: group.name,
      label: group.name,
      price: group.price,
      skuCount: group.skuCount,
      productCount: group.productCount,
      skus: group.skus.join(", "),
      promoStartsAt: "",
      promoEndsAt: "",
    };
    const rows = [base];
    if (group.promoPrice) {
      rows.push({
        type: "promo",
        group: group.name,
        label: `Акция ${group.name}`,
        price: group.promoPrice,
        skuCount: group.skuCount,
        productCount: group.productCount,
        skus: group.skus.join(", "),
        promoStartsAt: group.promoStartsAt,
        promoEndsAt: group.promoEndsAt,
      });
    }
    return rows;
  });
}

function csvCell(value) {
  const raw = String(value ?? "").replace(/[\r\n]+/g, " ");
  const safe = /^[=+@-]/.test(raw.trim()) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function priceListCsv(rows = priceListRows([])) {
  const output = [
    ["Категория/группа", "Цена", "Тип строки", "Артикулов", "Товаров", "SKU", "Акция с", "Акция до"],
    ...rows.map((row) => [row.label, row.price, row.type === "promo" ? "Акция" : "База", row.skuCount, row.productCount, row.skus, row.promoStartsAt, row.promoEndsAt]),
  ];
  return `\uFEFF${output.map((row) => row.map(csvCell).join(";")).join("\n")}\n`;
}

function valueByColumn(row, columns) {
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(row, column)) return row[column];
    const found = Object.keys(row).find((key) => normalized(key) === normalized(column));
    if (found) return row[found];
  }
  return "";
}

function parseBool(value, fallback = true) {
  const prepared = normalized(value);
  if (!prepared) return fallback;
  return !["0", "false", "no", "нет", "off", "inactive"].includes(prepared);
}

function rowsFromCsv(textValue) {
  const rows = String(textValue || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!rows.length) return [];
  const parseLine = (line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if ((char === ";" || char === ",") && !quoted) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  };
  const headers = parseLine(rows[0]).map(text);
  return rows.slice(1).map((line) => Object.fromEntries(parseLine(line).map((cell, index) => [headers[index] || `column_${index + 1}`, text(cell)])));
}

function indexRecords(records = []) {
  const bySku = new Map();
  const byGroup = new Map();
  records.forEach((record) => {
    const sku = skuKey(record.variant?.sku);
    if (sku) bySku.set(sku, record);
    const key = groupKey(record.group);
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(record);
  });
  return { bySku, byGroup };
}

function parsePriceImportRows(records = [], rows = []) {
  const { bySku, byGroup } = indexRecords(records);
  const changes = [];
  const errors = [];
  const seen = new Set();
  (Array.isArray(rows) ? rows : rowsFromCsv(rows)).forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const groupName = text(valueByColumn(row, PRICE_GROUP_COLUMNS.group));
      const sku = text(valueByColumn(row, PRICE_GROUP_COLUMNS.sku));
      rejectFormulaLike(groupName, "group");
      rejectFormulaLike(sku, "sku");
      const matched = sku ? [bySku.get(skuKey(sku))].filter(Boolean) : byGroup.get(groupKey(groupName)) || [];
      if (!matched.length) {
        errors.push({ row: rowNumber, error: "price_target_not_found", message: "Price group or SKU was not found." });
        return;
      }
      const priceRaw = valueByColumn(row, PRICE_GROUP_COLUMNS.price);
      const promoRaw = valueByColumn(row, PRICE_GROUP_COLUMNS.promoPrice);
      rejectFormulaLike(priceRaw, "price");
      rejectFormulaLike(promoRaw, "promoPrice");
      const targetKey = sku ? `sku:${skuKey(sku)}` : `group:${groupKey(groupName)}`;
      if (text(priceRaw)) {
        const newPrice = requirePositivePrice(priceRaw, "price");
        const key = `base:${targetKey}`;
        if (seen.has(key)) errors.push({ row: rowNumber, error: "duplicate_price_target", message: "Duplicate price target in import." });
        else {
          seen.add(key);
          changes.push({
            row: rowNumber,
            kind: sku ? "sku_price" : "group_price",
            target: sku || groupName,
            group: matched[0].group,
            skus: matched.map((item) => text(item.variant.sku)).filter(Boolean),
            productIds: [...new Set(matched.map((item) => text(item.product.id || item.variant.productId)).filter(Boolean))],
            oldPrices: [...new Set(matched.map((item) => requirePositivePrice(item.variant.price, "variant price")))].sort((a, b) => a - b),
            newPrice,
          });
        }
      }
      if (text(promoRaw)) {
        const promoPrice = requirePositivePrice(promoRaw, "promoPrice");
        const key = `promo:${targetKey}`;
        if (seen.has(key)) errors.push({ row: rowNumber, error: "duplicate_promo_target", message: "Duplicate promo target in import." });
        else {
          seen.add(key);
          changes.push({
            row: rowNumber,
            kind: sku ? "sku_promo" : "group_promo",
            target: sku || groupName,
            group: matched[0].group,
            skus: matched.map((item) => text(item.variant.sku)).filter(Boolean),
            productIds: [...new Set(matched.map((item) => text(item.product.id || item.variant.productId)).filter(Boolean))],
            promoPrice,
            promoActive: parseBool(valueByColumn(row, PRICE_GROUP_COLUMNS.promoActive), true),
            promoStartsAt: text(valueByColumn(row, PRICE_GROUP_COLUMNS.promoStart)),
            promoEndsAt: text(valueByColumn(row, PRICE_GROUP_COLUMNS.promoEnd)),
          });
        }
      }
      if (!text(priceRaw) && !text(promoRaw)) {
        errors.push({ row: rowNumber, error: "missing_price_value", message: "Provide price or promoPrice." });
      }
    } catch (error) {
      errors.push({ row: rowNumber, error: error.code || "invalid_price_row", message: error.publicMessage || error.message });
    }
  });
  return { changes, errors };
}

function applyPriceChangesToProducts(products = [], changes = []) {
  const nextProducts = JSON.parse(JSON.stringify(products));
  const records = productVariantRecords(nextProducts);
  const bySku = new Map(records.map((record) => [skuKey(record.variant.sku), record]));
  for (const change of changes) {
    for (const sku of change.skus || []) {
      const record = bySku.get(skuKey(sku));
      if (!record) continue;
      const product = record.product;
      if (change.kind.endsWith("_price")) {
        product.variantPrices = product.variantPrices && typeof product.variantPrices === "object" && !Array.isArray(product.variantPrices) ? product.variantPrices : {};
        product.variantPrices[record.variant.sku] = requirePositivePrice(change.newPrice, "price");
      }
      if (change.kind.endsWith("_promo")) {
        const key = groupKey(record.group);
        product.pricePromos = product.pricePromos && typeof product.pricePromos === "object" && !Array.isArray(product.pricePromos) ? product.pricePromos : {};
        product.pricePromos[key] = {
          price: requirePositivePrice(change.promoPrice, "promoPrice"),
          active: change.promoActive !== false,
          startsAt: text(change.promoStartsAt),
          endsAt: text(change.promoEndsAt),
        };
      }
    }
  }
  return nextProducts;
}

async function applyPriceChangesToDb(client, changes = []) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL price update needs a query(sql, params) client");
  const affectedProductIds = new Set();
  await client.query("BEGIN");
  try {
    for (const change of changes) {
      const skus = (change.skus || []).map(text).filter(Boolean);
      if (!skus.length) continue;
      (change.productIds || []).forEach((id) => affectedProductIds.add(id));
      if (change.kind.endsWith("_price")) {
        await client.query(
          "UPDATE variants SET price = $1, updated_at = now(), payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('priceGroup', $2) WHERE sku = ANY($3::text[])",
          [requirePositivePrice(change.newPrice, "price"), text(change.group), skus]
        );
      }
      if (change.kind.endsWith("_promo")) {
        await client.query(
          "UPDATE variants SET updated_at = now(), payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('promoPrice', $1, 'promoActive', $2, 'promoStart', $3, 'promoEnd', $4, 'priceGroup', $5) WHERE sku = ANY($6::text[])",
          [requirePositivePrice(change.promoPrice, "promoPrice"), change.promoActive !== false, text(change.promoStartsAt), text(change.promoEndsAt), text(change.group), skus]
        );
      }
    }
    const ids = [...affectedProductIds].filter(Boolean);
    if (ids.length) {
      await client.query(
        `UPDATE products p
           SET min_price = s.min_price, max_price = s.max_price, variant_count = s.variant_count, updated_at = now()
          FROM (
            SELECT product_id, MIN(price)::int AS min_price, MAX(price)::int AS max_price, COUNT(*)::int AS variant_count
            FROM variants
            WHERE product_id = ANY($1::text[]) AND price > 0
            GROUP BY product_id
          ) s
          WHERE p.id = s.product_id`,
        [ids]
      );
    }
    await client.query("COMMIT");
    return { updatedSkus: [...new Set(changes.flatMap((change) => change.skus || []))].length, updatedProducts: ids.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

module.exports = {
  applyPriceChangesToDb,
  applyPriceChangesToProducts,
  collectPriceGroups,
  collectPriceGroupsFromProducts,
  groupKey,
  parsePriceImportRows,
  priceGroupName,
  priceListCsv,
  priceListRows,
  productVariantRecords,
  requirePositivePrice,
  rowsFromCsv,
  skuKey,
};
