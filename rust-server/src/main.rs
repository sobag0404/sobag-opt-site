use std::{collections::HashMap, env, net::SocketAddr, sync::Arc};

use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, StatusCode, Uri},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use tower_http::trace::TraceLayer;

const DEFAULT_PAGE_SIZE: i64 = 48;
const MAX_PAGE_SIZE: i64 = 120;
const FACET_GROUPS: &[(&str, &str, bool)] = &[
    ("category", "categories", true),
    ("collection", "collections", true),
    ("holiday", "holidays", true),
    ("tag", "tags", true),
    ("type", "types", true),
    ("size", "sizes", true),
    ("material", "materials", true),
    ("stock", "stock", false),
];
const FACET_BUCKET_KEYS: &[&str] = &[
    "categories",
    "collections",
    "holidays",
    "tags",
    "types",
    "sizes",
    "materials",
    "stock",
];

#[derive(Clone)]
struct AppState {
    pool: PgPool,
}

#[derive(Debug)]
struct AppError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl AppError {
    fn bad_request(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code,
            message: message.into(),
        }
    }

    fn not_found(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            code,
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            code: "rust_internal_error",
            message: message.into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({ "error": self.code, "message": self.message })),
        )
            .into_response()
    }
}

type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct CatalogQuery {
    q: String,
    filters: HashMap<&'static str, Vec<String>>,
    min_price: i64,
    max_price: i64,
    sort: String,
    page_size: i64,
    offset: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageMeta {
    url: String,
    storage_key: String,
    provider: String,
    width: Option<i64>,
    height: Option<i64>,
    mime: String,
    variants: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogCard {
    id: String,
    base_sku: String,
    name: String,
    category: String,
    categories: Vec<String>,
    collections: Vec<String>,
    holidays: Vec<String>,
    tags: Vec<String>,
    badge: String,
    description: String,
    stock: String,
    image: String,
    image_meta: Option<ImageMeta>,
    min_price: i64,
    max_price: i64,
    variant_count: i64,
    popular: i64,
}

#[derive(Serialize)]
struct FacetValue {
    value: String,
    count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PageInfo {
    page: i64,
    page_size: i64,
    offset: i64,
    total: i64,
    total_pages: i64,
    has_more: bool,
    next_cursor: String,
}

#[derive(Serialize)]
struct AppliedQuery {
    q: String,
    filters: HashMap<&'static str, Vec<String>>,
    #[serde(rename = "minPrice")]
    min_price: i64,
    #[serde(rename = "maxPrice")]
    max_price: i64,
    sort: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogResponse {
    items: Vec<CatalogCard>,
    total: i64,
    facets: HashMap<&'static str, Vec<FacetValue>>,
    facet_options: HashMap<&'static str, Vec<FacetValue>>,
    page_info: PageInfo,
    applied: AppliedQuery,
    updated_at: Option<String>,
    source: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Variant {
    id: String,
    product_id: String,
    base_sku: String,
    sku: String,
    #[serde(rename = "type")]
    variant_type: String,
    size: String,
    material: String,
    name: String,
    price: i64,
    price_source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProductImage {
    id: String,
    product_id: String,
    base_sku: String,
    role: String,
    source: String,
    url: String,
    storage_key: String,
    provider: String,
    width: Option<i64>,
    height: Option<i64>,
    mime: String,
    file_name: String,
    size: Option<i64>,
    etag: String,
    status: String,
    uploaded_at: String,
    variants: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProductDetail {
    id: String,
    base_sku: String,
    name: String,
    status: String,
    hidden: bool,
    category: String,
    categories: Vec<String>,
    collections: Vec<String>,
    holidays: Vec<String>,
    tags: Vec<String>,
    description: String,
    detail_description: String,
    base_price: i64,
    min_price: i64,
    max_price: i64,
    popular: i64,
    stock: String,
    variants: Vec<Variant>,
    images: Vec<ProductImage>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DetailResponse {
    product: ProductDetail,
    updated_at: Option<String>,
    source: &'static str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DetailLookup {
    id: Option<String>,
    base_sku: Option<String>,
    sku: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("sobag_opt_rust=info".parse()?),
        )
        .init();

    let database_url = env::var("SOBAG_CATALOG_DATABASE_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .or_else(|_| env::var("POSTGRES_URL"))
        .map_err(|_| "SOBAG_CATALOG_DATABASE_URL is required")?;
    let pool_size = env::var("SOBAG_CATALOG_DB_POOL_SIZE")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(2);
    let pool = PgPoolOptions::new()
        .max_connections(pool_size)
        .connect(&database_url)
        .await?;

    let state = Arc::new(AppState { pool });
    let app = Router::new()
        .route("/api/health-rust", get(health))
        .route("/api/catalog-query", get(catalog_query))
        .route("/api/catalog-detail", get(catalog_detail))
        .route("/rust/catalog-query", get(catalog_query))
        .route("/rust/catalog-detail", get(catalog_detail))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let bind = env::var("SOBAG_RUST_BIND").unwrap_or_else(|_| "127.0.0.1:3001".to_string());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    tracing::info!("sobag rust server listening on {}", bind);
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;
    Ok(())
}

async fn health(State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    sqlx::query("select 1")
        .execute(&state.pool)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(Json(
        json!({ "ok": true, "runtime": "rust", "catalogDb": { "enabled": true, "configured": true } }),
    ))
}

async fn catalog_query(
    State(state): State<Arc<AppState>>,
    uri: Uri,
) -> AppResult<(HeaderMap, Json<CatalogResponse>)> {
    let query = parse_catalog_query(uri.query().unwrap_or(""));
    let items = load_cards(&state.pool, &query).await?;
    let total = load_count(&state.pool, &query).await?;
    let facets = load_facets(&state.pool, &query, false).await?;
    let facet_options = load_facets(&state.pool, &query, true).await?;
    let next_offset = query.offset + items.len() as i64;
    let page_size = query.page_size;
    let page_info = PageInfo {
        page: query.offset / page_size + 1,
        page_size,
        offset: query.offset,
        total,
        total_pages: std::cmp::max(1, (total + page_size - 1) / page_size),
        has_more: next_offset < total,
        next_cursor: if next_offset < total {
            encode_cursor(next_offset)
        } else {
            String::new()
        },
    };
    let response = CatalogResponse {
        items,
        total,
        facets,
        facet_options,
        page_info,
        applied: AppliedQuery {
            q: query.q.clone(),
            filters: query.filters.clone(),
            min_price: query.min_price,
            max_price: query.max_price,
            sort: query.sort.clone(),
        },
        updated_at: None,
        source: "postgres",
    };
    Ok((cache_headers(), Json(response)))
}

async fn catalog_detail(
    State(state): State<Arc<AppState>>,
    Query(lookup): Query<DetailLookup>,
) -> AppResult<(HeaderMap, Json<DetailResponse>)> {
    let id = clean(lookup.id.unwrap_or_default());
    let base_sku = clean(lookup.base_sku.unwrap_or_default());
    let sku = clean(lookup.sku.unwrap_or_default());
    if id.is_empty() && base_sku.is_empty() && sku.is_empty() {
        return Err(AppError::bad_request(
            "missing_product_lookup",
            "Provide id, baseSku, or sku.",
        ));
    }

    let product = load_product_detail(&state.pool, &id, &base_sku, &sku).await?;
    let product =
        product.ok_or_else(|| AppError::not_found("product_not_found", "Product not found."))?;
    Ok((
        cache_headers(),
        Json(DetailResponse {
            product,
            updated_at: None,
            source: "postgres",
        }),
    ))
}

fn cache_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CACHE_CONTROL,
        "public, max-age=300, stale-while-revalidate=3600"
            .parse()
            .expect("valid cache-control"),
    );
    headers
}

fn clean(value: impl AsRef<str>) -> String {
    value.as_ref().trim().to_string()
}

fn parse_catalog_query(raw: &str) -> CatalogQuery {
    let mut values: HashMap<String, Vec<String>> = HashMap::new();
    for (key, value) in url::form_urlencoded::parse(raw.as_bytes()) {
        values
            .entry(key.into_owned())
            .or_default()
            .push(value.into_owned());
    }
    let page_size = clamp_i64(
        first(&values, &["pageSize", "limit"])
            .and_then(|value| value.parse().ok())
            .unwrap_or(DEFAULT_PAGE_SIZE),
        1,
        MAX_PAGE_SIZE,
    );
    let page = std::cmp::max(
        1,
        first(&values, &["page"])
            .and_then(|value| value.parse().ok())
            .unwrap_or(1),
    );
    let cursor_offset = first(&values, &["cursor"]).and_then(|value| decode_cursor(&value));
    let sort = match first(&values, &["sort"])
        .unwrap_or_else(|| "relevance".to_string())
        .as_str()
    {
        "name" | "price_asc" | "price_desc" | "sku" | "popular" => {
            first(&values, &["sort"]).unwrap_or_else(|| "relevance".to_string())
        }
        _ => "relevance".to_string(),
    };
    let mut filters: HashMap<&'static str, Vec<String>> = HashMap::new();
    for key in [
        "category",
        "collection",
        "holiday",
        "tag",
        "type",
        "size",
        "material",
        "stock",
    ] {
        filters.insert(key, values_for(&values, key));
    }
    CatalogQuery {
        q: first(&values, &["q", "query"])
            .unwrap_or_default()
            .trim()
            .to_string(),
        filters,
        min_price: first(&values, &["minPrice"])
            .and_then(|value| value.parse().ok())
            .unwrap_or(0),
        max_price: first(&values, &["maxPrice"])
            .and_then(|value| value.parse().ok())
            .unwrap_or(0),
        sort,
        page_size,
        offset: cursor_offset.unwrap_or((page - 1) * page_size).max(0),
    }
}

fn first(values: &HashMap<String, Vec<String>>, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        values
            .get(*key)
            .and_then(|items| items.first())
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty())
    })
}

fn values_for(values: &HashMap<String, Vec<String>>, key: &str) -> Vec<String> {
    let plural = match key {
        "category" => "categories".to_string(),
        "holiday" => "holidays".to_string(),
        _ => format!("{key}s"),
    };
    [key, plural.as_str()]
        .iter()
        .flat_map(|name| values.get(*name).into_iter().flatten())
        .flat_map(|value| split_list(value))
        .collect()
}

fn split_list(value: &str) -> Vec<String> {
    let separator = if value.contains(';') { ';' } else { ',' };
    value
        .split(separator)
        .map(clean)
        .filter(|item| !item.is_empty())
        .fold(Vec::<String>::new(), |mut acc, item| {
            if !acc
                .iter()
                .any(|existing| existing.eq_ignore_ascii_case(&item))
            {
                acc.push(item);
            }
            acc
        })
}

fn clamp_i64(value: i64, min: i64, max: i64) -> i64 {
    value.max(min).min(max)
}

fn encode_cursor(offset: i64) -> String {
    URL_SAFE_NO_PAD.encode(offset.max(0).to_string())
}

fn decode_cursor(value: &str) -> Option<i64> {
    let decoded = URL_SAFE_NO_PAD.decode(value).ok()?;
    let text = String::from_utf8(decoded).ok()?;
    let number = text.parse::<i64>().ok()?;
    (number >= 0).then_some(number)
}

fn sort_sql(sort: &str) -> &'static str {
    match sort {
        "popular" | "relevance" => "popular DESC, name ASC",
        "name" => "name ASC",
        "price_asc" => "min_price ASC, name ASC",
        "price_desc" => "max_price DESC, name ASC",
        "sku" => "base_sku ASC",
        _ => "popular DESC, name ASC",
    }
}

fn push_where<'a>(
    builder: &mut sqlx::QueryBuilder<'a, sqlx::Postgres>,
    query: &'a CatalogQuery,
    omit_group: Option<&str>,
) {
    let mut first_clause = true;
    let mut push_and = |builder: &mut sqlx::QueryBuilder<'a, sqlx::Postgres>| {
        if first_clause {
            builder.push(" WHERE ");
            first_clause = false;
        } else {
            builder.push(" AND ");
        }
    };

    if !query.q.is_empty() {
        let pattern = format!("%{}%", query.q);
        push_and(builder);
        builder
            .push("(base_sku ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR description ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR EXISTS (SELECT 1 FROM unnest(variant_skus) variant_sku WHERE variant_sku ILIKE ")
            .push_bind(pattern)
            .push("))");
    }

    for (key, column, _array) in [
        ("category", "categories", true),
        ("collection", "collections", true),
        ("holiday", "holidays", true),
        ("tag", "tags", true),
        ("type", "types", true),
        ("size", "sizes", true),
        ("material", "materials", true),
    ] {
        if omit_group == Some(key) {
            continue;
        }
        let selected = query.filters.get(key).cloned().unwrap_or_default();
        if selected.is_empty() {
            continue;
        }
        push_and(builder);
        builder
            .push(column)
            .push(" && ")
            .push_bind(selected)
            .push("::text[]");
    }

    if omit_group != Some("stock") {
        let selected = query.filters.get("stock").cloned().unwrap_or_default();
        if !selected.is_empty() {
            push_and(builder);
            builder
                .push("stock = ANY(")
                .push_bind(selected)
                .push("::text[])");
        }
    }

    if query.min_price > 0 {
        push_and(builder);
        builder.push("max_price >= ").push_bind(query.min_price);
    }
    if query.max_price > 0 {
        push_and(builder);
        builder.push("min_price <= ").push_bind(query.max_price);
    }
}

