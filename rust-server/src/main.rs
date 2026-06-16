use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    sync::{Arc, Mutex, OnceLock},
    time::{Duration, Instant},
};

use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::Utc;
use pbkdf2::pbkdf2_hmac;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use tower_http::trace::TraceLayer;

mod store;
use store::{
    delete_store_value as delete_file_store_value, load_store_value as load_file_store_value,
    save_store_value as save_file_store_value,
    save_store_value_with_ttl as save_file_store_value_with_ttl, session_store_key,
};
#[cfg(test)]
use store::{
    file_key_hex, file_store_path_for_key, file_store_unwrap_value, first_non_empty_value,
    normalized_store_provider, redis_del_command, redis_get_command, redis_result_to_value,
    redis_set_command, StoreProvider,
};

const SESSION_COOKIE: &str = "sobag_session";
const SESSION_TTL_SECONDS: i64 = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS: u32 = 310_000;
const PBKDF2_KEY_LEN: usize = 32;
const STORE_KEY: &str = "sobag:store:v1";
const CATALOG_KEY: &str = "sobag:catalog:v1";
const CONTENT_KEY: &str = "sobag:content:v1";
const IMPORT_BATCHES_KEY: &str = "sobag:import-batches:v1";
const AUTH_LOGIN_LIMIT: u32 = 8;
const AUTH_LOGIN_WINDOW_SECONDS: u64 = 5 * 60;
const AUTH_REGISTER_LIMIT: u32 = 6;
const AUTH_REGISTER_WINDOW_SECONDS: u64 = 10 * 60;
const AUTH_ROUTE_LIMIT: u32 = 120;
const AUTH_ROUTE_WINDOW_SECONDS: u64 = 60;
const DEFAULT_PAGE_SIZE: i64 = 48;
const MAX_PAGE_SIZE: i64 = 120;
const MAX_CART_LINES: usize = 500;
const MAX_FAVORITES: usize = 5000;
const MAX_SAVED_CARTS: usize = 50;
const MAX_REVIEWS: usize = 5000;
const MIN_ORDER_TOTAL: i64 = 30_000;
const BASKET_DISCOUNT_TIERS: &[(i64, i64)] =
    &[(30_000, 5), (70_000, 7), (150_000, 12), (300_000, 18)];
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

#[derive(Clone, Copy)]
struct RateBucket {
    count: u32,
    reset_at: Instant,
}

static AUTH_RATE_LIMITS: OnceLock<Mutex<HashMap<String, RateBucket>>> = OnceLock::new();

#[derive(Clone)]
struct AppState {
    pool: PgPool,
}

#[derive(Clone, Copy)]
struct ContentPageSpec {
    slug: &'static str,
    title_key: &'static str,
    lead_key: &'static str,
    text_key: &'static str,
    default_title: &'static str,
    default_lead: &'static str,
    default_text: &'static str,
}

const CONTENT_PAGES: &[ContentPageSpec] = &[
    ContentPageSpec {
        slug: "about",
        title_key: "aboutPageTitle",
        lead_key: "aboutPageLead",
        text_key: "aboutPageText",
        default_title: "О компании Sobag Opt",
        default_lead: "Sobag Opt — B2B-каталог для оптовых продаж текстиля с принтами и заказов на производство под макет покупателя.",
        default_text: "Мы работаем с магазинами, селлерами и корпоративными клиентами: помогаем подобрать товар, собрать партию, рассчитать скидку, подготовить упаковку и передать заказ в производство.",
    },
    ContentPageSpec {
        slug: "business",
        title_key: "businessPageTitle",
        lead_key: "businessPageLead",
        text_key: "businessMinimumText",
        default_title: "Условия для бизнеса",
        default_lead: "Условия для магазинов, селлеров и корпоративных клиентов: скидка от суммы заказа, производство в одном месте и сопровождение менеджера.",
        default_text: "Минимальная сумма для оформления оптовой заявки — 30 000 ₽. До этой суммы товары можно добавлять в корзину, сохранять подборку и готовить заказ к отправке менеджеру.",
    },
    ContentPageSpec {
        slug: "marketplaces",
        title_key: "marketplacesTitle",
        lead_key: "marketplacesText",
        text_key: "marketplaceOneText",
        default_title: "Мы на маркетплейсах",
        default_lead: "Готовые товары Sobag можно смотреть на витринах маркетплейсов, а оптовые партии и индивидуальные принты оформлять через этот сайт.",
        default_text: "Витрины подходят для просмотра части готового ассортимента Sobag.",
    },
    ContentPageSpec {
        slug: "contacts",
        title_key: "contactsPageTitle",
        lead_key: "contactsPageLead",
        text_key: "contactsSchedule",
        default_title: "Контакты",
        default_lead: "Свяжитесь с отделом опта, чтобы уточнить наличие, сроки запуска партии, упаковку, отгрузку и документы.",
        default_text: "Пн-Пт, 10:00-18:00 по Москве",
    },
    ContentPageSpec {
        slug: "how-to-order",
        title_key: "howToOrderPageTitle",
        lead_key: "howToOrderPageLead",
        text_key: "howToOrderPageText",
        default_title: "Как оформить заказ",
        default_lead: "Покупатель собирает товары в корзину, проверяет скидку и отправляет заявку менеджеру.",
        default_text: "Добавьте нужные варианты товара, перейдите в корзину, заполните контакты и отправьте заказ. Менеджер проверит наличие, сроки, упаковку, документы и подтвердит финальные условия.",
    },
    ContentPageSpec {
        slug: "delivery",
        title_key: "deliveryPageTitle",
        lead_key: "deliveryPageLead",
        text_key: "deliveryPageText",
        default_title: "Доставка товара",
        default_lead: "Способ доставки и город отгрузки согласуются после проверки оптовой заявки.",
        default_text: "Доставка рассчитывается после подтверждения состава заказа, веса, объема и требований к упаковке. Возможны самовывоз, транспортная компания или индивидуальная схема отгрузки.",
    },
    ContentPageSpec {
        slug: "payment",
        title_key: "paymentPageTitle",
        lead_key: "paymentPageLead",
        text_key: "paymentPageText",
        default_title: "Оплата товара",
        default_lead: "Оплата фиксируется после согласования заказа, счета и реквизитов.",
        default_text: "Для юридических лиц и ИП возможна оплата по счету. Финальный порядок оплаты, резерв товара и документы подтверждает менеджер перед запуском партии.",
    },
    ContentPageSpec {
        slug: "returns",
        title_key: "returnsPageTitle",
        lead_key: "returnsPageLead",
        text_key: "returnsPageText",
        default_title: "Возврат товара",
        default_lead: "Вопросы возврата и претензий решаются по согласованным условиям заказа.",
        default_text: "Если в партии есть расхождения по количеству, комплектности или качеству, зафиксируйте их фото и описанием. Менеджер проверит обращение и предложит решение.",
    },
    ContentPageSpec {
        slug: "seller-support",
        title_key: "sellerSupportPageTitle",
        lead_key: "sellerSupportPageLead",
        text_key: "sellerSupportPageText",
        default_title: "Поддержка селлеров",
        default_lead: "Помощь с упаковкой, маркировкой и подготовкой партий для маркетплейсов.",
        default_text: "Можно согласовать штрихкоды, упаковку, комплектацию, маркировку и требования площадок. Детали фиксируются до запуска партии в производство.",
    },
    ContentPageSpec {
        slug: "wholesale",
        title_key: "wholesalePageTitle",
        lead_key: "wholesalePageLead",
        text_key: "wholesalePageText",
        default_title: "Оптовые партии",
        default_lead: "Партии собираются из готовых позиций и изделий под макет клиента.",
        default_text: "Оптовая партия может включать разные изделия, размеры, материалы и принты. Скидка зависит от суммы корзины, а сроки запуска подтверждаются после проверки состава заказа.",
    },
];

#[cfg(test)]
mod ssr_tests;

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

    fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            code: "unauthorized",
            message: message.into(),
        }
    }

    fn unauthorized_code(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            code,
            message: message.into(),
        }
    }

    fn forbidden(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            code: "forbidden",
            message: message.into(),
        }
    }

    fn forbidden_code(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            code,
            message: message.into(),
        }
    }

    fn conflict(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::CONFLICT,
            code,
            message: message.into(),
        }
    }

    fn rate_limited(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::TOO_MANY_REQUESTS,
            code: "rate_limited",
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
        if self.status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = %self.message, "rust_internal_error");
        }
        let message = if self.status == StatusCode::INTERNAL_SERVER_ERROR {
            "Internal server error."
        } else {
            &self.message
        };
        (
            self.status,
            Json(json!({ "error": self.code, "message": message })),
        )
            .into_response()
    }
}

type AppResult<T> = Result<T, AppError>;

fn row_i64(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return value;
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return i64::from(value);
    }
    if let Ok(value) = row.try_get::<i16, _>(column) {
        return i64::from(value);
    }
    if let Ok(value) = row.try_get::<f64, _>(column) {
        return value.round() as i64;
    }
    if let Ok(value) = row.try_get::<f32, _>(column) {
        return f64::from(value).round() as i64;
    }
    if let Ok(value) = row.try_get::<String, _>(column) {
        return value
            .trim()
            .replace(',', ".")
            .parse::<f64>()
            .unwrap_or(0.0)
            .round() as i64;
    }
    0
}

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
        .route("/rust/catalog", get(catalog_page))
        .route("/rust/search", get(search_page))
        .route("/rust/catalog-fragment", get(catalog_fragment))
        .route("/rust/search-fragment", get(catalog_fragment))
        .route("/rust/product", get(product_page))
        .route("/rust/product-fragment", get(product_fragment))
        .route("/catalog", get(catalog_page))
        .route("/search", get(search_page))
        .route("/catalog-fragment", get(catalog_fragment))
        .route("/search-fragment", get(catalog_fragment))
        .route("/product", get(product_page))
        .route("/product-fragment", get(product_fragment))
        .route("/rust/pages/:slug", get(content_page))
        .route("/about", get(content_page_alias))
        .route("/business", get(content_page_alias))
        .route("/marketplaces", get(content_page_alias))
        .route("/contacts", get(content_page_alias))
        .route("/how-to-order", get(content_page_alias))
        .route("/delivery", get(content_page_alias))
        .route("/payment", get(content_page_alias))
        .route("/returns", get(content_page_alias))
        .route("/seller-support", get(content_page_alias))
        .route("/wholesale", get(content_page_alias))
        .route(
            "/rust/auth/me",
            get(auth_me_preview).put(auth_me_update_preview),
        )
        .route("/rust/auth/login", post(auth_login_preview))
        .route("/rust/auth/register", post(auth_register_preview))
        .route("/rust/auth/logout", post(auth_logout_preview))
        .route(
            "/rust/orders",
            post(order_create_preview).patch(order_patch_preview),
        )
        .route("/rust/briefs", post(brief_create_preview))
        .route(
            "/rust/admin/orders",
            get(admin_orders_preview).patch(admin_orders_patch_preview),
        )
        .route(
            "/rust/admin/users",
            get(admin_users_preview)
                .post(admin_users_invite_preview)
                .patch(admin_users_role_patch_preview)
                .delete(admin_users_delete_preview),
        )
        .route(
            "/rust/admin/content",
            get(admin_content_preview)
                .put(admin_content_update_preview)
                .patch(admin_content_review_patch_preview),
        )
        .route("/rust/admin/pim", get(admin_pim_preview))
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

async fn catalog_page(
    State(state): State<Arc<AppState>>,
    uri: Uri,
) -> AppResult<(HeaderMap, Html<String>)> {
    let routes = routes_for_path(uri.path());
    render_listing_page(state, uri, "Каталог", routes.catalog_fragment_path, routes).await
}

async fn search_page(
    State(state): State<Arc<AppState>>,
    uri: Uri,
) -> AppResult<(HeaderMap, Html<String>)> {
    let routes = routes_for_path(uri.path());
    render_listing_page(state, uri, "Поиск", routes.search_fragment_path, routes).await
}

async fn catalog_fragment(
    State(state): State<Arc<AppState>>,
    uri: Uri,
) -> AppResult<(HeaderMap, Html<String>)> {
    let routes = routes_for_path(uri.path());
    let fragment_path = if uri.path().contains("search-fragment") {
        routes.search_fragment_path
    } else {
        routes.catalog_fragment_path
    };
    let query = parse_catalog_query(uri.query().unwrap_or(""));
    let page = load_listing(&state.pool, &query).await?;
    Ok((
        cache_headers(),
        Html(render_listing_fragment_with_routes(
            fragment_path,
            routes,
            &query,
            &page,
        )),
    ))
}

async fn product_page(
    State(state): State<Arc<AppState>>,
    uri: Uri,
    Query(lookup): Query<DetailLookup>,
) -> AppResult<(HeaderMap, Html<String>)> {
    let routes = routes_for_path(uri.path());
    let product = lookup_product(&state.pool, lookup).await?;
    let related = load_related_cards(&state.pool, &product, 4).await?;
    let body = format!(
        "{}{}{}",
        render_page_head_with_routes(&product.name, routes),
        render_product_fragment_with_routes(&product, &related, routes),
        render_page_foot()
    );
    Ok((cache_headers(), Html(body)))
}

async fn product_fragment(
    State(state): State<Arc<AppState>>,
    uri: Uri,
    Query(lookup): Query<DetailLookup>,
) -> AppResult<(HeaderMap, Html<String>)> {
    let routes = routes_for_path(uri.path());
    let product = lookup_product(&state.pool, lookup).await?;
    let related = load_related_cards(&state.pool, &product, 4).await?;
    Ok((
        cache_headers(),
        Html(render_product_fragment_with_routes(
            &product, &related, routes,
        )),
    ))
}

async fn content_page(Path(slug): Path<String>, uri: Uri) -> AppResult<(HeaderMap, Html<String>)> {
    render_content_page_response(&slug, routes_for_path(uri.path())).await
}

async fn content_page_alias(uri: Uri) -> AppResult<(HeaderMap, Html<String>)> {
    let slug = uri.path().trim_start_matches('/');
    render_content_page_response(slug, routes_for_path(uri.path())).await
}

async fn render_content_page_response(
    slug: &str,
    routes: &RenderRoutes,
) -> AppResult<(HeaderMap, Html<String>)> {
    let spec = content_page_spec(slug)
        .ok_or_else(|| AppError::not_found("content_page_not_found", "Content page not found."))?;
    let content = load_site_content().await.unwrap_or(Value::Null);
    let body = format!(
        "{}{}{}",
        render_page_head_with_routes(spec.default_title, routes),
        render_content_page_with_routes(spec, &content, routes),
        render_page_foot()
    );
    Ok((cache_headers(), Html(body)))
}

async fn auth_me_preview(headers: HeaderMap) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let payload = load_auth_me_from_file_store(cookie_header)
        .await
        .unwrap_or_else(|_| json!({ "user": null }));
    Ok((no_store_headers(), Json(payload)))
}

fn auth_request_ip(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .or_else(|| headers.get("x-real-ip"))
        .and_then(|value| value.to_str().ok())
        .unwrap_or("unknown")
        .split(',')
        .next()
        .unwrap_or("unknown")
        .trim()
        .chars()
        .take(80)
        .collect()
}

fn auth_rate_limit(
    headers: &HeaderMap,
    key: &str,
    limit: u32,
    window_seconds: u64,
) -> AppResult<()> {
    let now = Instant::now();
    let bucket_key = format!("{key}:{}", auth_request_ip(headers));
    let mut buckets = AUTH_RATE_LIMITS
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .map_err(|_| AppError::internal("auth rate limiter lock failed"))?;
    let bucket = buckets.entry(bucket_key).or_insert(RateBucket {
        count: 0,
        reset_at: now + Duration::from_secs(window_seconds),
    });
    if bucket.reset_at <= now {
        *bucket = RateBucket {
            count: 0,
            reset_at: now + Duration::from_secs(window_seconds),
        };
    }
    bucket.count = bucket.count.saturating_add(1);
    if bucket.count > limit {
        return Err(AppError::rate_limited(
            "Too many requests. Try again later.",
        ));
    }
    Ok(())
}

fn auth_host_origin(headers: &HeaderMap) -> Option<(String, String, bool)> {
    let host = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("localhost")
        .trim()
        .to_ascii_lowercase();
    let hostname = host.split(':').next().unwrap_or("").to_ascii_lowercase();
    let local = matches!(hostname.as_str(), "localhost" | "127.0.0.1" | "::1");
    let proto = headers
        .get("x-forwarded-proto")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(if local { "http" } else { "https" })
        .split(',')
        .next()
        .unwrap_or(if local { "http" } else { "https" })
        .trim()
        .to_ascii_lowercase();
    if host.is_empty() || proto.is_empty() {
        return None;
    }
    Some((proto, host, local))
}

fn auth_source_origin(headers: &HeaderMap) -> Option<(String, String)> {
    let value = headers
        .get(header::ORIGIN)
        .or_else(|| headers.get(header::REFERER))
        .and_then(|value| value.to_str().ok())?
        .trim();
    if value.is_empty() {
        return None;
    }
    let parsed = url::Url::parse(value).ok()?;
    let host = parsed.host_str()?.to_ascii_lowercase();
    let port = parsed
        .port()
        .map(|port| format!(":{port}"))
        .unwrap_or_default();
    Some((
        parsed.scheme().to_ascii_lowercase(),
        format!("{host}{port}"),
    ))
}

fn has_session_cookie_header(headers: &HeaderMap) -> bool {
    headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .split(';')
        .filter_map(|part| part.trim().split_once('='))
        .any(|(key, _)| key.trim() == SESSION_COOKIE)
}

fn enforce_auth_same_origin_for_cookie_mutation(headers: &HeaderMap) -> AppResult<()> {
    if !has_session_cookie_header(headers) {
        return Ok(());
    }
    let Some((expected_proto, expected_host, local)) = auth_host_origin(headers) else {
        return Err(AppError::forbidden_code(
            "csrf_origin_forbidden",
            "Cross-origin request is not allowed.",
        ));
    };
    let Some((source_proto, source_host)) = auth_source_origin(headers) else {
        if local {
            return Ok(());
        }
        return Err(AppError::forbidden_code(
            "csrf_origin_forbidden",
            "Cross-origin request is not allowed.",
        ));
    };
    if source_proto == expected_proto && source_host == expected_host {
        Ok(())
    } else {
        Err(AppError::forbidden_code(
            "csrf_origin_forbidden",
            "Cross-origin request is not allowed.",
        ))
    }
}

