import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const PUBLIC_PAGES = [
  "index.html",
  "catalog.html",
  "search.html",
  "favorites.html",
  "custom.html",
  "business.html",
  "about.html",
  "contacts.html",
  "marketplaces.html",
  "cart.html",
  "terms.html",
  "assets/legal/personal-data-consent.html",
];

const REQUIRED_PAGES = ["catalog.html", "business.html", "about.html", "contacts.html", "marketplaces.html", "terms.html"];

const FORBIDDEN_COPY = [
  { pattern: /\btilda\b/iu, label: "old Tilda reference" },
  { pattern: /\blorem\b/iu, label: "lorem placeholder" },
  { pattern: /прототип/iu, label: "prototype copy" },
  { pattern: /тестов/iu, label: "test copy" },
  { pattern: /для\s+теста/iu, label: "test copy" },
  { pattern: /демо/iu, label: "demo copy" },
  { pattern: /заглуш/iu, label: "placeholder copy" },
  { pattern: /рыба/iu, label: "placeholder copy" },
  { pattern: /чернов(?:ой|ая|ое|ые)/iu, label: "draft copy" },
  { pattern: /шаблон/iu, label: "template copy" },
  { pattern: /нужно\s+уточнить/iu, label: "unfinished copy" },
  { pattern: /будут\s+(?:добавлены|внесены|уточнены)/iu, label: "unfinished copy" },
  { pattern: /Москва,\s*ул\.\s*Текстильщиков/iu, label: "unconfirmed address" },
  { pattern: /Новоданиловская\s+набережная/iu, label: "unconfirmed address" },
  { pattern: /\+7\s*900\s*000[-\s]?00[-\s]?00/iu, label: "fake phone" },
  { pattern: /opt@sobag-shop\.ru/iu, label: "old email" },
];

function readProjectFile(file) {
  return readFileSync(join(root, file), "utf8");
}

function stripHtmlNoise(text) {
  return String(text || "")
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/giu, " ")
    .replace(/data:image\/svg\+xml,[^"']+/giu, " ");
}

function lineForIndex(text, index) {
  return text.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function findForbidden(text, label, errors) {
  FORBIDDEN_COPY.forEach(({ pattern, label: reason }) => {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) errors.push(`${label}:${lineForIndex(text, match.index)} contains ${reason}`);
  });
}

function extractDefaultSiteContent(appText) {
  const start = appText.indexOf("const defaultSiteContent = {");
  const end = appText.indexOf("const siteTextFields =", start);
  if (start < 0 || end < 0) throw new Error("app.js: defaultSiteContent block not found");
  return appText.slice(start, end);
}

function countDescriptions(blockName, appText) {
  const start = appText.indexOf(`const ${blockName} = [`);
  const end = appText.indexOf("];", start);
  if (start < 0 || end < 0) return 0;
  return (appText.slice(start, end).match(/description:\s*"/g) || []).length;
}

function assertIncludes(text, needle, label, errors) {
  if (!text.includes(needle)) errors.push(`${label} must include ${needle}`);
}

function auditContent(files, appText) {
  const errors = [];

  REQUIRED_PAGES.forEach((file) => {
    if (!files[file]) errors.push(`missing required public page: ${file}`);
  });

  Object.entries(files).forEach(([file, text]) => {
    if (!/<meta\s+name=["']description["']/iu.test(text)) errors.push(`${file}: missing meta description`);
    findForbidden(stripHtmlNoise(text), file, errors);
  });

  const catalogHtml = files["catalog.html"] || "";
  const businessHtml = files["business.html"] || "";
  assertIncludes(catalogHtml, 'id="catalogSeoCopy"', "catalog.html", errors);
  assertIncludes(businessHtml, "data-faq-schema", "business.html", errors);

  const defaultContent = extractDefaultSiteContent(appText);
  findForbidden(defaultContent, "app.js defaultSiteContent", errors);
  assertIncludes(defaultContent, 'catalogBackButton: "В каталог"', "app.js defaultSiteContent", errors);

  [
    ["catalogCategories", 6],
    ["catalogCollections", 10],
    ["catalogHolidays", 6],
  ].forEach(([block, minimum]) => {
    const count = countDescriptions(block, appText);
    if (count < minimum) errors.push(`app.js ${block} needs at least ${minimum} SEO descriptions`);
  });

  if (errors.length) throw new Error(`SEO content audit failed:\n${errors.join("\n")}`);

  return {
    pages: Object.keys(files).length,
    categoryDescriptions: countDescriptions("catalogCategories", appText),
    collectionDescriptions: countDescriptions("catalogCollections", appText),
    holidayDescriptions: countDescriptions("catalogHolidays", appText),
  };
}

function selfTest() {
  const appText = `
const catalogCategories = [{ name: "Подушки", description: "Оптовые подушки" }, { name: "Пледы", description: "Оптовые пледы" }, { name: "Наволочки", description: "Оптовые наволочки" }, { name: "Мешки", description: "Оптовые мешки" }, { name: "Чехлы", description: "Оптовые чехлы" }, { name: "Шопперы", description: "Оптовые шопперы" }];
const catalogCollections = [{ description: "1" }, { description: "2" }, { description: "3" }, { description: "4" }, { description: "5" }, { description: "6" }, { description: "7" }, { description: "8" }, { description: "9" }, { description: "10" }];
const catalogHolidays = [{ description: "1" }, { description: "2" }, { description: "3" }, { description: "4" }, { description: "5" }, { description: "6" }];
const defaultSiteContent = {
  catalogBackButton: "В каталог",
  businessProductionText: "Срок запуска партии подтверждается менеджером.",
};
const siteTextFields = [];
`;
  const files = Object.fromEntries(
    REQUIRED_PAGES.map((file) => [
      file,
      '<!doctype html><html><head><meta name="description" content="Sobag Opt" /></head><body>Контент Sobag Opt</body></html>',
    ])
  );
  files["catalog.html"] = '<!doctype html><html><head><meta name="description" content="Sobag Opt" /></head><body><section id="catalogSeoCopy"></section></body></html>';
  files["business.html"] = '<!doctype html><html><head><meta name="description" content="Sobag Opt" /></head><body><section data-faq-schema>FAQ</section></body></html>';

  const good = auditContent(files, appText);
  if (good.pages !== REQUIRED_PAGES.length) throw new Error("self-test page count mismatch");

  let rejected = false;
  try {
    auditContent({ ...files, "about.html": files["about.html"].replace("Контент", "Тестовая витрина") }, appText);
  } catch (error) {
    rejected = /test copy/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject stale test copy");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("SEO content audit self-test passed");
    return;
  }

  const files = Object.fromEntries(
    PUBLIC_PAGES.filter((file) => existsSync(join(root, file))).map((file) => [file, readProjectFile(file)])
  );
  const summary = auditContent(files, readProjectFile("app.js"));
  console.log(
    `SEO content audit passed: ${summary.pages} pages, ${summary.categoryDescriptions} categories, ${summary.collectionDescriptions} collections, ${summary.holidayDescriptions} holidays`
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export { auditContent };
