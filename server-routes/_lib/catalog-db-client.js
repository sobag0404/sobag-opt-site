let pool = null;

function text(value) {
  return String(value || "").trim();
}

function catalogDbEnabled(env = process.env) {
  return text(env.SOBAG_CATALOG_SOURCE).toLowerCase() === "postgres";
}

function catalogDbConnectionString(env = process.env) {
  return text(env.SOBAG_CATALOG_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL);
}

function catalogDbStatus(env = process.env) {
  return {
    enabled: catalogDbEnabled(env),
    configured: Boolean(catalogDbConnectionString(env)),
  };
}

function getCatalogDbClient(env = process.env) {
  if (!catalogDbEnabled(env)) return null;
  const connectionString = catalogDbConnectionString(env);
  if (!connectionString) {
    const error = new Error("PostgreSQL catalog source is enabled but not configured");
    error.code = "catalog_db_not_configured";
    throw error;
  }
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString,
      max: Number(env.SOBAG_CATALOG_DB_POOL_SIZE || 4) || 4,
      idleTimeoutMillis: Number(env.SOBAG_CATALOG_DB_IDLE_MS || 30000) || 30000,
      connectionTimeoutMillis: Number(env.SOBAG_CATALOG_DB_CONNECT_MS || 5000) || 5000,
    });
  }
  return pool;
}

module.exports = {
  catalogDbEnabled,
  catalogDbStatus,
  getCatalogDbClient,
};