async fn auth_login_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    enforce_auth_same_origin_for_cookie_mutation(&headers)?;
    let store = load_file_store_value(STORE_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(default_store_value);
    let login =
        clean_text(data.get("login").or_else(|| data.get("email")), 180).unwrap_or_default();
    auth_rate_limit(
        &headers,
        &format!("auth:login:{}", normalize_email(&login)),
        AUTH_LOGIN_LIMIT,
        AUTH_LOGIN_WINDOW_SECONDS,
    )?;
    let password = data.get("password").and_then(Value::as_str).unwrap_or("");
    let Some((email, user)) = find_login_user(&store, &login) else {
        return Err(AppError::unauthorized_code(
            "invalid_credentials",
            "Проверьте логин и пароль.",
        ));
    };
    if !verify_user_password(password, &user) {
        return Err(AppError::unauthorized_code(
            "invalid_credentials",
            "Проверьте логин и пароль.",
        ));
    }
    let token = preview_session_token(&email)?;
    save_file_store_value_with_ttl(
        &session_store_key(&token),
        &json!({ "email": email, "createdAt": Utc::now().to_rfc3339() }),
        SESSION_TTL_SECONDS,
    )
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    let mut headers = no_store_headers();
    headers.insert(
        header::SET_COOKIE,
        session_cookie_header(&token)
            .parse()
            .expect("valid set-cookie"),
    );
    Ok((
        StatusCode::OK,
        headers,
        Json(json!({ "user": public_user_value(&user) })),
    ))
}

async fn auth_register_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    enforce_auth_same_origin_for_cookie_mutation(&headers)?;
    let mut store = load_file_store_value(STORE_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(default_store_value);
    let email = normalize_email(&clean_text(data.get("email"), 180).unwrap_or_default());
    auth_rate_limit(
        &headers,
        &format!("auth:register:{email}"),
        AUTH_REGISTER_LIMIT,
        AUTH_REGISTER_WINDOW_SECONDS,
    )?;
    let password = data.get("password").and_then(Value::as_str).unwrap_or("");
    let name = clean_text(data.get("name"), 120).unwrap_or_default();
    let phone = normalize_phone(&clean_text(data.get("phone"), 180).unwrap_or_default());
    if !is_valid_email(&email) {
        return Err(AppError::bad_request("invalid_email", "Проверьте email."));
    }
    if is_reserved_bootstrap_email(&email) {
        return Err(AppError::conflict(
            "reserved_email",
            "Reserved administrator email.",
        ));
    }
    if password.len() < 6 {
        return Err(AppError::bad_request(
            "weak_password",
            "Пароль должен быть не короче 6 символов.",
        ));
    }
    if name.is_empty() || phone.is_empty() {
        return Err(AppError::bad_request(
            "missing_profile",
            "Укажите имя и телефон.",
        ));
    }
    if !data
        .get("personalDataConsent")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        return Err(AppError::bad_request(
            "missing_consent",
            "Подтвердите согласие на обработку персональных данных.",
        ));
    }

    let users = ensure_store_users_mut(&mut store);
    if users
        .get(&email)
        .and_then(|user| user.get("passwordHash"))
        .is_some()
    {
        return Err(AppError::conflict(
            "email_exists",
            "Этот email уже зарегистрирован в системе.",
        ));
    }
    let now = Utc::now().to_rfc3339();
    let mut user = users
        .get(&email)
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let password_data = hash_password_preview(password, &email);
    user.insert("email".to_string(), json!(email));
    user.insert("name".to_string(), json!(name));
    user.insert("phone".to_string(), json!(phone));
    user.insert(
        "role".to_string(),
        users
            .get(&email)
            .and_then(|user| string_field(user, "role"))
            .map(Value::String)
            .unwrap_or_else(|| json!("buyer")),
    );
    let created_at = now.clone();
    user.entry("createdAt".to_string())
        .or_insert_with(|| json!(created_at));
    user.insert("updatedAt".to_string(), json!(now));
    user.insert("personalDataConsent".to_string(), json!(true));
    user.insert("consentAt".to_string(), json!(Utc::now().to_rfc3339()));
    user.insert(
        "consentTextVersion".to_string(),
        json!("personal-data-consent-2026-05-29"),
    );
    user.insert("passwordHash".to_string(), json!(password_data.0));
    user.insert("passwordSalt".to_string(), json!(password_data.1));
    let user_value = Value::Object(user);
    users.insert(email.clone(), user_value.clone());
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;

    let token = preview_session_token(&email)?;
    save_file_store_value_with_ttl(
        &session_store_key(&token),
        &json!({ "email": email, "createdAt": Utc::now().to_rfc3339() }),
        SESSION_TTL_SECONDS,
    )
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    let mut headers = no_store_headers();
    headers.insert(
        header::SET_COOKIE,
        session_cookie_header(&token)
            .parse()
            .expect("valid set-cookie"),
    );
    Ok((
        StatusCode::CREATED,
        headers,
        Json(json!({ "user": public_user_value(&user_value) })),
    ))
}

async fn auth_logout_preview(headers: HeaderMap) -> AppResult<(HeaderMap, Json<Value>)> {
    enforce_auth_same_origin_for_cookie_mutation(&headers)?;
    auth_rate_limit(
        &headers,
        "auth:logout",
        AUTH_ROUTE_LIMIT,
        AUTH_ROUTE_WINDOW_SECONDS,
    )?;
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    if let Some(token) = parse_cookie_value(cookie_header, SESSION_COOKIE) {
        delete_file_store_value(&session_store_key(&token))
            .await
            .map_err(|error| AppError::internal(error.to_string()))?;
    }
    let mut headers = no_store_headers();
    headers.insert(
        header::SET_COOKIE,
        expired_session_cookie_header()
            .parse()
            .expect("valid set-cookie"),
    );
    Ok((headers, Json(json!({ "ok": true }))))
}

async fn auth_me_update_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((mut store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    let email = string_field(&user, "email").unwrap_or_default();
    if email.is_empty() {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    }
    if has_object_key(&data, "cartItems") {
        set_store_nested_items(
            &mut store,
            "carts",
            &email,
            sanitize_cart_items(data.get("cartItems").unwrap_or(&Value::Null)),
        );
    }
    if has_object_key(&data, "favoriteItems") {
        set_store_nested_items(
            &mut store,
            "favorites",
            &email,
            sanitize_favorite_items(data.get("favoriteItems").unwrap_or(&Value::Null)),
        );
    }
    if has_object_key(&data, "savedCarts") {
        set_store_nested_items(
            &mut store,
            "savedCarts",
            &email,
            sanitize_saved_carts_input(
                data.get("savedCarts").unwrap_or(&Value::Null),
                can_use_internal_saved_cart_fields(&user),
            ),
        );
    }
    if let Some(profile) = data.get("profile").filter(|value| value.is_object()) {
        let profile = sanitize_profile_value(profile, &user);
        let users = ensure_store_users_mut(&mut store);
        let mut next = user.as_object().cloned().unwrap_or_default();
        if let Some(profile_map) = profile.as_object() {
            for (key, value) in profile_map {
                next.insert(key.clone(), value.clone());
            }
        }
        next.insert("updatedAt".to_string(), json!(Utc::now().to_rfc3339()));
        users.insert(email.clone(), Value::Object(next));
    }
    if has_object_key(&data, "review") {
        let Some(review) = sanitize_review_value(
            data.get("review").unwrap_or(&Value::Null),
            store
                .get("users")
                .and_then(Value::as_object)
                .and_then(|users| users.get(&email))
                .unwrap_or(&user),
        ) else {
            return Err(AppError::bad_request(
                "invalid_review",
                "Поставьте оценку и напишите отзыв от 5 символов.",
            ));
        };
        if !has_eligible_review_order(&store, &user, &review) {
            return Err(AppError::forbidden_code(
                "REVIEW_ORDER_REQUIRED",
                "Отзыв можно оставить только после подтвержденного заказа этого товара.",
            ));
        }
        if has_duplicate_review(&store, &user, &review) {
            return Err(AppError::conflict(
                "REVIEW_ALREADY_EXISTS",
                "Отзыв на этот товар уже отправлен.",
            ));
        }
        push_review_record(&mut store, review);
    }
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        no_store_headers(),
        Json(auth_me_payload_from_values(
            &store,
            &json!({ "email": email }),
        )),
    ))
}

async fn admin_orders_preview(headers: HeaderMap) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_read_admin_orders(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    Ok((
        no_store_headers(),
        Json(admin_orders_payload_from_values(&store)),
    ))
}

async fn admin_orders_patch_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((mut store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_read_admin_orders(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    let updated = apply_admin_order_patch(&mut store, &data, &user)?;
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((no_store_headers(), Json(json!({ "order": updated }))))
}

async fn admin_users_preview(
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_read_admin_users(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    let email = params
        .get("email")
        .map(|value| normalize_email(value))
        .unwrap_or_default();
    if email.is_empty() {
        return Ok((
            no_store_headers(),
            Json(admin_users_payload_from_values(&store)),
        ));
    }
    Ok((
        no_store_headers(),
        Json(json!({ "user": admin_user_detail_from_values(&store, &email)? })),
    ))
}

async fn admin_users_invite_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    let (mut store, user) = require_admin_user_context(&headers).await?;
    if !can_manage_admin_users(&user) {
        return Err(AppError::forbidden(
            "Сотрудников может добавлять только администратор.",
        ));
    }
    let email = normalize_email(&clean_text(data.get("email"), 180).unwrap_or_default());
    if !is_valid_email(&email) || is_reserved_bootstrap_email(&email) {
        return Err(AppError::bad_request(
            "invalid_email",
            "Проверьте email сотрудника.",
        ));
    }
    let now = Utc::now().to_rfc3339();
    let users = ensure_store_users_mut(&mut store);
    let existing = users.get(&email).cloned().unwrap_or_else(|| json!({}));
    if string_field(&existing, "role")
        .map(|role| role == "admin")
        .unwrap_or(false)
    {
        return Err(AppError::forbidden_code(
            "admin_locked",
            "Администратора нельзя изменить здесь.",
        ));
    }
    let mut next = existing.as_object().cloned().unwrap_or_default();
    next.insert("email".to_string(), json!(email.clone()));
    next.insert(
        "name".to_string(),
        json!(clean_text(data.get("name"), 120)
            .or_else(|| string_field(&existing, "name"))
            .unwrap_or_else(|| email.clone())),
    );
    next.insert(
        "phone".to_string(),
        json!(normalize_phone(
            &clean_text(data.get("phone"), 180)
                .or_else(|| string_field(&existing, "phone"))
                .unwrap_or_default()
        )),
    );
    next.insert("role".to_string(), json!("manager"));
    next.insert("employee".to_string(), json!(true));
    if !next.contains_key("invitedAt") {
        next.insert("invitedAt".to_string(), json!(now.clone()));
    }
    next.insert("updatedAt".to_string(), json!(now));
    let user_value = Value::Object(next);
    users.insert(email, user_value.clone());
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        StatusCode::CREATED,
        no_store_headers(),
        Json(json!({ "user": public_user_value(&user_value) })),
    ))
}

async fn admin_users_role_patch_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let (mut store, user) = require_admin_user_context(&headers).await?;
    if !can_manage_admin_users(&user) {
        return Err(AppError::forbidden(
            "Роли может менять только администратор.",
        ));
    }
    let email = normalize_email(&clean_text(data.get("email"), 180).unwrap_or_default());
    let role = clean_text(data.get("role"), 40).unwrap_or_default();
    if !valid_admin_assignable_role(&role) {
        return Err(AppError::bad_request("invalid_role", "Некорректная роль."));
    }
    let users = ensure_store_users_mut(&mut store);
    let Some(existing) = users.get(&email).cloned() else {
        return Err(AppError::not_found("not_found", "Пользователь не найден."));
    };
    if string_field(&existing, "role")
        .map(|role| role == "admin")
        .unwrap_or(false)
    {
        return Err(AppError::forbidden_code(
            "admin_locked",
            "Роль администратора нельзя менять здесь.",
        ));
    }
    let mut next = existing.as_object().cloned().unwrap_or_default();
    next.insert("role".to_string(), json!(role));
    next.insert("updatedAt".to_string(), json!(Utc::now().to_rfc3339()));
    let user_value = Value::Object(next);
    users.insert(email, user_value.clone());
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        no_store_headers(),
        Json(json!({ "user": public_user_value(&user_value) })),
    ))
}

async fn admin_users_delete_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let (mut store, user) = require_admin_user_context(&headers).await?;
    if !can_manage_admin_users(&user) {
        return Err(AppError::forbidden(
            "Сотрудников может удалять только администратор.",
        ));
    }
    let email = normalize_email(&clean_text(data.get("email"), 180).unwrap_or_default());
    let users = ensure_store_users_mut(&mut store);
    let Some(existing) = users.get(&email).cloned() else {
        return Err(AppError::not_found("not_found", "Пользователь не найден."));
    };
    if string_field(&existing, "role")
        .map(|role| role == "admin")
        .unwrap_or(false)
    {
        return Err(AppError::forbidden_code(
            "admin_locked",
            "Администратора нельзя удалить здесь.",
        ));
    }
    let mut next = existing.as_object().cloned().unwrap_or_default();
    next.insert("role".to_string(), json!("buyer"));
    next.insert("employee".to_string(), json!(false));
    next.insert(
        "managerRemovedAt".to_string(),
        json!(Utc::now().to_rfc3339()),
    );
    next.insert("updatedAt".to_string(), json!(Utc::now().to_rfc3339()));
    let user_value = Value::Object(next);
    users.insert(email, user_value.clone());
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        no_store_headers(),
        Json(json!({ "user": public_user_value(&user_value) })),
    ))
}

async fn admin_content_preview(
    headers: HeaderMap,
    uri: Uri,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_edit_content(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    if uri
        .query()
        .unwrap_or("")
        .split('&')
        .any(|part| part == "reviews=1")
    {
        return Ok((
            no_store_headers(),
            Json(json!({
                "reviews": sorted_reviews_for_admin(&store)
            })),
        ));
    }
    let content = load_content_record()
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(|| json!({ "content": {}, "updatedAt": Value::Null, "source": "empty" }));
    Ok((no_store_headers(), Json(content)))
}

async fn admin_content_update_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((_store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_edit_content(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    let Some(content) = data.get("content").filter(|value| value.is_object()) else {
        return Err(AppError::bad_request(
            "invalid_content",
            "Некорректные настройки сайта.",
        ));
    };
    let content_bytes = serde_json::to_vec(content)
        .map_err(|error| AppError::internal(error.to_string()))?
        .len();
    if content_bytes > 4 * 1024 * 1024 {
        return Err(AppError::bad_request(
            "content_too_large",
            "Слишком большой объем настроек сайта.",
        ));
    }
    let updated_at = Utc::now().to_rfc3339();
    let saved = json!({
        "content": content,
        "updatedAt": updated_at,
        "updatedBy": string_field(&user, "email").unwrap_or_default(),
        "version": 1
    });
    save_file_store_value(&content_store_key(), &saved)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        no_store_headers(),
        Json(json!({
            "updatedAt": updated_at,
            "count": content.as_object().map(|map| map.len()).unwrap_or(0)
        })),
    ))
}

async fn admin_content_review_patch_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((mut store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_edit_content(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    let review_id = clean_text(data.get("reviewId"), 120).unwrap_or_default();
    if review_id.is_empty() {
        return Err(AppError::bad_request("invalid_review", "Отзыв не найден."));
    }
    let delete = data.get("delete").and_then(Value::as_bool).unwrap_or(false);
    let actor = string_field(&user, "email").unwrap_or_default();
    let now = Utc::now().to_rfc3339();
    let mut updated: Option<Value> = None;
    let mut deleted = false;

    {
        let Some(reviews) = ensure_store_reviews_mut(&mut store).as_array_mut() else {
            return Err(AppError::internal("reviews store is invalid"));
        };
        if delete {
            let before = reviews.len();
            reviews.retain(|review| {
                review
                    .get("id")
                    .and_then(Value::as_str)
                    .map(|id| id != review_id)
                    .unwrap_or(true)
            });
            deleted = reviews.len() != before;
            if !deleted {
                return Err(AppError::not_found("not_found", "Отзыв не найден."));
            }
        } else {
            let status = clean_text(data.get("status"), 40).unwrap_or_default();
            if !valid_review_status(&status) {
                return Err(AppError::bad_request(
                    "invalid_status",
                    "Некорректный статус отзыва.",
                ));
            }
            for review in reviews.iter_mut() {
                let is_target = review
                    .get("id")
                    .and_then(Value::as_str)
                    .map(|id| id == review_id)
                    .unwrap_or(false);
                if !is_target {
                    continue;
                }
                if let Some(map) = review.as_object_mut() {
                    map.insert("status".to_string(), json!(status));
                    map.insert("moderatedBy".to_string(), json!(actor.clone()));
                    map.insert("moderatedAt".to_string(), json!(now.clone()));
                    map.insert("updatedAt".to_string(), json!(now.clone()));
                    updated = Some(Value::Object(map.clone()));
                }
                break;
            }
            if updated.is_none() {
                return Err(AppError::not_found("not_found", "Отзыв не найден."));
            }
        }
    }

    push_audit_record(
        &mut store,
        json!({
            "id": format!("AUD-{}", Utc::now().timestamp_millis()),
            "type": if delete { "review_delete" } else { "review_update" },
            "reviewId": review_id,
            "actor": actor,
            "status": updated
                .as_ref()
                .and_then(|review| string_field(review, "status"))
                .unwrap_or_else(|| "deleted".to_string()),
            "createdAt": Utc::now().to_rfc3339()
        }),
    );
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        no_store_headers(),
        Json(json!({ "review": updated, "deleted": deleted })),
    ))
}

async fn admin_pim_preview(headers: HeaderMap, uri: Uri) -> AppResult<Response> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((_store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized(
            "РќСѓР¶РЅРѕ РІРѕР№С‚Рё РІ Р°РєРєР°СѓРЅС‚.",
        ));
    };
    if !can_edit_content(&user) {
        return Err(AppError::forbidden("РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ."));
    }

    let params = query_params(uri.query().unwrap_or(""));
    let view = params
        .get("view")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or("summary");
    let format = params
        .get("format")
        .map(|value| value.trim().to_ascii_lowercase())
        .unwrap_or_default();
    if !format.is_empty() && format != "json" && format != "csv" {
        return Err(AppError::bad_request(
            "unsupported_format",
            "PIM export format must be json or csv.",
        ));
    }

    let catalog = load_catalog_record()
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let Some(catalog) = catalog else {
        let response = json!({
            "view": "summary",
            "source": "empty",
            "counts": { "products": 0 },
            "diagnostics": { "ok": true, "warnings": [] }
        });
        return Ok((no_store_headers(), Json(response)).into_response());
    };

    if format == "csv" {
        let csv_view = if view == "summary" { "products" } else { view };
        let (file_name, csv) = pim_csv_for_view(&catalog, csv_view)?;
        let mut headers = no_store_headers();
        headers.insert(
            header::CONTENT_TYPE,
            "text/csv; charset=utf-8"
                .parse()
                .expect("valid content-type"),
        );
        headers.insert(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", file_name)
                .parse()
                .expect("valid disposition"),
        );
        return Ok((headers, csv).into_response());
    }

    Ok((
        no_store_headers(),
        Json(pim_report_for_view(&catalog, view)?),
    )
        .into_response())
}

