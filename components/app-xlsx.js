const XLSX_CDN_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
let xlsxLoadPromise = null;

function ensureXlsxLibrary() {
  if (window.XLSX) return Promise.resolve(true);
  if (!xlsxLoadPromise) {
    xlsxLoadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = XLSX_CDN_URL;
      script.defer = true;
      script.onload = () => resolve(Boolean(window.XLSX));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
  return xlsxLoadPromise;
}

function worksheetRange(rows) {
  const rowCount = Math.max(1, rows.length);
  const colCount = Math.max(1, ...rows.map((row) => row.length || 0));
  return XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowCount - 1, c: colCount - 1 } });
}

function worksheetRangeFrom(rows, startRow = 0) {
  const rowCount = Math.max(1, rows.length);
  const colCount = Math.max(1, ...rows.map((row) => row.length || 0));
  const safeStartRow = Math.min(Math.max(0, startRow), rowCount - 1);
  return XLSX.utils.encode_range({ s: { r: safeStartRow, c: 0 }, e: { r: rowCount - 1, c: colCount - 1 } });
}

function columnWidths(rows, preferred = []) {
  const colCount = Math.max(1, ...rows.map((row) => row.length || 0), preferred.length);
  return Array.from({ length: colCount }, (_, index) => {
    if (preferred[index]) return { wch: preferred[index] };
    const maxLength = rows.reduce((max, row) => Math.max(max, String(row[index] ?? "").length), 0);
    return { wch: Math.min(42, Math.max(12, maxLength + 2)) };
  });
}

function firstTableHeaderRow(rows) {
  const index = rows.findIndex((row) => Array.isArray(row) && row.length > 2);
  return index >= 0 ? index : 0;
}

function polishWorkbook(workbook, sheet, rows, options = {}) {
  const ref = worksheetRange(rows);
  const headerRow = Number.isInteger(options.headerRow) ? options.headerRow : firstTableHeaderRow(rows);
  const tableRef = worksheetRangeFrom(rows, headerRow);
  sheet["!ref"] = sheet["!ref"] || ref;
  sheet["!cols"] = columnWidths(rows, options.columns || []);
  if (rows.length > 1) sheet["!autofilter"] = { ref: tableRef };
  sheet["!freeze"] = {
    xSplit: 0,
    ySplit: Math.min(headerRow + 1, rows.length),
    topLeftCell: `A${Math.min(headerRow + 2, rows.length + 1)}`,
    activePane: "bottomLeft",
    state: "frozen",
  };
  workbook.Props = {
    ...(workbook.Props || {}),
    Title: options.title || fileNameTitle(options.fileName || ""),
    Subject: options.subject || "Экспорт Sobag Opt",
    Author: "Sobag Opt",
    CreatedDate: new Date(),
  };
}

function fileNameTitle(fileName) {
  return String(fileName || "Sobag export").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

async function downloadRowsXlsx(rows, fileName, sheetName = "КП", options = {}) {
  if (!(await ensureXlsxLibrary())) return false;
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  polishWorkbook(workbook, sheet, rows, { ...options, fileName });
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
  return true;
}

function downloadCsv(fileName, rows) {
  const csvCell = window.SobagAppUtils?.csvCell || ((value) => `"${String(value ?? "").replaceAll('"', '""')}"`);
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function readTabularFileRows(file, options = {}) {
  if (/\.csv$/i.test(file.name)) {
    return window.SobagAppUtils.parseDelimitedText(await file.text());
  }
  if (!(await ensureXlsxLibrary())) {
    options.onXlsxUnavailable?.();
    return [];
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
}
