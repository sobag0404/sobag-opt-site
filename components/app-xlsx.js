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

async function downloadRowsXlsx(rows, fileName, sheetName = "КП") {
  if (!(await ensureXlsxLibrary())) return false;
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
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