async fn load_catalog_record() -> Result<Option<Value>, std::io::Error> {
    let key = env::var("SOBAG_CATALOG_KEY").unwrap_or_else(|_| CATALOG_KEY.to_string());
    let Some(mut catalog) = load_file_store_value(&key).await? else {
        return Ok(None);
    };
    if catalog.is_array() {
        catalog = json!({
            "products": catalog,
            "updatedAt": Value::Null,
            "updatedBy": "",
            "version": 1
        });
    }
    if !catalog
        .get("products")
        .and_then(Value::as_array)
        .map(|products| !products.is_empty())
        .unwrap_or(false)
    {
        return Ok(None);
    }
    if catalog.get("pim").is_none() {
        let batches = load_import_batch_summaries()
            .await
            .unwrap_or_else(|_| Vec::new());
        let products = catalog
            .get("products")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        if let Some(map) = catalog.as_object_mut() {
            map.insert(
                "pim".to_string(),
                build_pim_from_products(products, batches),
            );
        }
    }
    Ok(Some(catalog))
}

async fn load_import_batch_summaries() -> Result<Vec<Value>, std::io::Error> {
    let key =
        env::var("SOBAG_IMPORT_BATCHES_KEY").unwrap_or_else(|_| IMPORT_BATCHES_KEY.to_string());
    let Some(value) = load_file_store_value(&key).await? else {
        return Ok(Vec::new());
    };
    let batches = if value.is_array() {
        value.as_array().cloned().unwrap_or_default()
    } else {
        value
            .get("batches")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()
    };
    Ok(batches
        .into_iter()
        .map(|batch| {
            json!({
                "id": string_field(&batch, "id").unwrap_or_default(),
                "source": string_field(&batch, "source").unwrap_or_default(),
                "status": string_field(&batch, "status").unwrap_or_default(),
                "createdAt": string_field(&batch, "createdAt").unwrap_or_default(),
                "appliedAt": string_field(&batch, "appliedAt").unwrap_or_default(),
                "rowCount": number_field(&batch, "rowCount"),
                "productCount": number_field(&batch, "productCount"),
                "snapshotProductCount": number_field(&batch, "snapshotProductCount"),
                "counts": batch.get("counts").cloned().unwrap_or_else(|| json!({}))
            })
        })
        .collect())
}

fn build_pim_from_products(products: Vec<Value>, import_batches: Vec<Value>) -> Value {
    let mut pim_products = Vec::new();
    let mut variants = Vec::new();
    let mut images = Vec::new();
    let mut categories: HashMap<String, i64> = HashMap::new();
    let mut collections: HashMap<String, i64> = HashMap::new();
    let mut holidays: HashMap<String, i64> = HashMap::new();
    let mut tags: HashMap<String, i64> = HashMap::new();
    let mut status_counts: HashMap<String, i64> = HashMap::new();

    for product in products {
        let product_id = string_field(&product, "id").unwrap_or_default();
        let base_sku = string_field(&product, "baseSku").unwrap_or_else(|| product_id.clone());
        let status = product_status(&product);
        *status_counts.entry(status.clone()).or_insert(0) += 1;
        for value in string_list_field(&product, "categories", "category") {
            *categories.entry(value).or_insert(0) += 1;
        }
        for value in string_list_field(&product, "collections", "collection") {
            *collections.entry(value).or_insert(0) += 1;
        }
        for value in string_list_field(&product, "holidays", "holiday") {
            *holidays.entry(value).or_insert(0) += 1;
        }
        for value in string_list_field(&product, "tags", "tag") {
            *tags.entry(value).or_insert(0) += 1;
        }
        let product_variants = product
            .get("variants")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let product_images = product
            .get("images")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        pim_products.push(json!({
            "id": product_id,
            "baseSku": base_sku,
            "name": string_field(&product, "name").unwrap_or_default(),
            "status": status,
            "hidden": product.get("hidden").and_then(Value::as_bool).unwrap_or(false),
            "category": string_field(&product, "category").unwrap_or_default(),
            "categories": string_list_field(&product, "categories", "category"),
            "collections": string_list_field(&product, "collections", "collection"),
            "holidays": string_list_field(&product, "holidays", "holiday"),
            "tags": string_list_field(&product, "tags", "tag"),
            "basePrice": number_field(&product, "basePrice"),
            "stock": string_field(&product, "stock").unwrap_or_default(),
            "photoFolder": string_field(&product, "photoFolder").unwrap_or_default(),
            "imageCount": product_images.len(),
            "variantCount": product_variants.len()
        }));
        for variant in product_variants {
            variants.push(json!({
                "id": string_field(&variant, "id").unwrap_or_default(),
                "productId": product_id,
                "baseSku": base_sku,
                "sku": string_field(&variant, "sku").unwrap_or_default(),
                "type": string_field(&variant, "type").unwrap_or_default(),
                "size": string_field(&variant, "size").unwrap_or_default(),
                "material": string_field(&variant, "material").unwrap_or_default(),
                "name": string_field(&variant, "name").unwrap_or_default(),
                "price": number_field(&variant, "price"),
                "priceSource": string_field(&variant, "priceSource").unwrap_or_default()
            }));
        }
        for (index, image) in product_images.into_iter().enumerate() {
            images.push(json!({
                "id": string_field(&image, "id")
                    .or_else(|| string_field(&image, "storageKey"))
                    .or_else(|| string_field(&image, "url"))
                    .unwrap_or_else(|| format!("{}-image-{}", base_sku, index + 1)),
                "productId": product_id,
                "baseSku": base_sku,
                "role": string_field(&image, "role").unwrap_or_default(),
                "source": string_field(&image, "source").unwrap_or_default(),
                "url": string_field(&image, "url").unwrap_or_default(),
                "storageKey": string_field(&image, "storageKey").unwrap_or_default(),
                "provider": string_field(&image, "provider").unwrap_or_default(),
                "width": number_field(&image, "width"),
                "height": number_field(&image, "height"),
                "mime": string_field(&image, "mime").unwrap_or_default(),
                "fileName": string_field(&image, "fileName").unwrap_or_default(),
                "size": number_field(&image, "size"),
                "status": string_field(&image, "status").unwrap_or_default(),
                "uploadedAt": string_field(&image, "uploadedAt").unwrap_or_default(),
                "variantCount": image.get("variants").and_then(Value::as_array).map(|items| items.len()).unwrap_or(0)
            }));
        }
    }
    json!({
        "version": 1,
        "source": "rust-admin-pim-rebuild",
        "generatedAt": Utc::now().to_rfc3339(),
        "counts": {
            "products": pim_products.len(),
            "variants": variants.len(),
            "images": images.len(),
            "statuses": status_counts
        },
        "products": pim_products,
        "variants": variants,
        "images": images,
        "taxonomies": {
            "categories": taxonomy_values("category", categories),
            "collections": taxonomy_values("collection", collections),
            "holidays": taxonomy_values("holiday", holidays),
            "tags": taxonomy_values("tag", tags)
        },
        "importBatches": import_batches
    })
}

fn pim_report_for_view(catalog: &Value, view: &str) -> AppResult<Value> {
    let pim = catalog_pim(catalog);
    let diagnostics = pim_diagnostics(catalog, &pim);
    let updated_at = catalog.get("updatedAt").cloned().unwrap_or(Value::Null);
    let updated_by = string_field(catalog, "updatedBy").unwrap_or_default();
    match view {
        "summary" | "" => Ok(json!({
            "view": "summary",
            "catalogUpdatedAt": updated_at,
            "catalogUpdatedBy": updated_by,
            "diagnostics": diagnostics,
            "counts": pim.get("counts").cloned().unwrap_or_else(|| json!({})),
            "samples": {
                "products": first_items(pim.get("products"), 5),
                "variants": first_items(pim.get("variants"), 5),
                "images": first_items(pim.get("images"), 5),
                "taxonomies": {
                    "categories": first_items(pim.pointer("/taxonomies/categories"), 10),
                    "collections": first_items(pim.pointer("/taxonomies/collections"), 10),
                    "holidays": first_items(pim.pointer("/taxonomies/holidays"), 10),
                    "tags": first_items(pim.pointer("/taxonomies/tags"), 10)
                },
                "importBatches": first_items(pim.get("importBatches"), 10)
            }
        })),
        "full" => Ok(json!({
            "view": "full",
            "catalogUpdatedAt": updated_at,
            "catalogUpdatedBy": updated_by,
            "diagnostics": diagnostics,
            "pim": pim
        })),
        "products" | "variants" | "images" | "taxonomies" | "import-batches" => {
            let rows = pim_rows_for_view(&pim, view)?;
            Ok(json!({
                "view": view,
                "catalogUpdatedAt": updated_at,
                "catalogUpdatedBy": updated_by,
                "diagnostics": diagnostics,
                "count": rows.len(),
                "rows": rows
            }))
        }
        _ => Err(AppError::bad_request(
            "unsupported_pim_view",
            format!("Unsupported PIM view: {view}"),
        )),
    }
}

fn pim_csv_for_view(catalog: &Value, view: &str) -> AppResult<(String, String)> {
    let allowed = [
        "products",
        "variants",
        "images",
        "taxonomies",
        "import-batches",
    ];
    if !allowed.contains(&view) {
        return Err(AppError::bad_request(
            "unsupported_pim_csv_view",
            "CSV export is available only for products, variants, images, taxonomies, import-batches.",
        ));
    }
    let pim = catalog_pim(catalog);
    let rows = pim_rows_for_view(&pim, view)?;
    let columns = pim_columns_for_view(view);
    let mut lines = vec![columns.join(",")];
    for row in rows {
        lines.push(
            columns
                .iter()
                .map(|column| csv_escape(row.get(*column).unwrap_or(&Value::Null)))
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    Ok((
        format!("sobag-pim-{}-{}.csv", view, Utc::now().format("%Y-%m-%d")),
        lines.join("\r\n"),
    ))
}

fn catalog_pim(catalog: &Value) -> Value {
    catalog.get("pim").cloned().unwrap_or_else(|| {
        build_pim_from_products(
            catalog
                .get("products")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default(),
            Vec::new(),
        )
    })
}

fn pim_diagnostics(catalog: &Value, pim: &Value) -> Value {
    let products = catalog
        .get("products")
        .and_then(Value::as_array)
        .map(|items| items.len())
        .unwrap_or(0);
    let pim_products = pim
        .get("products")
        .and_then(Value::as_array)
        .map(|items| items.len())
        .unwrap_or(0);
    let warnings = if products != pim_products {
        json!([{
            "code": "products_count_mismatch",
            "message": "Stored PIM products count differs from catalog products count.",
            "stored": pim_products,
            "rebuilt": products
        }])
    } else {
        json!([])
    };
    json!({
        "ok": warnings.as_array().map(|items| items.is_empty()).unwrap_or(true),
        "warnings": warnings,
        "catalogUpdatedAt": catalog.get("updatedAt").cloned().unwrap_or(Value::Null),
        "catalogUpdatedBy": string_field(catalog, "updatedBy").unwrap_or_default(),
        "pimGeneratedAt": string_field(pim, "generatedAt").unwrap_or_default(),
        "pimSource": string_field(pim, "source").unwrap_or_default(),
        "counts": pim.get("counts").cloned().unwrap_or_else(|| json!({}))
    })
}

fn pim_rows_for_view(pim: &Value, view: &str) -> AppResult<Vec<Value>> {
    match view {
        "products" => Ok(pim
            .get("products")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()),
        "variants" => Ok(pim
            .get("variants")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()),
        "images" => Ok(pim
            .get("images")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()),
        "taxonomies" => {
            let mut rows = Vec::new();
            for bucket in ["categories", "collections", "holidays", "tags"] {
                for item in pim
                    .pointer(&format!("/taxonomies/{bucket}"))
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default()
                {
                    rows.push(json!({
                        "bucket": bucket,
                        "type": string_field(&item, "type").unwrap_or_default(),
                        "id": string_field(&item, "id").unwrap_or_default(),
                        "name": string_field(&item, "name").unwrap_or_default(),
                        "productCount": number_field(&item, "productCount")
                    }));
                }
            }
            Ok(rows)
        }
        "import-batches" => Ok(pim
            .get("importBatches")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()),
        _ => Err(AppError::bad_request(
            "unsupported_pim_view",
            format!("Unsupported PIM view: {view}"),
        )),
    }
}

fn pim_columns_for_view(view: &str) -> Vec<&'static str> {
    match view {
        "variants" => vec![
            "id",
            "productId",
            "baseSku",
            "sku",
            "type",
            "size",
            "material",
            "name",
            "price",
            "priceSource",
        ],
        "images" => vec![
            "id",
            "productId",
            "baseSku",
            "role",
            "source",
            "url",
            "storageKey",
            "provider",
            "width",
            "height",
            "mime",
            "fileName",
            "size",
            "status",
            "uploadedAt",
            "variantCount",
        ],
        "taxonomies" => vec!["bucket", "type", "id", "name", "productCount"],
        "import-batches" => vec![
            "id",
            "source",
            "status",
            "createdAt",
            "appliedAt",
            "rowCount",
            "productCount",
            "snapshotProductCount",
        ],
        _ => vec![
            "id",
            "baseSku",
            "name",
            "status",
            "hidden",
            "category",
            "categories",
            "collections",
            "holidays",
            "tags",
            "basePrice",
            "stock",
            "photoFolder",
            "imageCount",
            "variantCount",
        ],
    }
}

fn query_params(raw: &str) -> HashMap<String, String> {
    url::form_urlencoded::parse(raw.as_bytes())
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect()
}

fn first_items(value: Option<&Value>, limit: usize) -> Value {
    Value::Array(
        value
            .and_then(Value::as_array)
            .map(|items| items.iter().take(limit).cloned().collect())
            .unwrap_or_default(),
    )
}

fn taxonomy_values(kind: &str, values: HashMap<String, i64>) -> Value {
    let mut items = values
        .into_iter()
        .map(|(name, count)| {
            json!({
                "type": kind,
                "id": slug_value(&name),
                "name": name,
                "productCount": count
            })
        })
        .collect::<Vec<_>>();
    items.sort_by(|left, right| {
        string_field(left, "name")
            .unwrap_or_default()
            .cmp(&string_field(right, "name").unwrap_or_default())
    });
    Value::Array(items)
}

fn string_list_field(value: &Value, list_key: &str, fallback_key: &str) -> Vec<String> {
    let mut result = value
        .get(list_key)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|text| text.trim().to_string()))
                .filter(|text| !text.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if result.is_empty() {
        if let Some(single) = string_field(value, fallback_key).filter(|text| !text.is_empty()) {
            result.push(single);
        }
    }
    result
}

fn product_status(product: &Value) -> String {
    let status = string_field(product, "status").unwrap_or_default();
    if !status.is_empty() {
        status
    } else if product
        .get("hidden")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        "hidden".to_string()
    } else {
        "published".to_string()
    }
}

fn number_field(value: &Value, key: &str) -> i64 {
    value
        .get(key)
        .and_then(|item| {
            item.as_i64()
                .or_else(|| item.as_f64().map(|number| number.round() as i64))
                .or_else(|| {
                    item.as_str().and_then(|text| {
                        text.trim()
                            .replace(',', ".")
                            .parse::<f64>()
                            .ok()
                            .map(|number| number.round() as i64)
                    })
                })
        })
        .unwrap_or(0)
}

fn slug_value(value: &str) -> String {
    value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn csv_escape(value: &Value) -> String {
    let prepared = match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        Value::Array(items) => items
            .iter()
            .map(csv_escape)
            .filter(|text| !text.is_empty())
            .collect::<Vec<_>>()
            .join("; "),
        other => other.to_string(),
    };
    if prepared.contains('"')
        || prepared.contains(',')
        || prepared.contains('\r')
        || prepared.contains('\n')
        || prepared.contains(';')
    {
        format!("\"{}\"", prepared.replace('"', "\"\""))
    } else {
        prepared
    }
}

async fn order_create_preview(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let context = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let mut store = if let Some((store, _)) = context.as_ref() {
        store.clone()
    } else {
        load_file_store_value(STORE_KEY)
            .await
            .map_err(|error| AppError::internal(error.to_string()))?
            .unwrap_or_else(default_store_value)
    };
    let user = context.as_ref().map(|(_, user)| user);
    let order = build_order_record(&state.pool, &data, user).await?;
    push_order_record(&mut store, order.clone());
    update_user_profile_from_order(&mut store, &order);
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        StatusCode::CREATED,
        no_store_headers(),
        Json(json!({ "order": order })),
    ))
}

async fn order_patch_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((mut store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    let order = apply_buyer_order_comment_patch(&mut store, &data, &user)?;
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((no_store_headers(), Json(json!({ "order": order }))))
}

async fn brief_create_preview(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let context = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let mut store = if let Some((store, _)) = context.as_ref() {
        store.clone()
    } else {
        load_file_store_value(STORE_KEY)
            .await
            .map_err(|error| AppError::internal(error.to_string()))?
            .unwrap_or_else(default_store_value)
    };
    let user = context.as_ref().map(|(_, user)| user);
    let (brief, order) = build_brief_record(&data, user)?;
    push_brief_record(&mut store, brief.clone(), order.clone());
    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok((
        StatusCode::CREATED,
        no_store_headers(),
        Json(json!({ "brief": brief, "order": order })),
    ))
}

async fn render_listing_page(
    state: Arc<AppState>,
    uri: Uri,
    title: &str,
    fragment_path: &str,
    routes: &RenderRoutes,
) -> AppResult<(HeaderMap, Html<String>)> {
    let query = parse_catalog_query(uri.query().unwrap_or(""));
    let page = load_listing(&state.pool, &query).await?;
    let body = format!(
        "{}<main class=\"rust-catalog\"><h1>{}</h1><form class=\"rust-catalog-layout\" hx-get=\"{}\" hx-target=\"#rustCatalog\" hx-push-url=\"true\"><aside class=\"rust-filter-panel\">{}</aside><section class=\"rust-results\"><div class=\"rust-toolbar\"><input name=\"q\" value=\"{}\" placeholder=\"Поиск по каталогу\"/><select name=\"sort\"><option value=\"popular\"{}>Сначала популярные</option><option value=\"price_asc\"{}>Цена: ниже</option><option value=\"price_desc\"{}>Цена: выше</option></select><button type=\"submit\">Показать</button>{}</div><section id=\"rustCatalog\">{}</section></section></form></main>{}",
        render_page_head_with_routes(title, routes),
        escape_html(title),
        fragment_path,
        render_filter_panel(&query, &page),
        escape_attr(&query.q),
        selected_attr(&query.sort, "popular"),
        selected_attr(&query.sort, "price_asc"),
        selected_attr(&query.sort, "price_desc"),
        render_clear_filters_link(fragment_path, &query),
        render_listing_fragment_with_routes(fragment_path, routes, &query, &page),
        render_page_foot()
    );
    Ok((cache_headers(), Html(body)))
}

struct RenderRoutes {
    catalog_path: &'static str,
    search_path: &'static str,
    content_path_prefix: &'static str,
    catalog_fragment_path: &'static str,
    search_fragment_path: &'static str,
    product_path: &'static str,
    product_fragment_path: &'static str,
}

static RUST_ROUTES: RenderRoutes = RenderRoutes {
    catalog_path: "/rust/catalog",
    search_path: "/rust/search",
    content_path_prefix: "/rust/pages/",
    catalog_fragment_path: "/rust/catalog-fragment",
    search_fragment_path: "/rust/search-fragment",
    product_path: "/rust/product",
    product_fragment_path: "/rust/product-fragment",
};

static PUBLIC_ROUTES: RenderRoutes = RenderRoutes {
    catalog_path: "/catalog",
    search_path: "/search",
    content_path_prefix: "/",
    catalog_fragment_path: "/catalog-fragment",
    search_fragment_path: "/search-fragment",
    product_path: "/product",
    product_fragment_path: "/product-fragment",
};

fn routes_for_path(path: &str) -> &'static RenderRoutes {
    if path.starts_with("/rust") {
        &RUST_ROUTES
    } else {
        &PUBLIC_ROUTES
    }
}