async fn load_cards(pool: &PgPool, query: &CatalogQuery) -> AppResult<Vec<CatalogCard>> {
    let mut builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT id, base_sku, name, description, stock, popular, min_price, max_price, variant_count, category, categories, collections, holidays, tags, image, image_meta FROM public_catalog_cards",
    );
    push_where(&mut builder, query, None);
    builder.push(" ORDER BY ").push(sort_sql(&query.sort));
    builder
        .push(" LIMIT ")
        .push_bind(query.page_size)
        .push(" OFFSET ")
        .push_bind(query.offset);
    let rows = builder
        .build()
        .fetch_all(pool)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    rows.into_iter().map(card_from_row).collect()
}

async fn load_count(pool: &PgPool, query: &CatalogQuery) -> AppResult<i64> {
    let mut builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT COUNT(*)::bigint AS total FROM public_catalog_cards",
    );
    push_where(&mut builder, query, None);
    let row = builder
        .build()
        .fetch_one(pool)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(row.try_get::<i64, _>("total").unwrap_or(0))
}

async fn load_facets(
    pool: &PgPool,
    query: &CatalogQuery,
    omit_filter_group: bool,
) -> AppResult<HashMap<&'static str, Vec<FacetValue>>> {
    let mut buckets: HashMap<&'static str, Vec<FacetValue>> = FACET_BUCKET_KEYS
        .iter()
        .map(|key| (*key, Vec::new()))
        .collect();
    for (group, column, array) in FACET_GROUPS {
        let mut builder = if *array {
            sqlx::QueryBuilder::<sqlx::Postgres>::new(format!("SELECT value, COUNT(*)::bigint AS count FROM (SELECT unnest({column}) AS value FROM public_catalog_cards"))
        } else {
            sqlx::QueryBuilder::<sqlx::Postgres>::new(format!("SELECT value, COUNT(*)::bigint AS count FROM (SELECT {column} AS value FROM public_catalog_cards"))
        };
        push_where(&mut builder, query, omit_filter_group.then_some(*group));
        builder.push(") facet_values WHERE value IS NOT NULL AND btrim(value) <> '' GROUP BY value ORDER BY value ASC");
        let rows = builder
            .build()
            .fetch_all(pool)
            .await
            .map_err(|error| AppError::internal(error.to_string()))?;
        let values = rows
            .into_iter()
            .filter_map(|row| {
                let value = row
                    .try_get::<String, _>("value")
                    .unwrap_or_default()
                    .trim()
                    .to_string();
                (!value.is_empty()).then(|| FacetValue {
                    value,
                    count: row.try_get::<i64, _>("count").unwrap_or(0),
                })
            })
            .collect::<Vec<_>>();
        let bucket = match *group {
            "category" => "categories",
            "collection" => "collections",
            "holiday" => "holidays",
            "tag" => "tags",
            "type" => "types",
            "size" => "sizes",
            "material" => "materials",
            "stock" => "stock",
            _ => *group,
        };
        buckets.insert(bucket, values);
    }
    Ok(buckets)
}

