(() => {
  function buttonLabel(text) {
    return String(text || "").trim().toLocaleUpperCase("ru-RU");
  }
  
  function phoneHref(value = "") {
    const prepared = String(value).replace(/[^\d+]/g, "");
    const digits = prepared.replace(/\D/g, "");
    return digits.length >= 10 ? `tel:${prepared}` : "contacts.html";
  }
  
  function formatPhoneNumber(value = "") {
    const raw = String(value || "").trim();
    let digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("8") && digits.length === 11) digits = `7${digits.slice(1)}`;
    if (digits.startsWith("7")) {
      const main = digits.slice(1, 11);
      let formatted = "+7";
      if (main.length) formatted += ` ${main.slice(0, 3)}`;
      if (main.length > 3) formatted += ` ${main.slice(3, 6)}`;
      if (main.length > 6) formatted += `-${main.slice(6, 8)}`;
      if (main.length > 8) formatted += `-${main.slice(8, 10)}`;
      if (main.length > 10) formatted += ` ${main.slice(10)}`;
      return formatted;
    }
    if (!raw.startsWith("+") && digits.length < 10) return raw;
    const countryLength = ["1", "7"].includes(digits[0]) ? 1 : digits.length > 11 ? 3 : digits.length > 10 ? 2 : 1;
    const country = digits.slice(0, countryLength);
    const groups = digits.slice(countryLength).match(/\d{1,3}/g) || [];
    return [`+${country}`, ...groups].join(" ");
  }
  
  function phoneDigits(value = "") {
    return String(value || "").replace(/\D/g, "");
  }
  
  function pluralRu(count, one, few, many) {
    const value = Math.abs(Number(count));
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }
  
  function productWord(count) {
    return pluralRu(count, "товар", "товара", "товаров");
  }
  
  function variantWord(count) {
    return pluralRu(count, "вариант", "варианта", "вариантов");
  }
  
  function reviewWord(count) {
    return pluralRu(count, "отзыв", "отзыва", "отзывов");
  }
  
  function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
  
  function splitList(value) {
    const prepared = String(value || "");
    const delimiter = prepared.includes(";") ? ";" : ",";
    return prepared
      .split(delimiter)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  
  function parseDelimitedText(text) {
    const delimiter = text.includes(";") ? ";" : ",";
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell.trim());
        if (row.some((value) => value)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some((value) => value)) rows.push(row);
    const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim());
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  }
  
  function normalizeBaseSku(value) {
    return String(value || "").trim();
  }
  
  function baseSkuKey(value) {
    return normalizeBaseSku(value).toLocaleUpperCase("ru-RU");
  }
  
  function csvCell(value) {
    const prepared = Array.isArray(value) ? value.join("; ") : value ?? "";
    return `"${String(prepared).replaceAll('"', '""')}"`;
  }
  
  function normalizeImportHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }
  
  function priceImportValue(row, candidates) {
    const entries = Object.entries(row);
    for (const candidate of candidates) {
      const wanted = normalizeImportHeader(candidate);
      const found = entries.find(([key]) => normalizeImportHeader(key) === wanted);
      if (found) return found[1];
    }
    return "";
  }

  window.SobagAppUtils = Object.freeze({
    buttonLabel,
    phoneHref,
    formatPhoneNumber,
    phoneDigits,
    pluralRu,
    productWord,
    variantWord,
    reviewWord,
    formatMoney,
    escapeHtml,
    splitList,
    parseDelimitedText,
    normalizeBaseSku,
    baseSkuKey,
    csvCell,
    normalizeImportHeader,
    priceImportValue
  });
})();