struct ListingPage {
    items: Vec<CatalogCard>,
    total: i64,
    facet_options: HashMap<&'static str, Vec<FacetValue>>,
}

async fn load_listing(pool: &PgPool, query: &CatalogQuery) -> AppResult<ListingPage> {
    Ok(ListingPage {
        items: load_cards(pool, query).await?,
        total: load_count(pool, query).await?,
        facet_options: load_facets(pool, query, true).await?,
    })
}

async fn lookup_product(pool: &PgPool, lookup: DetailLookup) -> AppResult<ProductDetail> {
    let id = clean(lookup.id.unwrap_or_default());
    let base_sku = clean(lookup.base_sku.unwrap_or_default());
    let sku = clean(lookup.sku.unwrap_or_default());
    if id.is_empty() && base_sku.is_empty() && sku.is_empty() {
        return Err(AppError::bad_request(
            "missing_product_lookup",
            "Provide id, baseSku, or sku.",
        ));
    }
    load_product_detail(pool, &id, &base_sku, &sku)
        .await?
        .ok_or_else(|| AppError::not_found("product_not_found", "Product not found."))
}

fn render_page_head(title: &str) -> String {
    render_page_head_with_routes(title, &RUST_ROUTES)
}

fn render_page_head_with_routes(title: &str, routes: &RenderRoutes) -> String {
    format!(
        "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>{} | Sobag Opt</title><style>{}</style><script defer src=\"https://unpkg.com/htmx.org@1.9.12\"></script>{}</head><body>{}",
        escape_html(title),
        "body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111}.rust-shell-top{border-bottom:1px solid #ddd;background:#f7f7f7}.rust-shell-top__inner,.rust-shell-header__inner{max-width:1180px;margin:0 auto;padding:8px 24px;display:flex;align-items:center;gap:18px}.rust-shell-top__inner{justify-content:center}.rust-shell-top a,.rust-shell-header a{color:#111;text-decoration:none;font-weight:700}.rust-shell-header{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #ddd}.rust-shell-logo{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:900;letter-spacing:1px}.rust-shell-logo span{display:grid;place-items:center;width:48px;height:48px;border-radius:10px;background:#111;color:#fff}.rust-shell-catalog,.rust-shell-cart{border-radius:8px;background:#111;color:#fff!important;padding:14px 18px}.rust-shell-search{flex:1;display:flex}.rust-shell-search input{width:100%;padding:14px 16px;border:1px solid #ddd;border-radius:12px;background:#f4f4f4}.rust-shell-actions{display:flex;gap:8px}.rust-shell-icon{border:1px solid #ccc;border-radius:8px;padding:12px}.rust-catalog,.rust-product,.rust-content-page{max-width:1180px;margin:0 auto;padding:24px}.rust-catalog-layout{display:grid;grid-template-columns:240px 1fr;gap:24px}.rust-filter-panel{border-right:1px solid #ddd;padding-right:16px}.rust-filter-group{border-top:1px solid #ddd;padding:14px 0}.rust-filter-group h2{font-size:16px;margin:0 0 10px}.rust-filter-option{display:flex;gap:8px;align-items:flex-start;margin:8px 0}.rust-filter-option input{margin-top:3px}.rust-filter-option span:last-child{color:#666}.rust-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px}.rust-toolbar input,.rust-toolbar select{padding:12px;border:1px solid #bbb;border-radius:6px}.rust-clear-filters{border:1px solid #bbb;border-radius:6px;color:#111;padding:12px;text-decoration:none}.rust-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}.rust-card{border:1px solid #bbb;border-radius:8px;overflow:hidden;background:#fff}.rust-card img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#eee}.rust-card__body{padding:12px}.rust-card__price{font-weight:800}.rust-pager{margin-top:18px}.rust-product-layout{display:grid;grid-template-columns:minmax(280px,420px) 1fr;gap:28px}.rust-product-main-image,.rust-product-thumbs img{width:100%;aspect-ratio:1/1;object-fit:cover;border:1px solid #bbb;border-radius:8px;background:#eee}.rust-product-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}.rust-product-meta{display:flex;flex-wrap:wrap;gap:8px}.rust-chip{border:1px solid #bbb;border-radius:999px;padding:6px 10px}.rust-variant-table{width:100%;border-collapse:collapse}.rust-variant-table th,.rust-variant-table td{border-bottom:1px solid #ddd;padding:10px;text-align:left}.rust-variant-qty{max-width:90px;padding:8px;border:1px solid #bbb;border-radius:6px}.rust-related{margin-top:28px}.rust-content-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}.rust-content-nav a{border:1px solid #bbb;border-radius:6px;padding:8px 10px;color:#111;text-decoration:none}.rust-content-hero{border-bottom:2px solid #111;padding-bottom:18px}.rust-content-hero h1{font-size:44px;line-height:1;margin:0 0 12px}.rust-content-panel{background:#f4f4f4;border:1px solid #ddd;border-radius:8px;margin-top:18px;padding:18px}.rust-content-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.rust-address{font-weight:700}@media(max-width:760px){.rust-shell-top__inner{display:none}.rust-shell-header__inner{flex-wrap:wrap}.rust-shell-search{order:3;flex-basis:100%}.rust-catalog-layout,.rust-product-layout{grid-template-columns:1fr}.rust-filter-panel{border-right:0;border-bottom:1px solid #ddd;padding-right:0}.rust-toolbar input,.rust-toolbar select,.rust-toolbar button{width:100%}}",
        render_cart_bridge_script(),
        render_preview_shell_header(routes)
    )
}

fn render_cart_bridge_script() -> &'static str {
    r#"<script defer>
(function(){
  function cartKey(){var user=localStorage.getItem("sobag.currentUser");return user?"sobag.cart."+user:"sobag.cart.guest";}
  function readCart(){try{var data=JSON.parse(localStorage.getItem(cartKey())||"[]");return Array.isArray(data)?data:[]}catch(_){return[]}}
  function writeCart(items){localStorage.setItem(cartKey(),JSON.stringify(items));}
  function clampQty(value){var qty=Math.round(Number(value)||1);return Math.max(1,Math.min(99999,qty));}
  function cartQty(items){return items.reduce(function(sum,pair){return sum+Number(pair&&pair[1]&&pair[1].qty||0)},0);}
  function syncCart(items){if(!localStorage.getItem("sobag.currentUser"))return;fetch("/api/auth/me",{method:"PUT",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({cartItems:items})}).catch(function(){});}
  function baseSkuFromSku(sku){var match=String(sku||"").match(/^opt_[0-9]+/i);return match?match[0]:String(sku||"");}
  function parsePrice(value){return Number(String(value||"").replace(/[^0-9]/g,""))||0;}
  function productContext(){
    var title=document.querySelector(".rust-product-info h1");
    var image=document.querySelector(".rust-product-main-image");
    return {name:(title&&title.textContent.trim())||"",image:(image&&image.getAttribute("src"))||""};
  }
  function lineFromRow(row){
    var cells=row?row.querySelectorAll("td"):[];
    var sku=(cells[0]&&cells[0].textContent.trim())||"";
    if(!sku)return null;
    var ctx=productContext();
    var baseSku=baseSkuFromSku(sku);
    var variantName=ctx.name;
    return {
      key:baseSku+":"+sku,
      productId:baseSku,
      productName:variantName,
      productImage:ctx.image,
      qty:1,
      variant:{sku:sku,name:variantName,type:(cells[1]&&cells[1].textContent.trim())||"",size:(cells[2]&&cells[2].textContent.trim())||"",material:"",price:parsePrice(cells[3]&&cells[3].textContent)}
    };
  }
  function updateCartLink(items){var cartLink=document.querySelector(".rust-shell-cart");if(cartLink)cartLink.textContent="\u041A\u043E\u0440\u0437\u0438\u043D\u0430 "+cartQty(items);}
  function ensureVariantButtons(){
    var header=document.querySelector(".rust-variant-table thead tr");
    if(header&&!header.querySelector("[data-rust-cart-th]")){
      var th=document.createElement("th");
      th.setAttribute("data-rust-cart-th","");
      th.textContent="";
      header.appendChild(th);
    }
    document.querySelectorAll(".rust-variant-table tbody tr").forEach(function(row){
      if(row.querySelector("[data-rust-add-cart]"))return;
      row.setAttribute("data-rust-variant-row","");
      var cell=document.createElement("td");
      var button=document.createElement("button");
      button.type="button";
      button.setAttribute("data-rust-add-cart","");
      button.textContent="\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443";
      cell.appendChild(button);
      row.appendChild(cell);
    });
    updateCartLink(readCart());
  }
  document.addEventListener("DOMContentLoaded",ensureVariantButtons);
  document.body&&document.body.addEventListener("htmx:afterSwap",ensureVariantButtons);
  document.addEventListener("click",function(event){
    var button=event.target.closest("[data-rust-add-cart]");
    if(!button)return;
    var row=button.closest("[data-rust-variant-row]");
    var input=row&&row.querySelector(".rust-variant-qty");
    var qty=clampQty(input&&input.value);
    var line;
    try{line=JSON.parse(button.getAttribute("data-cart-line")||"null");}catch(_){line=null;}
    if(!line)line=lineFromRow(row);
    if(!line||!line.variant||!line.variant.sku)return;
    var key=button.getAttribute("data-cart-key")||line.key||line.variant.sku;
    var items=readCart();
    var existing=items.find(function(pair){return Array.isArray(pair)&&pair[0]===key;});
    if(existing&&existing[1])existing[1].qty=clampQty(Number(existing[1].qty||0)+qty);
    else{line.key=key;line.qty=qty;items.push([key,line]);}
    writeCart(items);
    syncCart(items);
    updateCartLink(items);
    var old=button.textContent;
    button.textContent="\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E";
    setTimeout(function(){button.textContent=old;},1200);
  });
})();
</script>"#
}

fn render_preview_shell_header(routes: &RenderRoutes) -> String {
    format!(
        "<div class=\"rust-shell-top\"><nav class=\"rust-shell-top__inner\" aria-label=\"Верхняя навигация\"><a href=\"/marketplaces\">Мы на маркетплейсах</a><a href=\"/business\">Условия для бизнеса</a><a href=\"/about\">О компании</a><a href=\"/contacts\">Контакты</a></nav></div><header class=\"rust-shell-header\"><div class=\"rust-shell-header__inner\"><a class=\"rust-shell-logo\" href=\"/\"><span>S</span>SOBAG OPT</a><a class=\"rust-shell-catalog\" href=\"{}\">Каталог</a><form class=\"rust-shell-search\" action=\"{}\" method=\"get\"><input name=\"q\" placeholder=\"Поиск: пледы, подушки, тираж, принт\"></form><nav class=\"rust-shell-actions\" aria-label=\"Действия\"><a class=\"rust-shell-icon\" href=\"/account\">Вход</a><a class=\"rust-shell-icon\" href=\"/favorites\">Избранное</a><a class=\"rust-shell-cart\" href=\"/cart\">Корзина</a></nav></div></header>",
        routes.catalog_path,
        routes.search_path
    )
}

fn render_page_foot() -> &'static str {
    "</body></html>"
}

fn content_page_spec(slug: &str) -> Option<&'static ContentPageSpec> {
    CONTENT_PAGES.iter().find(|page| page.slug == slug)
}

async fn load_site_content() -> Result<Value, std::io::Error> {
    let Some(value) = load_file_store_value(
        &env::var("SOBAG_CONTENT_KEY").unwrap_or_else(|_| CONTENT_KEY.to_string()),
    )
    .await?
    else {
        return Ok(Value::Null);
    };
    let content = value.get("content").unwrap_or(&value);
    Ok(content.clone())
}

async fn load_auth_me_from_file_store(cookie_header: &str) -> Result<Value, std::io::Error> {
    let token = parse_cookie_value(cookie_header, SESSION_COOKIE).unwrap_or_default();
    if token.trim().is_empty() {
        return Ok(json!({ "user": null }));
    }
    let Some(session) = load_file_store_value(&session_store_key(&token)).await? else {
        return Ok(json!({ "user": null }));
    };
    let Some(store) = load_file_store_value(STORE_KEY).await? else {
        return Ok(json!({ "user": null }));
    };
    Ok(auth_me_payload_from_values(&store, &session))
}

async fn load_current_user_from_file_store(
    cookie_header: &str,
) -> Result<Option<(Value, Value)>, std::io::Error> {
    let token = parse_cookie_value(cookie_header, SESSION_COOKIE).unwrap_or_default();
    if token.trim().is_empty() {
        return Ok(None);
    }
    let Some(session) = load_file_store_value(&session_store_key(&token)).await? else {
        return Ok(None);
    };
    let Some(store) = load_file_store_value(STORE_KEY).await? else {
        return Ok(None);
    };
    let email = session
        .get("email")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if email.is_empty() {
        return Ok(None);
    }
    let Some(user) = store
        .get("users")
        .and_then(Value::as_object)
        .and_then(|users| users.get(email))
        .cloned()
    else {
        return Ok(None);
    };
    Ok(Some((store, user)))
}

fn content_store_key() -> String {
    env::var("SOBAG_CONTENT_KEY").unwrap_or_else(|_| CONTENT_KEY.to_string())
}

fn session_cookie_header(token: &str) -> String {
    let secure = if env::var("NODE_ENV").unwrap_or_default() == "production" {
        "; Secure"
    } else {
        ""
    };
    format!(
        "{}={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}{}",
        SESSION_COOKIE,
        url_encode(token),
        SESSION_TTL_SECONDS,
        secure
    )
}

fn expired_session_cookie_header() -> String {
    let secure = if env::var("NODE_ENV").unwrap_or_default() == "production" {
        "; Secure"
    } else {
        ""
    };
    format!(
        "{}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0{}",
        SESSION_COOKIE, secure
    )
}

fn parse_cookie_value(cookie_header: &str, name: &str) -> Option<String> {
    cookie_header
        .split(';')
        .filter_map(|part| {
            let (key, value) = part.trim().split_once('=')?;
            Some((key.trim(), value.trim()))
        })
        .find(|(key, _)| *key == name)
        .map(|(_, value)| percent_decode_cookie(value))
}

fn percent_decode_cookie(value: &str) -> String {
    let mut bytes = Vec::with_capacity(value.len());
    let raw = value.as_bytes();
    let mut index = 0;
    while index < raw.len() {
        if raw[index] == b'%' && index + 2 < raw.len() {
            if let Ok(hex) = std::str::from_utf8(&raw[index + 1..index + 3]) {
                if let Ok(byte) = u8::from_str_radix(hex, 16) {
                    bytes.push(byte);
                    index += 3;
                    continue;
                }
            }
        }
        bytes.push(raw[index]);
        index += 1;
    }
    String::from_utf8_lossy(&bytes).to_string()
}

fn auth_me_payload_from_values(store: &Value, session: &Value) -> Value {
    let email = session
        .get("email")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if email.is_empty() {
        return json!({ "user": null });
    }
    let Some(user) = store
        .get("users")
        .and_then(Value::as_object)
        .and_then(|users| users.get(email))
    else {
        return json!({ "user": null });
    };
    let public_user = public_user_value(user);
    let user_email = public_user
        .get("email")
        .and_then(Value::as_str)
        .unwrap_or(email)
        .to_string();
    let orders = user_orders(store, &user_email);
    let reviews = user_reviews(store, &user_email);
    let mut user_with_activity = public_user;
    if let Some(map) = user_with_activity.as_object_mut() {
        map.insert("orders".to_string(), orders);
        map.insert("reviews".to_string(), reviews);
    }
    json!({
        "user": user_with_activity,
        "cartItems": store_nested_items(store, "carts", &user_email),
        "favoriteItems": store_nested_items(store, "favorites", &user_email),
        "savedCarts": saved_carts_for_user(store, &user_email, can_use_internal_saved_cart_fields(user))
    })
}

fn public_user_value(user: &Value) -> Value {
    let mut public = user.clone();
    if let Some(map) = public.as_object_mut() {
        map.remove("passwordHash");
        map.remove("passwordSalt");
    }
    public
}

fn can_use_internal_saved_cart_fields(user: &Value) -> bool {
    matches!(
        user.get("role").and_then(Value::as_str),
        Some("admin" | "manager")
    )
}

fn can_read_admin_orders(user: &Value) -> bool {
    matches!(
        user.get("role").and_then(Value::as_str),
        Some("admin" | "manager")
    )
}

fn can_read_admin_users(user: &Value) -> bool {
    matches!(
        user.get("role").and_then(Value::as_str),
        Some("admin" | "manager")
    )
}

fn can_manage_admin_users(user: &Value) -> bool {
    matches!(user.get("role").and_then(Value::as_str), Some("admin"))
}

fn can_edit_content(user: &Value) -> bool {
    matches!(
        user.get("role").and_then(Value::as_str),
        Some("admin" | "content")
    )
}

fn admin_orders_payload_from_values(store: &Value) -> Value {
    json!({
        "orders": store
            .get("orders")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()
    })
}