fn card_from_row(row: sqlx::postgres::PgRow) -> AppResult<CatalogCard> {
    let categories: Vec<String> = row.try_get("categories").unwrap_or_default();
    let image_meta =
        image_meta_from_value(row.try_get::<Option<Value>, _>("image_meta").ok().flatten());
    Ok(CatalogCard {
        id: row.try_get("id").unwrap_or_default(),
        base_sku: row.try_get("base_sku").unwrap_or_default(),
        name: row.try_get("name").unwrap_or_default(),
        category: row
            .try_get::<Option<String>, _>("category")
            .ok()
            .flatten()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| categories.first().cloned().unwrap_or_default()),
        categories,
        collections: row.try_get("collections").unwrap_or_default(),
        holidays: row.try_get("holidays").unwrap_or_default(),
        tags: row.try_get("tags").unwrap_or_default(),
        badge: String::new(),
        description: row.try_get("description").unwrap_or_default(),
        stock: row.try_get("stock").unwrap_or_default(),
        image: image_meta
            .as_ref()
            .map(|meta| meta.url.clone())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| row.try_get("image").unwrap_or_default()),
        image_meta,
        min_price: row.try_get("min_price").unwrap_or(0),
        max_price: row.try_get("max_price").unwrap_or(0),
        variant_count: row.try_get("variant_count").unwrap_or(0),
        popular: row.try_get("popular").unwrap_or(0),
    })
}

