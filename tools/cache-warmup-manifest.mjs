const REPRESENTATIVE_CATEGORY = "%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B8";

export const PUBLIC_CACHE_WARMUP_PATHS = [
  { path: "/", kind: "html", label: "home" },
  { path: "/catalog.html", kind: "html", label: "catalog-home" },
  { path: `/catalog?category=${REPRESENTATIVE_CATEGORY}`, kind: "html", label: "catalog-category" },
  { path: "/business.html", kind: "html", label: "business" },
  { path: "/wholesale.html", kind: "html", label: "wholesale" },
  { path: "/delivery.html", kind: "html", label: "delivery" },
  { path: "/payment.html", kind: "html", label: "payment" },
  { path: "/contacts.html", kind: "html", label: "contacts" },
  { path: "/api/catalog-query?pageSize=1&sort=popular", kind: "public-api", label: "catalog-summary" },
  { path: "/api/catalog-query?pageSize=48&sort=popular", kind: "public-api", label: "catalog-listing" },
  { path: `/api/catalog-query?pageSize=48&sort=popular&category=${REPRESENTATIVE_CATEGORY}`, kind: "public-api", label: "catalog-category-api" },
  { path: "/api/price-list?format=json", kind: "public-api", label: "price-list-json" },
  { path: "/app.js", kind: "static", label: "app-js-fallback" },
  { path: "/styles.css", kind: "static", label: "styles-fallback" },
];

export const PRIVATE_CACHE_PROBE_PATHS = [
  { path: "/api/auth/me", label: "auth-me" },
  { path: "/api/orders", label: "orders" },
  { path: "/api/admin/catalog", label: "admin-catalog" },
  { path: "/api/admin/import-batches", label: "admin-imports" },
  { path: "/api/admin/prices", label: "admin-prices" },
  { path: "/api/admin/product-images", label: "admin-media" },
  { path: "/api/admin/users", label: "admin-users" },
];

export const CACHE_WARMUP_LIMITS = {
  maxDiscoveredVersionedAssets: 20,
  maxDiscoveredCatalogDetails: 1,
};