fn apply_admin_order_patch(store: &mut Value, data: &Value, user: &Value) -> AppResult<Value> {
    let order_id = clean_text(data.get("id"), 120).unwrap_or_default();
    let status = clean_text(data.get("status"), 40).unwrap_or_default();
    if !status.is_empty() && !valid_order_status(&status) {
        return Err(AppError::bad_request(
            "invalid_status",
            "Некорректный статус.",
        ));
    }
    let has_manager_email = has_object_key(data, "managerEmail");
    let manager_email = if has_manager_email {
        normalize_email(&clean_text(data.get("managerEmail"), 180).unwrap_or_default())
    } else {
        String::new()
    };
    let mut manager_name = clean_text(data.get("managerName"), 120).unwrap_or_default();
    if has_manager_email && !manager_email.is_empty() {
        let manager = store
            .get("users")
            .and_then(Value::as_object)
            .and_then(|users| users.get(&manager_email));
        let valid_manager = manager
            .and_then(|manager| string_field(manager, "role"))
            .map(|role| role == "admin" || role == "manager")
            .unwrap_or(false);
        if !valid_manager {
            return Err(AppError::bad_request(
                "invalid_manager",
                "Выберите администратора или менеджера.",
            ));
        }
        if let Some(manager) = manager {
            manager_name = string_field(manager, "name")
                .or_else(|| string_field(manager, "email"))
                .unwrap_or_else(|| manager_email.clone());
        }
    }

    if !store.is_object() {
        *store = default_store_value();
    }
    let Some(map) = store.as_object_mut() else {
        return Err(AppError::internal("store is invalid"));
    };
    let orders_value = map.entry("orders").or_insert_with(|| json!([]));
    if !orders_value.is_array() {
        *orders_value = json!([]);
    }
    let Some(orders) = orders_value.as_array_mut() else {
        return Err(AppError::internal("orders store is invalid"));
    };
    let actor_email = string_field(user, "email").unwrap_or_default();
    let actor_name = string_field(user, "name").unwrap_or_else(|| actor_email.clone());
    let actor_role = string_field(user, "role").unwrap_or_else(|| "manager".to_string());
    let mut updated: Option<Value> = None;

    for order in orders.iter_mut() {
        let is_target = order
            .get("id")
            .and_then(Value::as_str)
            .map(|id| id == order_id)
            .unwrap_or(false);
        if !is_target {
            continue;
        }
        let original = order.clone();
        let mut next = order.as_object().cloned().unwrap_or_default();
        if !status.is_empty() {
            next.insert("status".to_string(), json!(status));
        }
        if has_manager_email {
            next.insert("managerEmail".to_string(), json!(manager_email));
            next.insert("managerName".to_string(), json!(manager_name));
        }
        if has_object_key(data, "managerNote") {
            next.insert(
                "managerNote".to_string(),
                json!(clean_text(data.get("managerNote"), 1200).unwrap_or_default()),
            );
        }
        if let Some(crm_entry) = order_crm_thread_entry(data, &actor_name, &actor_role) {
            let current = original.get("crmThread").and_then(Value::as_array).cloned();
            next.insert(
                "crmThread".to_string(),
                prepend_limited(current, crm_entry, 200),
            );
        } else {
            next.entry("crmThread".to_string()).or_insert_with(|| {
                original
                    .get("crmThread")
                    .cloned()
                    .unwrap_or_else(|| json!([]))
            });
        }
        if let Some(history_entry) = order_history_entry(&original, &next, &actor_email) {
            let current = original
                .get("statusHistory")
                .and_then(Value::as_array)
                .cloned();
            next.insert(
                "statusHistory".to_string(),
                prepend_limited(current, history_entry, 100),
            );
        } else {
            next.entry("statusHistory".to_string()).or_insert_with(|| {
                original
                    .get("statusHistory")
                    .cloned()
                    .unwrap_or_else(|| json!([]))
            });
        }
        next.insert("updatedAt".to_string(), json!(Utc::now().to_rfc3339()));
        next.insert("updatedBy".to_string(), json!(actor_email.clone()));
        let next_value = Value::Object(next);
        *order = next_value.clone();
        updated = Some(next_value);
        break;
    }
    let Some(updated) = updated else {
        return Err(AppError::not_found("not_found", "Заказ не найден."));
    };

    let audit = map.entry("audit").or_insert_with(|| json!([]));
    if !audit.is_array() {
        *audit = json!([]);
    }
    if let Some(items) = audit.as_array_mut() {
        items.insert(
            0,
            json!({
                "id": format!("AUD-{}", Utc::now().timestamp_millis()),
                "type": "order_update",
                "orderId": updated.get("id").cloned().unwrap_or_else(|| json!("")),
                "actor": actor_email,
                "status": updated.get("status").cloned().unwrap_or_else(|| json!("")),
                "managerEmail": updated.get("managerEmail").cloned().unwrap_or_else(|| json!("")),
                "createdAt": Utc::now().to_rfc3339()
            }),
        );
        items.truncate(500);
    }
    Ok(updated)
}

fn has_object_key(value: &Value, key: &str) -> bool {
    value
        .as_object()
        .map(|map| map.contains_key(key))
        .unwrap_or(false)
}

fn valid_order_status(status: &str) -> bool {
    matches!(
        status,
        "new" | "processing" | "waiting" | "production" | "ready" | "shipped" | "done" | "canceled"
    )
}

fn order_status_label(status: &str) -> &'static str {
    match status {
        "processing" => "В работе",
        "waiting" => "Ждет клиента",
        "production" => "В производстве",
        "ready" => "Готов к отгрузке",
        "shipped" => "Отгружен",
        "done" => "Выполнен",
        "canceled" => "Отменен",
        _ => "Новый",
    }
}

fn valid_comment_visibility(visibility: &str) -> bool {
    matches!(visibility, "internal" | "customer")
}

fn order_crm_thread_entry(data: &Value, actor: &str, role: &str) -> Option<Value> {
    let text = clean_text(data.get("commentText"), 1200)?;
    let visibility = clean_text(data.get("commentVisibility"), 40).unwrap_or_default();
    let visibility = if valid_comment_visibility(&visibility) {
        visibility
    } else {
        "internal".to_string()
    };
    Some(json!({
        "id": format!("CRM-{}", Utc::now().timestamp_millis()),
        "at": Utc::now().to_rfc3339(),
        "actor": actor.chars().take(120).collect::<String>(),
        "role": role.chars().take(40).collect::<String>(),
        "visibility": visibility,
        "text": text
    }))
}

fn order_history_entry(
    original: &Value,
    next: &serde_json::Map<String, Value>,
    actor: &str,
) -> Option<Value> {
    let mut changes = Vec::new();
    let old_status = string_field(original, "status").unwrap_or_else(|| "new".to_string());
    let new_status = next
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or(&old_status);
    if new_status != old_status {
        changes.push(format!(
            "Статус: {} -> {}",
            order_status_label(&old_status),
            order_status_label(new_status)
        ));
    }
    let old_manager_email = string_field(original, "managerEmail").unwrap_or_default();
    let new_manager_email = next
        .get("managerEmail")
        .and_then(Value::as_str)
        .unwrap_or(&old_manager_email);
    if new_manager_email != old_manager_email {
        let manager = next
            .get("managerName")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .unwrap_or(if new_manager_email.is_empty() {
                "не назначен"
            } else {
                new_manager_email
            });
        changes.push(format!("Менеджер: {manager}"));
    }
    let old_note = string_field(original, "managerNote").unwrap_or_default();
    let new_note = next
        .get("managerNote")
        .and_then(Value::as_str)
        .unwrap_or(&old_note);
    if new_note != old_note {
        changes.push("Комментарий менеджера обновлен".to_string());
    }
    if changes.is_empty() {
        return None;
    }
    Some(json!({
        "id": format!("H-{}", Utc::now().timestamp_millis()),
        "at": Utc::now().to_rfc3339(),
        "actor": actor,
        "summary": changes.join("; ")
    }))
}

fn prepend_limited(current: Option<Vec<Value>>, entry: Value, limit: usize) -> Value {
    let mut items = current.unwrap_or_default();
    items.insert(0, entry);
    items.truncate(limit);
    Value::Array(items)
}

async fn require_admin_user_context(headers: &HeaderMap) -> AppResult<(Value, Value)> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    };
    if !can_read_admin_users(&user) {
        return Err(AppError::forbidden("Недостаточно прав."));
    }
    Ok((store, user))
}

fn admin_users_payload_from_values(store: &Value) -> Value {
    let users = store
        .get("users")
        .and_then(Value::as_object)
        .map(|users| users.values().map(public_user_value).collect::<Vec<_>>())
        .unwrap_or_default();
    json!({ "users": users })
}

fn valid_admin_assignable_role(role: &str) -> bool {
    matches!(role, "buyer" | "manager" | "content")
}

fn admin_user_detail_from_values(store: &Value, email: &str) -> AppResult<Value> {
    let normalized = normalize_email(email);
    let orders = admin_orders_for_user(store, &normalized);
    let found = store
        .get("users")
        .and_then(Value::as_object)
        .and_then(|users| users.get(&normalized));
    if let Some(user) = found {
        let mut public = public_user_value(user);
        if let Some(map) = public.as_object_mut() {
            map.insert("orders".to_string(), orders);
        }
        return Ok(public);
    }
    if orders
        .as_array()
        .map(|items| items.is_empty())
        .unwrap_or(true)
    {
        return Err(AppError::not_found("not_found", "Пользователь не найден."));
    }
    let latest_customer = orders
        .as_array()
        .and_then(|items| items.first())
        .and_then(|order| order.get("customer"))
        .cloned()
        .unwrap_or_else(|| json!({}));
    let name = string_field(&latest_customer, "name")
        .or_else(|| string_field(&latest_customer, "company"))
        .unwrap_or_else(|| normalized.clone());
    let addresses = orders
        .as_array()
        .map(|items| {
            let mut seen = Vec::<String>::new();
            for order in items {
                let Some(address) = order
                    .get("customer")
                    .and_then(|customer| string_field(customer, "address"))
                else {
                    continue;
                };
                if !seen.iter().any(|item| item == &address) {
                    seen.push(address);
                }
            }
            seen
        })
        .unwrap_or_default();
    Ok(json!({
        "email": normalized,
        "name": name,
        "phone": string_field(&latest_customer, "phone").unwrap_or_default(),
        "role": "buyer",
        "address": string_field(&latest_customer, "address").unwrap_or_default(),
        "addresses": addresses,
        "lastCustomer": latest_customer,
        "orders": orders
    }))
}