fn image_meta_from_value(value: Option<Value>) -> Option<ImageMeta> {
    let value = value?;
    let object = value.as_object()?;
    let url = object
        .get("url")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let storage_key = object
        .get("storageKey")
        .or_else(|| object.get("storage_key"))
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    if url.is_empty() && storage_key.is_empty() {
        return None;
    }
    Some(ImageMeta {
        url,
        storage_key,
        provider: object
            .get("provider")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        width: object.get("width").and_then(Value::as_i64),
        height: object.get("height").and_then(Value::as_i64),
        mime: object
            .get("mime")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        variants: object.get("variants").cloned().unwrap_or_else(|| json!([])),
    })
}

async fn load_product_detail(
    pool: &PgPool,
    id: &str,
    base_sku: &str,
    sku: &str,
) -> AppResult<Option<ProductDetail>> {
    let mut builder =
        sqlx::QueryBuilder::<sqlx::Postgres>::new("SELECT * FROM public_catalog_products WHERE ");
    let mut has_lookup = false;
    if !id.is_empty() {
        builder.push("(id = ").push_bind(id.to_string()).push(")");
        has_lookup = true;
    }
    if !base_sku.is_empty() {
        if has_lookup {
            builder.push(" OR ");
        }
        builder
            .push("(base_sku = ")
            .push_bind(base_sku.to_string())
            .push(")");
        has_lookup = true;
    }
    if !sku.is_empty() {
        if has_lookup {
            builder.push(" OR ");
        }
        builder
            .push("(base_sku = ")
            .push_bind(sku.to_string())
            .push(" OR base_sku IN (SELECT base_sku FROM variants WHERE sku = ")
            .push_bind(sku.to_string())
            .push("))");
    }
    builder.push(" LIMIT 1");
    let product_row = builder
        .build()
        .fetch_optional(pool)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let Some(product_row) = product_row else {
        return Ok(None);
    };
    let product_id: String = product_row.try_get("id").unwrap_or_default();
    let variants = load_variants(pool, &product_id).await?;
    let images = load_images(pool, &product_id).await?;
    let categories: Vec<String> = product_row.try_get("categories").unwrap_or_default();
    Ok(Some(ProductDetail {
        id: product_id,
        base_sku: product_row.try_get("base_sku").unwrap_or_default(),
        name: product_row.try_get("name").unwrap_or_default(),
        status: product_row
            .try_get("status")
            .unwrap_or_else(|_| "published".to_string()),
        hidden: false,
        category: categories.first().cloned().unwrap_or_default(),
        categories,
        collections: product_row.try_get("collections").unwrap_or_default(),
        holidays: product_row.try_get("holidays").unwrap_or_default(),
        tags: product_row.try_get("tags").unwrap_or_default(),
        description: product_row.try_get("description").unwrap_or_default(),
        detail_description: product_row
            .try_get("detail_description")
            .unwrap_or_default(),
        base_price: 0,
        min_price: product_row.try_get("min_price").unwrap_or(0),
        max_price: product_row.try_get("max_price").unwrap_or(0),
        popular: product_row.try_get("popular").unwrap_or(0),
        stock: product_row.try_get("stock").unwrap_or_default(),
        variants,
        images,
    }))
}

async fn load_variants(pool: &PgPool, product_id: &str) -> AppResult<Vec<Variant>> {
    let rows = sqlx::query("SELECT * FROM variants WHERE product_id = $1 ORDER BY sku ASC")
        .bind(product_id)
        .fetch_all(pool)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(rows
        .into_iter()
        .map(|row| Variant {
            id: row.try_get("id").unwrap_or_default(),
            product_id: row.try_get("product_id").unwrap_or_default(),
            base_sku: row.try_get("base_sku").unwrap_or_default(),
            sku: row.try_get("sku").unwrap_or_default(),
            variant_type: row.try_get("type").unwrap_or_default(),
            size: row.try_get("size").unwrap_or_default(),
            material: row.try_get("material").unwrap_or_default(),
            name: String::new(),
            price: row.try_get("price").unwrap_or(0),
            price_source: String::new(),
        })
        .filter(|variant| !variant.id.is_empty() && !variant.sku.is_empty())
        .collect())
}

async fn load_images(pool: &PgPool, product_id: &str) -> AppResult<Vec<ProductImage>> {
    let rows =
        sqlx::query("SELECT * FROM images WHERE product_id = $1 ORDER BY is_primary DESC, id ASC")
            .bind(product_id)
            .fetch_all(pool)
            .await
            .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(rows
        .into_iter()
        .map(|row| {
            let is_primary = row.try_get::<bool, _>("is_primary").unwrap_or(false);
            let payload = row
                .try_get::<Value, _>("payload")
                .unwrap_or_else(|_| json!({}));
            ProductImage {
                id: row.try_get("id").unwrap_or_default(),
                product_id: row.try_get("product_id").unwrap_or_default(),
                base_sku: String::new(),
                role: if is_primary { "main" } else { "gallery" }.to_string(),
                source: "postgres".to_string(),
                url: row.try_get("url").unwrap_or_default(),
                storage_key: row.try_get("storage_key").unwrap_or_default(),
                provider: row.try_get("provider").unwrap_or_default(),
                width: row
                    .try_get::<i64, _>("width")
                    .ok()
                    .filter(|value| *value > 0),
                height: row
                    .try_get::<i64, _>("height")
                    .ok()
                    .filter(|value| *value > 0),
                mime: row.try_get("mime").unwrap_or_default(),
                file_name: String::new(),
                size: None,
                etag: String::new(),
                status: "active".to_string(),
                uploaded_at: row
                    .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("uploaded_at")
                    .ok()
                    .flatten()
                    .map(|value| value.to_rfc3339())
                    .unwrap_or_default(),
                variants: payload
                    .get("variants")
                    .cloned()
                    .unwrap_or_else(|| json!([])),
            }
        })
        .filter(|image| {
            !image.id.is_empty() && (!image.url.is_empty() || !image.storage_key.is_empty())
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_roundtrip() {
        assert_eq!(decode_cursor(&encode_cursor(96)), Some(96));
        assert_eq!(decode_cursor("bad"), None);
    }

    #[test]
    fn parses_query_like_node() {
        let query = parse_catalog_query("q=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B0&pageSize=999&page=3&category=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B8&categories=%D0%9D%D0%B0%D0%B2%D0%BE%D0%BB%D0%BE%D1%87%D0%BA%D0%B8&sort=price_asc");
        assert_eq!(query.q, "Подушка");
        assert_eq!(query.page_size, MAX_PAGE_SIZE);
        assert_eq!(query.offset, 240);
        assert_eq!(query.filters.get("category").unwrap().len(), 2);
        assert_eq!(query.sort, "price_asc");
    }
}