fn admin_orders_for_user(store: &Value, email: &str) -> Value {
    let normalized = email.to_ascii_lowercase();
    Value::Array(
        store
            .get("orders")
            .and_then(Value::as_array)
            .map(|orders| {
                orders
                    .iter()
                    .filter(|order| {
                        order
                            .get("userEmail")
                            .and_then(Value::as_str)
                            .map(|value| value.eq_ignore_ascii_case(&normalized))
                            .unwrap_or(false)
                            || order
                                .get("customer")
                                .and_then(|customer| customer.get("email"))
                                .and_then(Value::as_str)
                                .map(|value| value.eq_ignore_ascii_case(&normalized))
                                .unwrap_or(false)
                    })
                    .cloned()
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
    )
}

async fn load_content_record() -> Result<Option<Value>, std::io::Error> {
    let Some(value) = load_file_store_value(&content_store_key()).await? else {
        return Ok(None);
    };
    if value.get("content").and_then(Value::as_object).is_some() {
        return Ok(Some(json!({
            "content": value.get("content").cloned().unwrap_or_else(|| json!({})),
            "updatedAt": value.get("updatedAt").cloned().unwrap_or(Value::Null),
            "updatedBy": value.get("updatedBy").cloned().unwrap_or_else(|| json!("")),
            "version": value.get("version").cloned().unwrap_or_else(|| json!(1))
        })));
    }
    if value.is_object() {
        return Ok(Some(json!({
            "content": value,
            "updatedAt": Value::Null,
            "updatedBy": "",
            "version": 1
        })));
    }
    Ok(None)
}

fn sorted_reviews_for_admin(store: &Value) -> Value {
    let mut reviews = store
        .get("reviews")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    reviews.sort_by(|left, right| {
        let left = left.get("createdAt").and_then(Value::as_str).unwrap_or("");
        let right = right.get("createdAt").and_then(Value::as_str).unwrap_or("");
        right.cmp(left)
    });
    Value::Array(reviews)
}

fn default_store_value() -> Value {
    json!({
        "users": {},
        "orders": [],
        "carts": {},
        "favorites": {},
        "savedCarts": {},
        "reviews": [],
        "briefs": [],
        "audit": [],
        "version": 1
    })
}

fn ensure_store_users_mut(store: &mut Value) -> &mut serde_json::Map<String, Value> {
    if !store.is_object() {
        *store = default_store_value();
    }
    let map = store.as_object_mut().expect("store object");
    let users = map.entry("users").or_insert_with(|| json!({}));
    if !users.is_object() {
        *users = json!({});
    }
    users.as_object_mut().expect("users object")
}

fn ensure_store_reviews_mut(store: &mut Value) -> &mut Value {
    if !store.is_object() {
        *store = default_store_value();
    }
    let map = store.as_object_mut().expect("store object");
    let reviews = map.entry("reviews").or_insert_with(|| json!([]));
    if !reviews.is_array() {
        *reviews = json!([]);
    }
    reviews
}

fn push_audit_record(store: &mut Value, record: Value) {
    if !store.is_object() {
        *store = default_store_value();
    }
    let map = store.as_object_mut().expect("store object");
    let audit = map.entry("audit").or_insert_with(|| json!([]));
    if !audit.is_array() {
        *audit = json!([]);
    }
    if let Some(items) = audit.as_array_mut() {
        items.insert(0, record);
        items.truncate(500);
    }
}

fn push_review_record(store: &mut Value, record: Value) {
    if !store.is_object() {
        *store = default_store_value();
    }
    let map = store.as_object_mut().expect("store object");
    let reviews = map.entry("reviews").or_insert_with(|| json!([]));
    if !reviews.is_array() {
        *reviews = json!([]);
    }
    if let Some(items) = reviews.as_array_mut() {
        items.insert(0, record);
        items.truncate(MAX_REVIEWS);
    }
}

fn valid_review_status(status: &str) -> bool {
    matches!(status, "pending" | "approved" | "hidden")
}

fn normalize_email(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn is_valid_email(value: &str) -> bool {
    let value = value.trim();
    value == "admin@sobag"
        || (value.contains('@')
            && value.contains('.')
            && !value.chars().any(char::is_whitespace)
            && !value.starts_with('@')
            && !value.ends_with('@'))
}

fn is_reserved_bootstrap_email(value: &str) -> bool {
    let email = normalize_email(value);
    email == "admin@sobag"
        || env::var("SOBAG_ADMIN_EMAIL")
            .ok()
            .map(|admin_email| normalize_email(&admin_email) == email)
            .unwrap_or(false)
}

fn find_login_user(store: &Value, login: &str) -> Option<(String, Value)> {
    let normalized_email = normalize_email(login);
    let users = store.get("users")?.as_object()?;
    if let Some(user) = users.get(&normalized_email) {
        return Some((normalized_email, user.clone()));
    }
    let normalized_phone = normalize_phone(login);
    if normalized_phone.is_empty() {
        return None;
    }
    users.iter().find_map(|(email, user)| {
        let phone = string_field(user, "phone")
            .map(|value| normalize_phone(&value))
            .unwrap_or_default();
        if phone == normalized_phone {
            Some((email.clone(), user.clone()))
        } else {
            None
        }
    })
}

fn verify_user_password(password: &str, user: &Value) -> bool {
    let Some(salt) = string_field(user, "passwordSalt") else {
        return false;
    };
    let Some(hash) = string_field(user, "passwordHash") else {
        return false;
    };
    verify_password_hash(password, &salt, &hash)
}

fn hash_password_preview(password: &str, email: &str) -> (String, String) {
    let mut salt_bytes = [0_u8; 16];
    if getrandom::getrandom(&mut salt_bytes).is_err() {
        let fallback = format!(
            "{}:{}:{}",
            email,
            Utc::now().timestamp_nanos_opt().unwrap_or_default(),
            password.len()
        );
        salt_bytes.copy_from_slice(&Sha256::digest(fallback.as_bytes())[..16]);
    }
    let salt = hex::encode(salt_bytes);
    let mut derived = [0_u8; PBKDF2_KEY_LEN];
    pbkdf2_hmac::<Sha256>(
        password.as_bytes(),
        salt.as_bytes(),
        PBKDF2_ITERATIONS,
        &mut derived,
    );
    (hex::encode(derived), salt)
}

fn preview_session_token(_email: &str) -> AppResult<String> {
    let mut token = [0_u8; 32];
    getrandom::getrandom(&mut token)
        .map_err(|_| AppError::internal("session token generation failed"))?;
    Ok(hex::encode(token))
}

fn sanitize_profile_value(profile: &Value, existing: &Value) -> Value {
    let text = |key: &str, limit: usize| {
        clean_text(profile.get(key), limit)
            .or_else(|| clean_text(existing.get(key), limit))
            .unwrap_or_default()
    };
    let digits = |key: &str, limit: usize| {
        let value = clean_text(profile.get(key), 240)
            .or_else(|| clean_text(existing.get(key), 240))
            .unwrap_or_default();
        digits_only(&value, limit)
    };
    json!({
        "name": text("name", 120),
        "phone": normalize_phone(&text("phone", 80)),
        "company": text("company", 180),
        "inn": digits("inn", 12),
        "kpp": digits("kpp", 9),
        "legalAddress": text("legalAddress", 240),
        "city": text("city", 120),
        "address": text("address", 240),
        "delivery": text("delivery", 120),
        "packaging": text("packaging", 120),
        "orderComment": text("orderComment", 500)
    })
}

fn sanitize_cart_items(items: &Value) -> Value {
    let lines = items
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(sanitize_cart_line_value)
                .take(MAX_CART_LINES)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    Value::Array(lines)
}

fn sanitize_cart_line_value(entry: &Value) -> Option<Value> {
    let (key_source, line) = if let Some(pair) = entry.as_array() {
        (
            pair.first().unwrap_or(&Value::Null),
            pair.get(1).unwrap_or(&Value::Null),
        )
    } else {
        (entry.get("key").unwrap_or(&Value::Null), entry)
    };
    if !line.is_object() {
        return None;
    }
    let variant = line.get("variant").unwrap_or(&Value::Null);
    let sku = clean_text(variant.get("sku"), 120)
        .or_else(|| clean_text(line.get("variantSku"), 120))
        .unwrap_or_default();
    if sku.is_empty() {
        return None;
    }
    let key = value_clean_string(key_source, 160)
        .or_else(|| clean_text(line.get("key"), 160))
        .unwrap_or_else(|| sku.clone());
    let qty = clamp_i64(
        line.get("qty")
            .and_then(Value::as_f64)
            .unwrap_or(1.0)
            .round() as i64,
        1,
        99_999,
    );
    let price = variant
        .get("price")
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
        .max(0.0);
    let line_value = json!({
        "key": clean_text(line.get("key"), 160).unwrap_or_else(|| key.clone()),
        "productId": clean_text(line.get("productId"), 160).unwrap_or_default(),
        "productName": clean_text(line.get("productName"), 220)
            .or_else(|| clean_text(variant.get("name"), 220))
            .unwrap_or_default(),
        "productImage": clean_text(line.get("productImage"), 500).unwrap_or_default(),
        "qty": qty,
        "variant": {
            "sku": sku,
            "name": clean_text(variant.get("name"), 220).unwrap_or_default(),
            "type": clean_text(variant.get("type"), 120).unwrap_or_default(),
            "size": clean_text(variant.get("size"), 120).unwrap_or_default(),
            "material": clean_text(variant.get("material"), 120).unwrap_or_default(),
            "price": price
        }
    });
    Some(json!([key, line_value]))
}

fn sanitize_favorite_items(items: &Value) -> Value {
    let mut seen: Vec<String> = Vec::new();
    let mut result: Vec<Value> = Vec::new();
    if let Some(items) = items.as_array() {
        for item in items {
            let Some(value) = value_clean_string(item, 160) else {
                continue;
            };
            if seen.iter().any(|seen| seen == &value) {
                continue;
            }
            seen.push(value.clone());
            result.push(json!(value));
            if result.len() >= MAX_FAVORITES {
                break;
            }
        }
    }
    Value::Array(result)
}

fn sanitize_saved_carts_input(items: &Value, include_internal: bool) -> Value {
    let carts = items
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|cart| sanitize_saved_cart_input(cart, include_internal))
                .take(MAX_SAVED_CARTS)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    Value::Array(carts)
}

fn sanitize_saved_cart_input(cart: &Value, include_internal: bool) -> Option<Value> {
    if !cart.is_object() {
        return None;
    }
    let entries = sanitize_cart_items(cart.get("items").unwrap_or(&Value::Null));
    if entries
        .as_array()
        .map(|items| items.is_empty())
        .unwrap_or(true)
    {
        return None;
    }
    let now = Utc::now().to_rfc3339();
    let created_at = clean_text(cart.get("createdAt"), 40)
        .or_else(|| clean_text(cart.get("updatedAt"), 40))
        .unwrap_or_else(|| now.clone());
    let updated_at = clean_text(cart.get("updatedAt"), 40).unwrap_or_else(|| created_at.clone());
    let mut history = cart
        .get("commentHistory")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|entry| {
                    let text = clean_text(entry.get("text"), 1000)?;
                    let visibility = if entry
                        .get("visibility")
                        .and_then(Value::as_str)
                        .map(|value| value == "internal")
                        .unwrap_or(false)
                    {
                        "internal"
                    } else {
                        "customer"
                    };
                    if visibility == "internal" && !include_internal {
                        return None;
                    }
                    Some(json!({
                        "at": clean_text(entry.get("at"), 40).unwrap_or_else(|| now.clone()),
                        "actor": clean_text(entry.get("actor"), 120).unwrap_or_default(),
                        "role": clean_text(entry.get("role"), 40).unwrap_or_default(),
                        "type": clean_text(entry.get("type"), 40).unwrap_or_else(|| "comment".to_string()),
                        "visibility": visibility,
                        "text": text
                    }))
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if history.len() > 20 {
        history = history.split_off(history.len() - 20);
    }
    let mut saved = serde_json::Map::new();
    saved.insert(
        "id".to_string(),
        json!(clean_text(cart.get("id"), 80)
            .unwrap_or_else(|| format!("SC-{}", Utc::now().timestamp_millis()))),
    );
    saved.insert(
        "title".to_string(),
        json!(
            clean_text(cart.get("title"), 120).unwrap_or_else(|| "Сохраненная корзина".to_string())
        ),
    );
    saved.insert("createdAt".to_string(), json!(created_at));
    saved.insert("updatedAt".to_string(), json!(updated_at));
    saved.insert(
        "date".to_string(),
        json!(clean_text(cart.get("date"), 80).unwrap_or_default()),
    );
    saved.insert("items".to_string(), entries);
    saved.insert(
        "qty".to_string(),
        json!(non_negative_rounded_i64(cart.get("qty"))),
    );
    saved.insert(
        "subtotal".to_string(),
        json!(non_negative_rounded_i64(cart.get("subtotal"))),
    );
    saved.insert(
        "discount".to_string(),
        json!(non_negative_rounded_i64(cart.get("discount"))),
    );
    saved.insert(
        "total".to_string(),
        json!(non_negative_rounded_i64(cart.get("total"))),
    );
    saved.insert(
        "status".to_string(),
        json!(
            if clean_text(cart.get("status"), 40).as_deref() == Some("sent") {
                "sent"
            } else {
                "draft"
            }
        ),
    );
    saved.insert(
        "sentAt".to_string(),
        json!(clean_text(cart.get("sentAt"), 40).unwrap_or_default()),
    );
    saved.insert(
        "sentOrderId".to_string(),
        json!(clean_text(cart.get("sentOrderId"), 80).unwrap_or_default()),
    );
    saved.insert(
        "customerComment".to_string(),
        json!(clean_text(cart.get("customerComment"), 1000)
            .or_else(|| clean_text(cart.get("comment"), 1000))
            .unwrap_or_default()),
    );
    saved.insert("commentHistory".to_string(), Value::Array(history));
    if include_internal {
        saved.insert(
            "managerComment".to_string(),
            json!(clean_text(cart.get("managerComment"), 1000).unwrap_or_default()),
        );
    }
    Some(Value::Object(saved))
}

fn sanitize_review_value(input: &Value, user: &Value) -> Option<Value> {
    if !input.is_object() {
        return None;
    }
    let product_id = clean_text(input.get("productId"), 120)?;
    let base_sku = clean_text(input.get("baseSku"), 120)?;
    let product_name = clean_text(input.get("productName"), 200).unwrap_or_default();
    let rating = clamp_i64(
        input
            .get("rating")
            .and_then(Value::as_f64)
            .unwrap_or(0.0)
            .round() as i64,
        1,
        5,
    );
    let text = clean_text(input.get("text"), 1000)?;
    if text.chars().count() < 5 {
        return None;
    }
    let email = string_field(user, "email")?;
    let author = string_field(user, "name")
        .or_else(|| string_field(user, "company"))
        .unwrap_or_else(|| email.clone());
    let now = Utc::now();
    Some(json!({
        "id": format!("REV-{}", now.timestamp_millis()),
        "productId": product_id,
        "baseSku": base_sku,
        "productName": product_name,
        "rating": rating,
        "text": text,
        "status": "pending",
        "userEmail": email,
        "authorName": author,
        "createdAt": now.to_rfc3339(),
        "updatedAt": now.to_rfc3339()
    }))
}

fn review_key(value: Option<&Value>) -> String {
    value
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase()
}

fn review_matches_order_item(review: &Value, item: &Value) -> bool {
    let review_product_id = review_key(review.get("productId"));
    let review_base_sku = review_key(review.get("baseSku"));
    let item_product_id = review_key(item.get("productId"));
    let item_base_sku = review_key(item.get("baseSku"));
    let item_key = review_key(item.get("key"));
    let variant_sku = item
        .get("variant")
        .and_then(|variant| variant.get("sku"))
        .or_else(|| item.get("sku"));
    let variant_sku = review_key(variant_sku);
    (!review_product_id.is_empty()
        && !item_product_id.is_empty()
        && review_product_id == item_product_id)
        || (!review_base_sku.is_empty()
            && !item_base_sku.is_empty()
            && review_base_sku == item_base_sku)
        || (!review_base_sku.is_empty() && !item_key.is_empty() && review_base_sku == item_key)
        || (!review_base_sku.is_empty()
            && !variant_sku.is_empty()
            && review_base_sku == variant_sku)
}

fn has_eligible_review_order(store: &Value, user: &Value, review: &Value) -> bool {
    let email = normalize_email(&string_field(user, "email").unwrap_or_default());
    if email.is_empty() {
        return false;
    }
    store
        .get("orders")
        .and_then(Value::as_array)
        .map(|orders| {
            orders.iter().any(|order| {
                let order_email = normalize_email(
                    &string_field(order, "userEmail")
                        .or_else(|| {
                            order
                                .get("customer")
                                .and_then(|customer| string_field(customer, "email"))
                        })
                        .unwrap_or_default(),
                );
                let status = review_key(order.get("status"));
                if order_email != email || !matches!(status.as_str(), "shipped" | "done") {
                    return false;
                }
                order
                    .get("items")
                    .and_then(Value::as_array)
                    .map(|items| {
                        items
                            .iter()
                            .any(|item| review_matches_order_item(review, item))
                    })
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn has_duplicate_review(store: &Value, user: &Value, review: &Value) -> bool {
    let email = normalize_email(&string_field(user, "email").unwrap_or_default());
    let review_product_id = review_key(review.get("productId"));
    let review_base_sku = review_key(review.get("baseSku"));
    store
        .get("reviews")
        .and_then(Value::as_array)
        .map(|reviews| {
            reviews.iter().any(|item| {
                normalize_email(&string_field(item, "userEmail").unwrap_or_default()) == email
                    && ((!review_product_id.is_empty()
                        && review_key(item.get("productId")) == review_product_id)
                        || (!review_base_sku.is_empty()
                            && review_key(item.get("baseSku")) == review_base_sku))
            })
        })
        .unwrap_or(false)
}

fn non_negative_rounded_i64(value: Option<&Value>) -> i64 {
    std::cmp::max(
        0,
        value.and_then(Value::as_f64).unwrap_or(0.0).round() as i64,
    )
}

fn digits_only(value: &str, limit: usize) -> String {
    value
        .chars()
        .filter(|ch| ch.is_ascii_digit())
        .take(limit)
        .collect()
}

async fn build_order_record(pool: &PgPool, data: &Value, user: Option<&Value>) -> AppResult<Value> {
    let items = trusted_order_lines(pool, data).await?;
    build_order_record_from_trusted_items(data, user, items)
}

fn build_order_record_from_trusted_items(
    data: &Value,
    user: Option<&Value>,
    items: Vec<Value>,
) -> AppResult<Value> {
    if items.is_empty() {
        return Err(AppError::bad_request(
            "empty_order",
            "В заказе нет товаров.",
        ));
    }
    let subtotal: i64 = items
        .iter()
        .map(|item| item.get("subtotal").and_then(Value::as_i64).unwrap_or(0))
        .sum();
    let discount_percent = basket_discount(subtotal);
    let discount_amount = ((subtotal as f64) * (discount_percent as f64 / 100.0)).round() as i64;
    let total = subtotal - discount_amount;
    if total < MIN_ORDER_TOTAL {
        return Err(AppError::bad_request(
            "minimum_total",
            "Минимальная сумма заказа 30 000 ₽.",
        ));
    }
    if let Some(client_total) = data.get("total").and_then(Value::as_f64) {
        if client_total.is_finite() && (client_total.round() as i64 - total).abs() > 1 {
            return Err(AppError::conflict(
                "ORDER_TOTAL_MISMATCH",
                "Order total does not match current catalog prices.",
            ));
        }
    }
    let customer = data.get("customer").unwrap_or(&Value::Null);
    let phone = normalize_phone(
        string_field(customer, "phone")
            .or_else(|| user.and_then(|user| string_field(user, "phone")))
            .unwrap_or_default()
            .as_str(),
    );
    if phone.is_empty() {
        return Err(AppError::bad_request("missing_phone", "Укажите телефон."));
    }
    let now = Utc::now();
    let id = format!("SO-{:06}", now.timestamp_millis().rem_euclid(1_000_000));
    Ok(json!({
        "id": id,
        "date": now.to_rfc3339(),
        "createdAt": now.to_rfc3339(),
        "status": "new",
        "userEmail": user.and_then(|user| string_field(user, "email")).unwrap_or_default(),
        "customer": {
            "name": string_field(customer, "name").or_else(|| user.and_then(|user| string_field(user, "name"))).unwrap_or_default(),
            "company": string_field(customer, "company").unwrap_or_default(),
            "inn": string_field(customer, "inn").unwrap_or_default(),
            "kpp": string_field(customer, "kpp").unwrap_or_default(),
            "phone": phone,
            "email": string_field(customer, "email").or_else(|| user.and_then(|user| string_field(user, "email"))).unwrap_or_default(),
            "city": string_field(customer, "city").unwrap_or_default(),
            "address": string_field(customer, "address").or_else(|| user.and_then(|user| string_field(user, "address"))).unwrap_or_default(),
            "legalAddress": string_field(customer, "legalAddress").unwrap_or_default(),
            "delivery": string_field(customer, "delivery").unwrap_or_default(),
            "packaging": string_field(customer, "packaging").unwrap_or_default(),
            "layoutFileName": string_field(customer, "layoutFileName").unwrap_or_default(),
            "comment": string_field(customer, "comment").unwrap_or_default()
        },
        "items": items,
        "subtotal": subtotal,
        "discountPercent": discount_percent,
        "discountAmount": discount_amount,
        "total": total,
        "clientTotal": data.get("total").and_then(Value::as_f64).unwrap_or(0.0),
        "promo": string_field(data, "promo").unwrap_or_default(),
        "source": string_field(data, "source").unwrap_or_else(|| "site".to_string())
    }))
}

async fn trusted_order_lines(pool: &PgPool, data: &Value) -> AppResult<Vec<Value>> {
    let requested = data
        .get("items")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|line| {
                    let variant = line.get("variant").unwrap_or(&Value::Null);
                    let sku = clean_text(variant.get("sku"), 120)
                        .or_else(|| clean_text(line.get("sku"), 120))
                        .or_else(|| clean_text(line.get("variantSku"), 120))?;
                    let qty = clamp_i64(
                        line.get("qty")
                            .and_then(Value::as_f64)
                            .unwrap_or(1.0)
                            .round() as i64,
                        1,
                        99_999,
                    );
                    Some((sku, qty))
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if requested.is_empty() {
        return Ok(Vec::new());
    }
    let skus = requested
        .iter()
        .map(|(sku, _)| sku.clone())
        .collect::<Vec<_>>();
    let rows = sqlx::query(
        "SELECT v.sku,
                concat_ws(' / ', NULLIF(p.name, ''), NULLIF(v.type, ''), NULLIF(v.size, ''), NULLIF(v.material, '')) AS variant_name,
                v.type, v.size, v.material, v.price::double precision AS price, p.id AS product_id, p.base_sku, p.name AS product_name, COALESCE(p.status, 'published') AS status, COALESCE(img.url, '') AS product_image
         FROM variants v
         JOIN public_catalog_products p ON p.id = v.product_id
         LEFT JOIN LATERAL (
           SELECT url
           FROM images
           WHERE product_id = p.id
           ORDER BY is_primary DESC, id ASC
           LIMIT 1
         ) img ON TRUE
         WHERE v.sku = ANY($1)",
    )
    .bind(&skus)
    .fetch_all(pool)
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    let mut trusted = HashMap::<String, Value>::new();
    for row in rows {
        let sku: String = row.try_get("sku").unwrap_or_default();
        let status: String = row
            .try_get("status")
            .unwrap_or_else(|_| "published".to_string());
        if sku.is_empty() || status != "published" {
            continue;
        }
        trusted.insert(
            sku.clone(),
            json!({
                "productId": row.try_get::<String, _>("product_id").unwrap_or_default(),
                "productName": row.try_get::<String, _>("product_name").unwrap_or_default(),
                "baseSku": row.try_get::<String, _>("base_sku").unwrap_or_default(),
                "variant": {
                    "sku": sku,
                    "name": row.try_get::<String, _>("variant_name").unwrap_or_default(),
                    "type": row.try_get::<String, _>("type").unwrap_or_default(),
                    "size": row.try_get::<String, _>("size").unwrap_or_default(),
                    "material": row.try_get::<String, _>("material").unwrap_or_default(),
                    "price": row_i64(&row, "price")
                },
                "productImage": row.try_get::<String, _>("product_image").unwrap_or_default()
            }),
        );
    }
    let mut out = Vec::new();
    for (sku, qty) in requested {
        let Some(trusted_line) = trusted.get(&sku) else {
            return Err(AppError::bad_request(
                "invalid_sku",
                "Order item SKU is not available.",
            ));
        };
        let price = trusted_line
            .get("variant")
            .and_then(|variant| variant.get("price"))
            .and_then(Value::as_i64)
            .unwrap_or(0);
        if price <= 0 {
            return Err(AppError::bad_request(
                "invalid_price",
                "Order item price is not available.",
            ));
        }
        out.push(json!({
            "key": sku,
            "productId": trusted_line.get("productId").cloned().unwrap_or_default(),
            "productName": trusted_line.get("productName").cloned().unwrap_or_default(),
            "productImage": trusted_line.get("productImage").cloned().unwrap_or_default(),
            "baseSku": trusted_line.get("baseSku").cloned().unwrap_or_default(),
            "qty": qty,
            "variant": trusted_line.get("variant").cloned().unwrap_or_default(),
            "subtotal": price * qty
        }));
    }
    Ok(out)
}

fn basket_discount(subtotal: i64) -> i64 {
    BASKET_DISCOUNT_TIERS
        .iter()
        .rev()
        .find_map(|(amount, discount)| {
            if subtotal >= *amount {
                Some(*discount)
            } else {
                None
            }
        })
        .unwrap_or(0)
}

fn apply_buyer_order_comment_patch(
    store: &mut Value,
    data: &Value,
    user: &Value,
) -> AppResult<Value> {
    let order_id = clean_text(data.get("id"), 120).unwrap_or_default();
    let text = clean_text(data.get("commentText"), 1200).unwrap_or_default();
    if text.is_empty() {
        return Err(AppError::bad_request(
            "empty_comment",
            "Напишите сообщение по заказу.",
        ));
    }
    let user_email = normalize_email(&string_field(user, "email").unwrap_or_default());
    if user_email.is_empty() {
        return Err(AppError::unauthorized("Нужно войти в аккаунт."));
    }
    if !store.is_object() {
        *store = default_store_value();
    }
    let Some(map) = store.as_object_mut() else {
        return Err(AppError::internal("store is invalid"));
    };
    let orders = map.entry("orders").or_insert_with(|| json!([]));
    if !orders.is_array() {
        *orders = json!([]);
    }
    let Some(items) = orders.as_array_mut() else {
        return Err(AppError::internal("orders store is invalid"));
    };
    let actor = string_field(user, "name")
        .or_else(|| string_field(user, "company"))
        .unwrap_or_else(|| user_email.clone());
    let now = Utc::now();
    for order in items.iter_mut() {
        let is_target = order
            .get("id")
            .and_then(Value::as_str)
            .map(|id| id == order_id)
            .unwrap_or(false);
        if !is_target {
            continue;
        }
        let customer_email = order
            .get("customer")
            .and_then(|customer| customer.get("email"))
            .and_then(Value::as_str)
            .or_else(|| order.get("userEmail").and_then(Value::as_str))
            .map(normalize_email)
            .unwrap_or_default();
        if customer_email != user_email {
            continue;
        }
        let original = order.clone();
        let mut next = order.as_object().cloned().unwrap_or_default();
        let current = original.get("crmThread").and_then(Value::as_array).cloned();
        next.insert(
            "crmThread".to_string(),
            prepend_limited(
                current,
                json!({
                    "id": format!("CRM-{}", now.timestamp_millis()),
                    "at": now.to_rfc3339(),
                    "actor": actor,
                    "role": "buyer",
                    "visibility": "customer",
                    "text": text
                }),
                200,
            ),
        );
        next.insert("updatedAt".to_string(), json!(now.to_rfc3339()));
        next.insert("updatedBy".to_string(), json!(user_email));
        let updated = Value::Object(next);
        *order = updated.clone();
        return Ok(public_order_value(&updated));
    }
    Err(AppError::not_found("not_found", "Заказ не найден."))
}

fn push_order_record(store: &mut Value, order: Value) {
    if !store.is_object() {
        *store = default_store_value();
    }
    let Some(map) = store.as_object_mut() else {
        return;
    };
    let orders = map.entry("orders").or_insert_with(|| json!([]));
    if !orders.is_array() {
        *orders = json!([]);
    }
    if let Some(items) = orders.as_array_mut() {
        items.insert(0, order);
    }
}

fn unique_non_empty_values(values: Vec<String>, limit: usize) -> Value {
    let mut seen = Vec::<String>::new();
    let mut out = Vec::<Value>::new();
    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        if seen.iter().any(|item| item == trimmed) {
            continue;
        }
        seen.push(trimmed.to_string());
        out.push(json!(trimmed));
        if out.len() >= limit {
            break;
        }
    }
    Value::Array(out)
}

fn existing_string_array(value: Option<&Value>) -> Vec<String> {
    value
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn merge_companies(primary: Value, existing: Option<&Value>) -> Value {
    let mut seen = Vec::<String>::new();
    let mut out = Vec::<Value>::new();
    let iter = std::iter::once(primary).chain(
        existing
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
    );
    for company in iter {
        let name = string_field(&company, "name").unwrap_or_default();
        let inn = string_field(&company, "inn").unwrap_or_default();
        if name.is_empty() && inn.is_empty() {
            continue;
        }
        let key = if inn.is_empty() {
            name.to_lowercase()
        } else {
            inn.clone()
        };
        if seen.iter().any(|item| item == &key) {
            continue;
        }
        seen.push(key);
        out.push(company);
        if out.len() >= 10 {
            break;
        }
    }
    Value::Array(out)
}

fn update_user_profile_from_order(store: &mut Value, order: &Value) {
    let email = normalize_email(&string_field(order, "userEmail").unwrap_or_default());
    if email.is_empty() {
        return;
    }
    let Some(users) = store
        .as_object_mut()
        .and_then(|map| map.get_mut("users"))
        .and_then(Value::as_object_mut)
    else {
        return;
    };
    let Some(existing) = users.get(&email).cloned() else {
        return;
    };
    let customer = order.get("customer").unwrap_or(&Value::Null);
    let customer_name = string_field(customer, "name").unwrap_or_default();
    let company = string_field(customer, "company").unwrap_or_default();
    let inn = string_field(customer, "inn").unwrap_or_default();
    let kpp = string_field(customer, "kpp").unwrap_or_default();
    let legal_address = string_field(customer, "legalAddress").unwrap_or_default();
    let phone = string_field(customer, "phone").unwrap_or_default();
    let city = string_field(customer, "city").unwrap_or_default();
    let address = string_field(customer, "address").unwrap_or_default();
    let delivery = string_field(customer, "delivery").unwrap_or_default();
    let packaging = string_field(customer, "packaging").unwrap_or_default();
    let layout_file = string_field(customer, "layoutFileName").unwrap_or_default();
    let comment = string_field(customer, "comment").unwrap_or_default();
    let primary_company = json!({
        "name": if company.is_empty() { string_field(&existing, "company").unwrap_or_default() } else { company.clone() },
        "inn": if inn.is_empty() { string_field(&existing, "inn").unwrap_or_default() } else { inn.clone() },
        "kpp": if kpp.is_empty() { string_field(&existing, "kpp").unwrap_or_default() } else { kpp.clone() },
        "legalAddress": if legal_address.is_empty() { string_field(&existing, "legalAddress").unwrap_or_default() } else { legal_address.clone() },
    });
    let mut next = existing.as_object().cloned().unwrap_or_default();
    if string_field(&existing, "name")
        .unwrap_or_default()
        .is_empty()
    {
        next.insert("name".to_string(), json!(customer_name));
    }
    next.insert(
        "company".to_string(),
        json!(if company.is_empty() {
            string_field(&existing, "company").unwrap_or_default()
        } else {
            company
        }),
    );
    next.insert(
        "inn".to_string(),
        json!(if inn.is_empty() {
            string_field(&existing, "inn").unwrap_or_default()
        } else {
            inn
        }),
    );
    next.insert(
        "kpp".to_string(),
        json!(if kpp.is_empty() {
            string_field(&existing, "kpp").unwrap_or_default()
        } else {
            kpp
        }),
    );
    next.insert(
        "legalAddress".to_string(),
        json!(if legal_address.is_empty() {
            string_field(&existing, "legalAddress").unwrap_or_default()
        } else {
            legal_address
        }),
    );
    next.insert(
        "phone".to_string(),
        json!(if phone.is_empty() {
            string_field(&existing, "phone").unwrap_or_default()
        } else {
            phone
        }),
    );
    next.insert("email".to_string(), json!(email.clone()));
    next.insert(
        "city".to_string(),
        json!(if city.is_empty() {
            string_field(&existing, "city").unwrap_or_default()
        } else {
            city
        }),
    );
    next.insert(
        "address".to_string(),
        json!(if address.is_empty() {
            string_field(&existing, "address").unwrap_or_default()
        } else {
            address.clone()
        }),
    );
    let mut addresses = vec![address];
    addresses.extend(existing_string_array(existing.get("addresses")));
    next.insert(
        "addresses".to_string(),
        unique_non_empty_values(addresses, 10),
    );
    next.insert(
        "delivery".to_string(),
        json!(if delivery.is_empty() {
            string_field(&existing, "delivery").unwrap_or_default()
        } else {
            delivery
        }),
    );
    next.insert(
        "packaging".to_string(),
        json!(if packaging.is_empty() {
            string_field(&existing, "packaging").unwrap_or_default()
        } else {
            packaging
        }),
    );
    let mut layout_files = vec![layout_file];
    layout_files.extend(existing_string_array(existing.get("layoutFiles")));
    next.insert(
        "layoutFiles".to_string(),
        unique_non_empty_values(layout_files, 20),
    );
    next.insert(
        "orderComment".to_string(),
        json!(if comment.is_empty() {
            string_field(&existing, "orderComment").unwrap_or_default()
        } else {
            comment.clone()
        }),
    );
    let mut comments = vec![comment];
    comments.extend(existing_string_array(existing.get("orderComments")));
    next.insert(
        "orderComments".to_string(),
        unique_non_empty_values(comments, 10),
    );
    next.insert(
        "companies".to_string(),
        merge_companies(primary_company, existing.get("companies")),
    );
    next.insert("lastCustomer".to_string(), customer.clone());
    next.insert("updatedAt".to_string(), json!(Utc::now().to_rfc3339()));
    users.insert(email, Value::Object(next));
}

fn push_brief_record(store: &mut Value, brief: Value, order: Value) {
    if !store.is_object() {
        *store = default_store_value();
    }
    let Some(map) = store.as_object_mut() else {
        return;
    };
    let briefs = map.entry("briefs").or_insert_with(|| json!([]));
    if !briefs.is_array() {
        *briefs = json!([]);
    }
    if let Some(items) = briefs.as_array_mut() {
        items.insert(0, brief);
        items.truncate(500);
    }
    let orders = map.entry("orders").or_insert_with(|| json!([]));
    if !orders.is_array() {
        *orders = json!([]);
    }
    if let Some(items) = orders.as_array_mut() {
        items.insert(0, order);
        items.truncate(1000);
    }
}

fn sanitize_order_line(line: &Value) -> Value {
    let variant = line.get("variant").unwrap_or(&Value::Null);
    json!({
        "key": string_field(line, "key").unwrap_or_default(),
        "productId": string_field(line, "productId").unwrap_or_default(),
        "productName": string_field(line, "productName").unwrap_or_default(),
        "productImage": string_field(line, "productImage").unwrap_or_default(),
        "qty": std::cmp::max(1, line.get("qty").and_then(Value::as_i64).unwrap_or(1)),
        "variant": {
            "sku": string_field(variant, "sku").unwrap_or_default(),
            "name": string_field(variant, "name").unwrap_or_default(),
            "type": string_field(variant, "type").unwrap_or_default(),
            "size": string_field(variant, "size").unwrap_or_default(),
            "material": string_field(variant, "material").unwrap_or_default(),
            "price": variant.get("price").and_then(Value::as_f64).unwrap_or(0.0)
        }
    })
}

fn build_brief_record(data: &Value, user: Option<&Value>) -> AppResult<(Value, Value)> {
    let product = clean_text(data.get("product"), 120).unwrap_or_default();
    let quantity = std::cmp::max(
        0,
        data.get("quantity")
            .and_then(Value::as_f64)
            .unwrap_or(0.0)
            .round() as i64,
    );
    let name = clean_text(data.get("name"), 160)
        .or_else(|| user.and_then(|user| string_field(user, "name")))
        .unwrap_or_default();
    let contact = clean_text(data.get("contact"), 180).unwrap_or_default();
    let email = clean_text(data.get("email"), 180)
        .or_else(|| user.and_then(|user| string_field(user, "email")))
        .unwrap_or_default()
        .to_ascii_lowercase();
    let comment = clean_text(data.get("comment"), 1200).unwrap_or_default();
    let layout_reference = clean_text(data.get("layoutReference"), 500).unwrap_or_default();
    let phone = normalize_phone(
        clean_text(data.get("phone"), 180)
            .unwrap_or_else(|| contact.clone())
            .as_str(),
    );

    if product.is_empty() {
        return Err(AppError::bad_request(
            "missing_product",
            "Выберите изделие.",
        ));
    }
    if quantity < 1 {
        return Err(AppError::bad_request("missing_quantity", "Укажите тираж."));
    }
    if contact.is_empty() && phone.is_empty() && email.is_empty() {
        return Err(AppError::bad_request(
            "missing_contact",
            "Укажите контакт для связи.",
        ));
    }
    if !valid_email(&email) {
        return Err(AppError::bad_request(
            "invalid_email",
            "Проверьте формат email.",
        ));
    }

    let now = Utc::now();
    let id = format!("BR-{:06}", now.timestamp_millis().rem_euclid(1_000_000));
    let brief = json!({
        "id": id,
        "type": "custom_print",
        "source": "custom",
        "status": "new",
        "createdAt": now.to_rfc3339(),
        "userEmail": user.and_then(|user| string_field(user, "email")).unwrap_or_else(|| email.clone()),
        "product": product,
        "quantity": quantity,
        "name": name.clone(),
        "contact": contact.clone(),
        "phone": phone,
        "email": email,
        "layoutReference": layout_reference.clone(),
        "comment": comment.clone()
    });
    let thread_text = format!(
        "Заявка на изделие с принтом: {}, тираж {} шт.{}{}",
        brief["product"].as_str().unwrap_or(""),
        quantity,
        if layout_reference.is_empty() {
            String::new()
        } else {
            format!(" Макет/ссылка: {layout_reference}.")
        },
        if comment.is_empty() {
            String::new()
        } else {
            format!(" Комментарий: {comment}")
        }
    );
    let customer_comment = [
        if contact.is_empty() {
            String::new()
        } else {
            format!("Контакт: {contact}")
        },
        comment.clone(),
    ]
    .into_iter()
    .filter(|text| !text.is_empty())
    .collect::<Vec<_>>()
    .join("\n");
    let actor = if name.is_empty() {
        "Покупатель".to_string()
    } else {
        name.clone()
    };
    let order = json!({
        "id": id,
        "date": now.to_rfc3339(),
        "createdAt": now.to_rfc3339(),
        "status": "new",
        "userEmail": brief["userEmail"].clone(),
        "requestType": "custom_print",
        "source": "custom_brief",
        "customer": {
            "name": brief["name"].clone(),
            "company": "",
            "inn": "",
            "kpp": "",
            "phone": brief["phone"].clone(),
            "email": brief["email"].clone(),
            "city": "",
            "address": "",
            "legalAddress": "",
            "delivery": "",
            "packaging": "",
            "layoutFileName": brief["layoutReference"].clone(),
            "comment": customer_comment
        },
        "customBrief": brief.clone(),
        "items": [],
        "total": 0,
        "promo": "",
        "crmThread": [{
            "id": format!("CRM-{}", now.timestamp_millis()),
            "at": now.to_rfc3339(),
            "actor": actor,
            "role": "buyer",
            "visibility": "customer",
            "text": thread_text
        }]
    });
    Ok((brief, order))
}

fn clean_text(value: Option<&Value>, limit: usize) -> Option<String> {
    value
        .and_then(Value::as_str)
        .map(|text| text.trim().chars().take(limit).collect::<String>())
        .filter(|text| !text.is_empty())
}

fn value_clean_string(value: &Value, limit: usize) -> Option<String> {
    let text = match value {
        Value::String(text) => text.clone(),
        Value::Number(number) => number.to_string(),
        Value::Bool(flag) => flag.to_string(),
        _ => String::new(),
    };
    let text = text.trim().chars().take(limit).collect::<String>();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn valid_email(value: &str) -> bool {
    value.is_empty()
        || (value.contains('@')
            && value.contains('.')
            && !value.chars().any(char::is_whitespace)
            && !value.starts_with('@')
            && !value.ends_with('@'))
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn normalize_phone(raw: &str) -> String {
    let mut digits: String = raw.chars().filter(|ch| ch.is_ascii_digit()).collect();
    if digits.is_empty() {
        return String::new();
    }
    if digits.starts_with('8') && digits.len() == 11 {
        digits = format!("7{}", &digits[1..]);
    }
    if digits.starts_with('7') {
        let main = &digits[1..std::cmp::min(digits.len(), 11)];
        let mut formatted = "+7".to_string();
        if !main.is_empty() {
            formatted.push_str(&format!(" {}", &main[..std::cmp::min(main.len(), 3)]));
        }
        if main.len() > 3 {
            formatted.push_str(&format!(" {}", &main[3..std::cmp::min(main.len(), 6)]));
        }
        if main.len() > 6 {
            formatted.push_str(&format!("-{}", &main[6..std::cmp::min(main.len(), 8)]));
        }
        if main.len() > 8 {
            formatted.push_str(&format!("-{}", &main[8..std::cmp::min(main.len(), 10)]));
        }
        if digits.len() > 11 {
            formatted.push_str(&format!(" {}", &digits[11..]));
        }
        return formatted;
    }
    let country_len = if digits.len() > 11 {
        3
    } else if digits.len() > 10 {
        2
    } else {
        1
    };
    let country = &digits[..std::cmp::min(country_len, digits.len())];
    let rest = &digits[std::cmp::min(country_len, digits.len())..];
    let mut groups = vec![format!("+{country}")];
    for chunk in rest.as_bytes().chunks(3) {
        groups.push(String::from_utf8_lossy(chunk).to_string());
    }
    groups.join(" ")
}

fn store_nested_items(store: &Value, bucket: &str, email: &str) -> Value {
    store
        .get(bucket)
        .and_then(Value::as_object)
        .and_then(|items| items.get(email))
        .and_then(|record| record.get("items"))
        .filter(|items| items.is_array())
        .cloned()
        .unwrap_or_else(|| json!([]))
}

fn set_store_nested_items(store: &mut Value, bucket: &str, email: &str, items: Value) {
    if !store.is_object() {
        *store = default_store_value();
    }
    let Some(map) = store.as_object_mut() else {
        return;
    };
    let bucket_value = map.entry(bucket.to_string()).or_insert_with(|| json!({}));
    if !bucket_value.is_object() {
        *bucket_value = json!({});
    }
    if let Some(records) = bucket_value.as_object_mut() {
        records.insert(
            email.to_string(),
            json!({
                "items": items,
                "updatedAt": Utc::now().to_rfc3339()
            }),
        );
    }
}

fn user_orders(store: &Value, email: &str) -> Value {
    let email = email.to_ascii_lowercase();
    let orders = store
        .get("orders")
        .and_then(Value::as_array)
        .map(|orders| {
            orders
                .iter()
                .filter(|order| {
                    order
                        .get("userEmail")
                        .and_then(Value::as_str)
                        .map(|value| value.eq_ignore_ascii_case(&email))
                        .unwrap_or(false)
                        || order
                            .get("customer")
                            .and_then(|customer| customer.get("email"))
                            .and_then(Value::as_str)
                            .map(|value| value.eq_ignore_ascii_case(&email))
                            .unwrap_or(false)
                })
                .map(public_order_value)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    Value::Array(orders)
}

fn public_order_value(order: &Value) -> Value {
    let mut public = order.clone();
    if let Some(map) = public.as_object_mut() {
        if let Some(thread) = map.get("crmThread").and_then(Value::as_array) {
            map.insert(
                "crmThread".to_string(),
                Value::Array(
                    thread
                        .iter()
                        .filter(|entry| {
                            entry
                                .get("visibility")
                                .and_then(Value::as_str)
                                .map(|visibility| visibility != "internal")
                                .unwrap_or(true)
                        })
                        .cloned()
                        .collect(),
                ),
            );
        }
    }
    public
}

fn user_reviews(store: &Value, email: &str) -> Value {
    Value::Array(
        store
            .get("reviews")
            .and_then(Value::as_array)
            .map(|reviews| {
                reviews
                    .iter()
                    .filter(|review| {
                        review
                            .get("userEmail")
                            .and_then(Value::as_str)
                            .map(|value| value == email)
                            .unwrap_or(false)
                    })
                    .cloned()
                    .collect()
            })
            .unwrap_or_default(),
    )
}

fn saved_carts_for_user(store: &Value, email: &str, include_internal: bool) -> Value {
    let items = store_nested_items(store, "savedCarts", email);
    let carts = items
        .as_array()
        .map(|saved_carts| {
            saved_carts
                .iter()
                .map(|cart| sanitize_saved_cart_value(cart, include_internal))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    Value::Array(carts)
}

fn sanitize_saved_cart_value(cart: &Value, include_internal: bool) -> Value {
    let mut next = cart.clone();
    if include_internal {
        return next;
    }
    if let Some(map) = next.as_object_mut() {
        map.remove("managerComment");
        if let Some(history) = map.get("commentHistory").and_then(Value::as_array) {
            map.insert(
                "commentHistory".to_string(),
                Value::Array(
                    history
                        .iter()
                        .filter(|entry| {
                            entry
                                .get("visibility")
                                .and_then(Value::as_str)
                                .map(|visibility| visibility != "internal")
                                .unwrap_or(true)
                        })
                        .cloned()
                        .collect(),
                ),
            );
        }
    }
    next
}

fn verify_password_hash(password: &str, salt_hex: &str, hash_hex: &str) -> bool {
    if salt_hex.len() != 32 || !salt_hex.chars().all(|value| value.is_ascii_hexdigit()) {
        return false;
    }
    let salt = salt_hex.as_bytes();
    let expected = match hex::decode(hash_hex) {
        Ok(value) if value.len() == PBKDF2_KEY_LEN => value,
        _ => return false,
    };
    let mut derived = [0_u8; PBKDF2_KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut derived);
    constant_time_eq(&derived, &expected)
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    let diff = left
        .iter()
        .zip(right.iter())
        .fold(0_u8, |acc, (a, b)| acc | (a ^ b));
    diff == 0
}

fn content_text(content: &Value, key: &str, fallback: &str) -> String {
    content
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
        .trim()
        .to_string()
}

fn render_content_page(spec: &ContentPageSpec, content: &Value) -> String {
    render_content_page_with_routes(spec, content, &RUST_ROUTES)
}

fn render_content_page_with_routes(
    spec: &ContentPageSpec,
    content: &Value,
    routes: &RenderRoutes,
) -> String {
    let title = content_text(content, spec.title_key, spec.default_title);
    let lead = content_text(content, spec.lead_key, spec.default_lead);
    let text = content_text(content, spec.text_key, spec.default_text);
    let nav = CONTENT_PAGES
        .iter()
        .map(|page| {
            format!(
                "<a href=\"{}{}\">{}</a>",
                routes.content_path_prefix,
                page.slug,
                escape_html(&content_text(content, page.title_key, page.default_title))
            )
        })
        .collect::<Vec<_>>()
        .join("");
    let extra = match spec.slug {
        "about" => render_content_pair(
            content,
            "aboutPageProductionTitle",
            "Производство текстиля с принтами",
            "aboutPageProductionText",
            "Производственный цикл включает печать, раскрой, пошив, контроль качества, упаковку, маркировку и подготовку к отгрузке.",
        ),
        "business" => render_business_content(content),
        "contacts" => render_contacts_content(content),
        "marketplaces" => render_marketplaces_content(content),
        _ => String::new(),
    };
    format!(
        "<main class=\"rust-content-page\" data-rust-content-page=\"{}\"><nav><a href=\"/\">На главную</a> <a href=\"/catalog\">В каталог</a></nav><div class=\"rust-content-nav\">{}</div><section class=\"rust-content-hero\"><h1>{}</h1><p>{}</p></section><article class=\"rust-content-panel\"><p>{}</p></article>{}</main>",
        spec.slug,
        nav,
        escape_html(&title),
        escape_html(&lead),
        escape_html(&text),
        extra
    )
}

fn render_content_pair(
    content: &Value,
    title_key: &str,
    default_title: &str,
    text_key: &str,
    default_text: &str,
) -> String {
    format!(
        "<article class=\"rust-content-panel\"><h2>{}</h2><p>{}</p></article>",
        escape_html(&content_text(content, title_key, default_title)),
        escape_html(&content_text(content, text_key, default_text))
    )
}

fn render_business_content(content: &Value) -> String {
    let cards = [
        (
            "businessDiscountTitle",
            "Скидка от суммы",
            "businessDiscountText",
            "Скидка пересчитывается автоматически по общей сумме корзины.",
        ),
        (
            "businessProductionTitle",
            "Производство и комплектация",
            "businessProductionText",
            "Печать, раскрой, пошив, упаковка и подготовка к отгрузке выполняются в одном процессе.",
        ),
        (
            "businessManagerTitle",
            "Связь с менеджером",
            "businessManagerText",
            "После отправки корзины менеджер связывается с покупателем и уточняет детали.",
        ),
        (
            "businessDocumentsTitle",
            "Документы и согласования",
            "businessDocumentsText",
            "Реквизиты, счет, макеты, штрихкоды и упаковку можно согласовать до запуска партии.",
        ),
    ];
    format!(
        "<section class=\"rust-content-grid\">{}</section>",
        cards
            .iter()
            .map(|(title_key, default_title, text_key, default_text)| {
                render_content_pair(content, title_key, default_title, text_key, default_text)
            })
            .collect::<Vec<_>>()
            .join("")
    )
}

fn render_contacts_content(content: &Value) -> String {
    let legal = content_text(
        content,
        "contactsLegalAddress",
        "431815, Республика Мордовия, Атяшевский р-н, село Наборные Сыреси, ул. Крупской, д. 18",
    );
    let production = content_text(
        content,
        "contactsProductionAddress",
        "г. Курск, ул. Литовская, д. 12",
    );
    let email = content_text(content, "footerEmail", "ip.burago@yandex.ru");
    let phone = content_text(content, "footerPhone", "+7 901 879-41-62");
    format!(
        "<section class=\"rust-content-grid\"><article class=\"rust-content-panel\"><h2>Отдел опта</h2><p><a href=\"mailto:{}\">{}</a></p><p><a href=\"tel:{}\">{}</a></p></article><article class=\"rust-content-panel\"><h2>Юридический адрес</h2><p class=\"rust-address\">{}</p></article><article class=\"rust-content-panel\"><h2>Адрес производства</h2><p class=\"rust-address\">{}</p></article></section>",
        escape_attr(&email),
        escape_html(&email),
        escape_attr(&phone.replace([' ', '-'], "")),
        escape_html(&phone),
        escape_html(&legal),
        escape_html(&production)
    )
}

fn render_marketplaces_content(content: &Value) -> String {
    let cards = [
        (
            "marketplaceOneName",
            "Wildberries",
            "marketplaceOneTitle",
            "Витрина Sobag",
            "marketplaceOneText",
            "Витрина для просмотра части готового ассортимента Sobag.",
        ),
        (
            "marketplaceTwoName",
            "Ozon",
            "marketplaceTwoTitle",
            "Товары в наличии",
            "marketplaceTwoText",
            "Подходит для просмотра готовых коллекций.",
        ),
        (
            "marketplaceThreeName",
            "Яндекс Маркет",
            "marketplaceThreeTitle",
            "Проверка ассортимента",
            "marketplaceThreeText",
            "Дополнительный канал для проверки готовых коллекций и наличия.",
        ),
    ];
    format!(
        "<section class=\"rust-content-grid\">{}</section>",
        cards
            .iter()
            .map(|(name_key, default_name, title_key, default_title, text_key, default_text)| {
                format!(
                    "<article class=\"rust-content-panel\"><span>{}</span><h2>{}</h2><p>{}</p></article>",
                    escape_html(&content_text(content, name_key, default_name)),
                    escape_html(&content_text(content, title_key, default_title)),
                    escape_html(&content_text(content, text_key, default_text))
                )
            })
            .collect::<Vec<_>>()
            .join("")
    )
}

fn render_listing_fragment(
    fragment_path: &str,
    query: &CatalogQuery,
    page: &ListingPage,
) -> String {
    render_listing_fragment_with_routes(fragment_path, &RUST_ROUTES, query, page)
}

fn render_listing_fragment_with_routes(
    fragment_path: &str,
    routes: &RenderRoutes,
    query: &CatalogQuery,
    page: &ListingPage,
) -> String {
    let cards = page
        .items
        .iter()
        .map(|product| render_card_with_routes(product, routes))
        .collect::<Vec<_>>()
        .join("");
    let shown = query.offset + page.items.len() as i64;
    let next = if shown < page.total {
        format!(
            "<div class=\"rust-pager\"><a href=\"?{}\" hx-get=\"{}?{}\" hx-target=\"#rustCatalog\" hx-swap=\"beforeend\">Показать еще</a></div>",
            listing_query_string(query, Some(shown)),
            fragment_path,
            listing_query_string(query, Some(shown))
        )
    } else {
        String::new()
    };
    format!(
        "<div class=\"rust-summary\">{} товаров, показано {}</div><div class=\"rust-grid\">{}</div>{}",
        page.total,
        shown.min(page.total),
        cards,
        next
    )
}

fn render_filter_panel(query: &CatalogQuery, page: &ListingPage) -> String {
    let groups = [
        ("category", "categories", "Категории"),
        ("collection", "collections", "Подборки"),
        ("holiday", "holidays", "Праздники"),
        ("size", "sizes", "Размер"),
        ("material", "materials", "Материал"),
        ("stock", "stock", "Наличие"),
    ];
    let body = groups
        .into_iter()
        .filter_map(|(param, bucket, title)| {
            let values = page.facet_options.get(bucket)?;
            let selected = query.filters.get(param).cloned().unwrap_or_default();
            let options = values
                .iter()
                .take(8)
                .map(|item| {
                    let checked = if selected.iter().any(|value| value == &item.value) {
                        " checked"
                    } else {
                        ""
                    };
                    format!(
                        "<label class=\"rust-filter-option\"><input type=\"checkbox\" name=\"{}\" value=\"{}\"{}><span>{}</span><span>{}</span></label>",
                        escape_attr(param),
                        escape_attr(&item.value),
                        checked,
                        escape_html(&item.value),
                        item.count
                    )
                })
                .collect::<Vec<_>>()
                .join("");
            (!options.is_empty()).then(|| {
                format!(
                    "<section class=\"rust-filter-group\"><h2>{}</h2>{}</section>",
                    escape_html(title),
                    options
                )
            })
        })
        .collect::<Vec<_>>()
        .join("");
    format!("<div class=\"rust-filter-head\">Фильтры</div>{body}")
}

fn render_clear_filters_link(fragment_path: &str, query: &CatalogQuery) -> String {
    if query.q.is_empty()
        && query.filters.values().all(Vec::is_empty)
        && query.min_price <= 0
        && query.max_price <= 0
    {
        return String::new();
    }
    format!(
        "<a class=\"rust-clear-filters\" href=\"?sort={}&pageSize={}\" hx-get=\"{}?sort={}&pageSize={}\" hx-target=\"#rustCatalog\" hx-push-url=\"true\">Снять фильтры</a>",
        url_encode(&query.sort),
        query.page_size,
        fragment_path,
        url_encode(&query.sort),
        query.page_size
    )
}

fn render_card(product: &CatalogCard) -> String {
    render_card_with_routes(product, &RUST_ROUTES)
}

fn render_card_with_routes(product: &CatalogCard, routes: &RenderRoutes) -> String {
    let image = if product.image.trim().is_empty() {
        "assets/production-hero-1.png"
    } else {
        product.image.as_str()
    };
    format!(
        "<article class=\"rust-card\"><a href=\"{}?baseSku={}\"><img loading=\"lazy\" src=\"{}\" alt=\"{}\"></a><div class=\"rust-card__body\"><small>{}</small><h2>{}</h2><p>{}</p><div class=\"rust-card__price\">от {} ₽</div></div></article>",
        routes.product_path,
        url_encode(&product.base_sku),
        escape_attr(image),
        escape_attr(&product.name),
        escape_html(&product.base_sku),
        escape_html(&product.name),
        escape_html(&product.category),
        product.min_price
    )
}

fn render_product_fragment(product: &ProductDetail, related: &[CatalogCard]) -> String {
    render_product_fragment_with_routes(product, related, &RUST_ROUTES)
}

fn render_product_fragment_with_routes(
    product: &ProductDetail,
    related: &[CatalogCard],
    routes: &RenderRoutes,
) -> String {
    let image = product
        .images
        .first()
        .map(|item| item.url.as_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("assets/production-hero-1.png");
    let thumbs = product
        .images
        .iter()
        .take(6)
        .map(|item| {
            format!(
                "<img loading=\"lazy\" src=\"{}\" alt=\"{}\">",
                escape_attr(&item.url),
                escape_attr(&product.name)
            )
        })
        .collect::<Vec<_>>()
        .join("");
    let chips = product
        .categories
        .iter()
        .chain(product.collections.iter())
        .chain(product.holidays.iter())
        .take(8)
        .map(|value| format!("<span class=\"rust-chip\">{}</span>", escape_html(value)))
        .collect::<Vec<_>>()
        .join("");
    let variants = product
        .variants
        .iter()
        .take(24)
        .map(|variant| {
            format!(
                "<tr><td>{}</td><td>{}</td><td>{}</td><td>{} ₽</td><td><input class=\"rust-variant-qty\" name=\"quantity_{}\" type=\"number\" min=\"0\" value=\"0\"></td></tr>",
                escape_html(&variant.sku),
                escape_html(&variant.variant_type),
                escape_html(&variant.size),
                variant.price,
                escape_attr(&variant.sku)
            )
        })
        .collect::<Vec<_>>()
        .join("");
    let detail = if product.detail_description.trim().is_empty() {
        product.description.as_str()
    } else {
        product.detail_description.as_str()
    };
    let related_html = if related.is_empty() {
        "<section class=\"rust-related\"><h2>Похожие товары</h2><p>Похожие товары появятся после уточнения категории.</p></section>".to_string()
    } else {
        format!(
            "<section class=\"rust-related\"><h2>Похожие товары</h2><div class=\"rust-grid\">{}</div></section>",
            related
                .iter()
                .map(|product| render_card_with_routes(product, routes))
                .collect::<Vec<_>>()
                .join("")
        )
    };
    format!(
        "<main class=\"rust-product\" id=\"rustProduct\"><a href=\"{}\">В каталог</a><div class=\"rust-product-layout\"><section class=\"rust-product-gallery\"><img class=\"rust-product-main-image\" src=\"{}\" alt=\"{}\"><div class=\"rust-product-thumbs\">{}</div></section><section class=\"rust-product-info\"><h1>{}</h1><div class=\"rust-product-meta\">{}</div><p>{}</p><p><b>Артикул:</b> {}</p><p><b>Цена:</b> от {} ₽</p><table class=\"rust-variant-table\"><thead><tr><th>SKU</th><th>Тип</th><th>Размер</th><th>Цена</th><th>Кол-во</th></tr></thead><tbody>{}</tbody></table></section></div>{}</main>",
        routes.catalog_path,
        escape_attr(image),
        escape_attr(&product.name),
        thumbs,
        escape_html(&product.name),
        chips,
        escape_html(detail),
        escape_html(&product.base_sku),
        product.min_price,
        variants,
        related_html
    )
}

fn selected_attr(current: &str, value: &str) -> &'static str {
    if current == value {
        " selected"
    } else {
        ""
    }
}

fn listing_query_string(query: &CatalogQuery, offset: Option<i64>) -> String {
    let mut pairs = Vec::new();
    if !query.q.is_empty() {
        pairs.push(format!("q={}", url_encode(&query.q)));
    }
    if query.sort != "relevance" {
        pairs.push(format!("sort={}", url_encode(&query.sort)));
    }
    pairs.push(format!("pageSize={}", query.page_size));
    if let Some(offset) = offset {
        pairs.push(format!("cursor={}", url_encode(&encode_cursor(offset))));
    }
    for (key, values) in &query.filters {
        for value in values {
            pairs.push(format!("{}={}", url_encode(key), url_encode(value)));
        }
    }
    pairs.join("&")
}

fn url_encode(value: &str) -> String {
    url::form_urlencoded::byte_serialize(value.as_bytes()).collect()
}

fn escape_attr(value: &str) -> String {
    escape_html(value).replace('"', "&quot;")
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
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

fn no_store_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CACHE_CONTROL,
        "no-store".parse().expect("valid cache-control"),
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
        "SELECT id, base_sku, name, description, stock, popular, min_price, max_price, variant_count, category, categories, collections, holidays, tags, image, image_meta
         FROM (
           SELECT c.id, c.base_sku, c.name, c.description, c.stock,
                  c.popular::bigint AS popular,
                  COALESCE(NULLIF(c.min_price::double precision, 0), vp.min_price, 0) AS min_price,
                  COALESCE(NULLIF(c.max_price::double precision, 0), vp.max_price, 0) AS max_price,
                  COALESCE(NULLIF(c.variant_count::bigint, 0), vp.variant_count, 0) AS variant_count,
                  c.category, c.categories, c.collections, c.holidays, c.tags,
                  c.types, c.sizes, c.materials, c.variant_skus,
                  c.image, c.image_meta
           FROM public_catalog_cards c
           LEFT JOIN LATERAL (
             SELECT MIN(NULLIF(v.price::double precision, 0)) AS min_price,
                    MAX(NULLIF(v.price::double precision, 0)) AS max_price,
                    COUNT(*)::bigint AS variant_count
             FROM variants v
             WHERE v.base_sku = c.base_sku OR v.product_id = c.id
           ) vp ON TRUE
         ) public_catalog_cards",
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

async fn load_related_cards(
    pool: &PgPool,
    product: &ProductDetail,
    limit: i64,
) -> AppResult<Vec<CatalogCard>> {
    if product.categories.is_empty()
        && product.collections.is_empty()
        && product.holidays.is_empty()
        && product.tags.is_empty()
    {
        return Ok(Vec::new());
    }
    let rows = sqlx::query(
        "SELECT id, base_sku, name, description, stock, popular, min_price, max_price, variant_count, category, categories, collections, holidays, tags, image, image_meta
         FROM (
           SELECT c.id, c.base_sku, c.name, c.description, c.stock,
                  c.popular::bigint AS popular,
                  COALESCE(NULLIF(c.min_price::double precision, 0), vp.min_price, 0) AS min_price,
                  COALESCE(NULLIF(c.max_price::double precision, 0), vp.max_price, 0) AS max_price,
                  COALESCE(NULLIF(c.variant_count::bigint, 0), vp.variant_count, 0) AS variant_count,
                  c.category, c.categories, c.collections, c.holidays, c.tags, c.image, c.image_meta
           FROM public_catalog_cards c
           LEFT JOIN LATERAL (
             SELECT MIN(NULLIF(v.price::double precision, 0)) AS min_price,
                    MAX(NULLIF(v.price::double precision, 0)) AS max_price,
                    COUNT(*)::bigint AS variant_count
             FROM variants v
             WHERE v.base_sku = c.base_sku OR v.product_id = c.id
           ) vp ON TRUE
         ) public_catalog_cards
         WHERE base_sku <> $1
           AND (categories && $2::text[] OR collections && $3::text[] OR holidays && $4::text[] OR tags && $5::text[])
         ORDER BY popular DESC, name ASC
         LIMIT $6",
    )
    .bind(&product.base_sku)
    .bind(product.categories.clone())
    .bind(product.collections.clone())
    .bind(product.holidays.clone())
    .bind(product.tags.clone())
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    rows.into_iter().map(card_from_row).collect()
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
        min_price: row_i64(&row, "min_price"),
        max_price: row_i64(&row, "max_price"),
        variant_count: row_i64(&row, "variant_count"),
        popular: row_i64(&row, "popular"),
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
    let mut builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT *,
                min_price::double precision AS min_price_float,
                max_price::double precision AS max_price_float,
                popular::bigint AS popular_int
         FROM public_catalog_products WHERE ",
    );
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
    let min_variant_price = variants
        .iter()
        .filter_map(|variant| (variant.price > 0).then_some(variant.price))
        .min()
        .unwrap_or(0);
    let max_variant_price = variants
        .iter()
        .filter_map(|variant| (variant.price > 0).then_some(variant.price))
        .max()
        .unwrap_or(0);
    let product_min_price = row_i64(&product_row, "min_price_float");
    let product_max_price = row_i64(&product_row, "max_price_float");
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
        min_price: if product_min_price > 0 {
            product_min_price
        } else {
            min_variant_price
        },
        max_price: if product_max_price > 0 {
            product_max_price
        } else {
            max_variant_price
        },
        popular: row_i64(&product_row, "popular_int"),
        stock: product_row.try_get("stock").unwrap_or_default(),
        variants,
        images,
    }))
}

async fn load_variants(pool: &PgPool, product_id: &str) -> AppResult<Vec<Variant>> {
    let rows = sqlx::query(
        "SELECT *,
                concat_ws(' / ', NULLIF((SELECT name FROM public_catalog_products WHERE id = variants.product_id), ''), NULLIF(type, ''), NULLIF(size, ''), NULLIF(material, '')) AS variant_name,
                price::double precision AS price_float
         FROM variants WHERE product_id = $1 ORDER BY sku ASC",
    )
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
            name: row.try_get("variant_name").unwrap_or_default(),
            price: row_i64(&row, "price_float"),
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
mod tests;
