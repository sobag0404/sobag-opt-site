use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    sync::Arc,
};

use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode, Uri},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

use crate::store::{
    load_store_value as load_file_store_value, save_store_value as save_file_store_value,
};
use crate::{
    can_edit_content, load_current_user_from_file_store, no_store_headers, row_i64, string_field,
    AppError, AppResult, AppState,
};

const CATALOG_KEY: &str = "sobag:catalog:v1";
const STORE_KEY: &str = "sobag:store:v1";
const MAX_PRICE_IMPORT_HISTORY: usize = 100;
const MAX_AUDIT_RECORDS: usize = 500;

#[derive(Clone, Debug)]
pub(crate) struct PriceRecord {
    product_id: String,
    product_payload: Value,
    sku: String,
    price: i64,
    variant_payload: Value,
    group: String,
}

#[derive(Clone, Debug)]
struct PriceChange {
    row: usize,
    kind: String,
    target: String,
    group: String,
    skus: Vec<String>,
    product_ids: Vec<String>,
    old_prices: Vec<i64>,
    new_price: Option<i64>,
    promo_price: Option<i64>,
    promo_active: bool,
    promo_starts_at: String,
    promo_ends_at: String,
}

pub(crate) async fn admin_prices_get(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: Uri,
) -> AppResult<Response> {
    require_admin_price_user(&headers).await?;
    let params = query_params(uri.query().unwrap_or(""));
    if params
        .get("template")
        .map(|value| value == "1")
        .unwrap_or(false)
    {
        return csv_response("sobag-price-import-template.csv", &template_csv());
    }
    let records = load_price_records(&state.pool).await?;
    let groups = collect_price_groups(&records)?;
    let rows = price_list_rows(&groups);
    if params
        .get("format")
        .map(|value| value.eq_ignore_ascii_case("csv"))
        .unwrap_or(false)
    {
        return csv_response("sobag-admin-price-groups.csv", &price_list_csv(&rows));
    }
    let history = load_price_import_history().await?;
    Ok((
        no_store_headers(),
        Json(json!({
            "source": "postgres",
            "updatedAt": Value::Null,
            "groups": groups,
            "rows": rows,
            "history": history
        })),
    )
        .into_response())
}

pub(crate) async fn admin_prices_post(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    let user = require_admin_price_user(&headers).await?;
    let action = text(
        data.get("action")
            .and_then(Value::as_str)
            .unwrap_or("preview"),
    )
    .to_ascii_lowercase();
    let records = load_price_records(&state.pool).await?;
    let rows = import_rows(&data);
    let preview = parse_price_import_rows(&records, &rows);
    if action == "preview" {
        let status = if preview.1.is_empty() {
            StatusCode::OK
        } else {
            StatusCode::BAD_REQUEST
        };
        return Ok((
            status,
            no_store_headers(),
            Json(
                json!({ "changes": changes_json(&preview.0), "errors": preview.1, "source": "postgres" }),
            ),
        ));
    }
    if action != "apply" {
        return Err(AppError::bad_request(
            "unknown_action",
            "Unknown admin price action.",
        ));
    }
    if !preview.1.is_empty() {
        return Ok((
            StatusCode::BAD_REQUEST,
            no_store_headers(),
            Json(
                json!({ "changes": changes_json(&preview.0), "errors": preview.1, "source": "postgres" }),
            ),
        ));
    }
    if preview.0.is_empty() {
        return Err(AppError::bad_request(
            "empty_price_import",
            "No price changes to apply.",
        ));
    }
    let applied = apply_price_changes_to_db(&state.pool, &preview.0).await?;
    let history = price_import_history_entry(&user, &preview.0, &applied, "postgres", "applied");
    let history_recorded = record_price_import_history(&history).await.is_ok();
    Ok((
        StatusCode::OK,
        no_store_headers(),
        Json(json!({
            "source": "postgres",
            "applied": applied,
            "changes": preview.0.len(),
            "updatedBy": string_field(&user, "email").unwrap_or_default(),
            "history": history,
            "historyRecorded": history_recorded
        })),
    ))
}

async fn require_admin_price_user(headers: &HeaderMap) -> AppResult<Value> {
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
    Ok(user)
}

async fn load_price_records(pool: &PgPool) -> AppResult<Vec<PriceRecord>> {
    let rows = sqlx::query(
        r#"
        SELECT
          p.id AS product_id,
          p.base_sku,
          p.name AS product_name,
          p.payload AS product_payload,
          v.id AS variant_id,
          v.sku,
          v.type,
          v.size,
          v.material,
          v.price,
          v.payload AS variant_payload
        FROM products p
        JOIN variants v ON v.product_id = p.id
        WHERE p.status = 'published'
          AND p.hidden = false
          AND v.price > 0
        ORDER BY v.type ASC, v.material ASC, v.size ASC, v.sku ASC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    let records = rows
        .into_iter()
        .map(|row| {
            let product_payload = row
                .try_get::<Value, _>("product_payload")
                .unwrap_or_else(|_| json!({}));
            let variant_payload = row
                .try_get::<Value, _>("variant_payload")
                .unwrap_or_else(|_| json!({}));
            let product_name = row.try_get::<String, _>("product_name").unwrap_or_default();
            let variant_type = row.try_get::<String, _>("type").unwrap_or_default();
            let size = row.try_get::<String, _>("size").unwrap_or_default();
            let material = row.try_get::<String, _>("material").unwrap_or_default();
            let group = price_group_name(
                &product_payload,
                &variant_payload,
                &product_name,
                &variant_type,
                &material,
                &size,
            );
            PriceRecord {
                product_id: row.try_get::<String, _>("product_id").unwrap_or_default(),
                product_payload,
                sku: row.try_get::<String, _>("sku").unwrap_or_default(),
                price: row_i64(&row, "price"),
                variant_payload,
                group,
            }
        })
        .filter(|record| !record.sku.is_empty() && record.price > 0)
        .collect::<Vec<_>>();
    if records.is_empty() {
        return load_file_price_records().await;
    }
    Ok(records)
}

async fn load_price_import_history() -> AppResult<Vec<Value>> {
    let store = load_file_store_value(STORE_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(|| json!({}));
    Ok(store
        .get("priceImportHistory")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter(|item| item.is_object())
                .take(MAX_PRICE_IMPORT_HISTORY)
                .cloned()
                .collect::<Vec<_>>()
        })
        .unwrap_or_default())
}

fn unique_string_count(values: impl Iterator<Item = String>) -> usize {
    values
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>()
        .len()
}

fn price_import_history_entry(
    user: &Value,
    changes: &[PriceChange],
    applied: &Value,
    source: &str,
    status: &str,
) -> Value {
    let now = Utc::now().to_rfc3339();
    json!({
        "id": format!("PRICE-{}", Utc::now().timestamp_millis()),
        "type": "price_import",
        "status": status,
        "source": source,
        "actor": string_field(user, "email").unwrap_or_default(),
        "rowCount": unique_string_count(changes.iter().map(|change| change.row.to_string())),
        "changeCount": changes.len(),
        "groupChangeCount": changes.iter().filter(|change| change.kind == "group_price").count(),
        "skuChangeCount": changes.iter().filter(|change| change.kind == "sku_price").count(),
        "promoChangeCount": changes.iter().filter(|change| change.promo_price.unwrap_or(0) > 0).count(),
        "affectedSkuCount": unique_string_count(changes.iter().flat_map(|change| change.skus.clone())),
        "affectedProductCount": unique_string_count(changes.iter().flat_map(|change| change.product_ids.clone())),
        "applied": applied,
        "createdAt": now
    })
}

async fn record_price_import_history(entry: &Value) -> AppResult<()> {
    let mut store = load_file_store_value(STORE_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(|| json!({}));
    if !store.is_object() {
        store = json!({});
    }
    let Some(map) = store.as_object_mut() else {
        return Ok(());
    };

    let mut history = map
        .get("priceImportHistory")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    history.insert(0, entry.clone());
    history.truncate(MAX_PRICE_IMPORT_HISTORY);
    map.insert("priceImportHistory".to_string(), Value::Array(history));

    let audit = json!({
        "id": format!("AUD-{}", Utc::now().timestamp_millis()),
        "type": "price_import_apply",
        "actor": entry.get("actor").cloned().unwrap_or(Value::Null),
        "status": entry.get("status").cloned().unwrap_or(Value::Null),
        "source": entry.get("source").cloned().unwrap_or(Value::Null),
        "changeCount": entry.get("changeCount").cloned().unwrap_or(Value::Null),
        "affectedSkuCount": entry.get("affectedSkuCount").cloned().unwrap_or(Value::Null),
        "createdAt": entry.get("createdAt").cloned().unwrap_or(Value::Null)
    });
    let mut audit_items = map
        .get("audit")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    audit_items.insert(0, audit);
    audit_items.truncate(MAX_AUDIT_RECORDS);
    map.insert("audit".to_string(), Value::Array(audit_items));

    save_file_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))
}

async fn load_file_price_records() -> AppResult<Vec<PriceRecord>> {
    let Some(catalog) = load_file_store_value(CATALOG_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Ok(Vec::new());
    };
    let products = catalog
        .get("products")
        .and_then(Value::as_array)
        .cloned()
        .or_else(|| catalog.as_array().cloned())
        .unwrap_or_default();
    let mut records = Vec::new();
    for product in products {
        let product_id = string_field(&product, "id")
            .unwrap_or_else(|| string_field(&product, "baseSku").unwrap_or_default());
        let product_name = string_field(&product, "name").unwrap_or_default();
        let variants = product
            .get("variants")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        for variant in variants {
            let sku = string_field(&variant, "sku").unwrap_or_default();
            let variant_type = string_field(&variant, "type").unwrap_or_default();
            let size = string_field(&variant, "size").unwrap_or_default();
            let material = string_field(&variant, "material").unwrap_or_default();
            let price = variant.get("price").and_then(Value::as_i64).unwrap_or(0);
            let group = price_group_name(
                &product,
                &variant,
                &product_name,
                &variant_type,
                &material,
                &size,
            );
            records.push(PriceRecord {
                product_id: product_id.clone(),
                product_payload: product.clone(),
                sku,
                price,
                variant_payload: variant,
                group,
            });
        }
    }
    Ok(records
        .into_iter()
        .filter(|record| record.price > 0)
        .collect())
}

fn price_group_name(
    product: &Value,
    variant: &Value,
    product_name: &str,
    variant_type: &str,
    material: &str,
    size: &str,
) -> String {
    for (source, keys) in [
        (variant, ["priceGroup", "price_group", "priceGroupName"]),
        (product, ["priceGroup", "price_group", "priceGroupName"]),
    ] {
        for key in keys {
            if let Some(value) = string_field(source, key).filter(|value| !value.trim().is_empty())
            {
                return collapse_spaces(&value);
            }
        }
    }
    collapse_spaces(
        &[variant_type, material, size]
            .iter()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>()
            .join(" "),
    )
    .trim()
    .to_string()
    .if_empty(|| collapse_spaces(product_name))
}

trait EmptyStringFallback {
    fn if_empty<F: FnOnce() -> String>(self, fallback: F) -> String;
}

impl EmptyStringFallback for String {
    fn if_empty<F: FnOnce() -> String>(self, fallback: F) -> String {
        if self.trim().is_empty() {
            fallback()
        } else {
            self
        }
    }
}

fn collect_price_groups(records: &[PriceRecord]) -> AppResult<Vec<Value>> {
    let mut groups: BTreeMap<String, PriceGroupBuilder> = BTreeMap::new();
    for record in records {
        let price = require_positive_price_value(record.price, "variant price")?;
        let key = group_key(&record.group);
        if key.is_empty() {
            continue;
        }
        let group = groups
            .entry(key.clone())
            .or_insert_with(|| PriceGroupBuilder {
                key,
                name: record.group.clone(),
                price_counts: BTreeMap::new(),
                skus: BTreeSet::new(),
                product_ids: BTreeSet::new(),
                promo_counts: BTreeMap::new(),
                promos: Vec::new(),
            });
        *group.price_counts.entry(price).or_insert(0) += 1;
        group.skus.insert(record.sku.clone());
        group.product_ids.insert(record.product_id.clone());
        if let Some(promo) = promo_for_record(record) {
            if promo_active(&promo) {
                *group.promo_counts.entry(promo.price).or_insert(0) += 1;
                group.promos.push(promo);
            }
        }
    }
    let mut values = groups
        .into_values()
        .map(|group| {
            let price = mode_price(&group.price_counts);
            let promo_price = mode_price(&group.promo_counts);
            let promo = group.promos.iter().find(|promo| promo.price == promo_price);
            json!({
                "key": group.key,
                "name": group.name,
                "price": price,
                "skuCount": group.skus.len(),
                "productCount": group.product_ids.len(),
                "skus": group.skus.into_iter().collect::<Vec<_>>(),
                "inconsistent": group.price_counts.len() > 1,
                "prices": group.price_counts.keys().cloned().collect::<Vec<_>>(),
                "promoPrice": if promo_price > 0 { json!(promo_price) } else { Value::Null },
                "promoStartsAt": promo.map(|item| item.starts_at.clone()).unwrap_or_default(),
                "promoEndsAt": promo.map(|item| item.ends_at.clone()).unwrap_or_default()
            })
        })
        .collect::<Vec<_>>();
    values.sort_by(|left, right| {
        string_field(left, "name")
            .unwrap_or_default()
            .cmp(&string_field(right, "name").unwrap_or_default())
    });
    Ok(values)
}

struct PriceGroupBuilder {
    key: String,
    name: String,
    price_counts: BTreeMap<i64, usize>,
    skus: BTreeSet<String>,
    product_ids: BTreeSet<String>,
    promo_counts: BTreeMap<i64, usize>,
    promos: Vec<Promo>,
}

#[derive(Clone)]
struct Promo {
    price: i64,
    active: bool,
    starts_at: String,
    ends_at: String,
}

fn promo_for_record(record: &PriceRecord) -> Option<Promo> {
    promo_from_payload(&record.variant_payload).or_else(|| {
        for key in ["pricePromos", "promoPrices", "promos"] {
            let Some(map) = record.product_payload.get(key).and_then(Value::as_object) else {
                continue;
            };
            for target in [&record.sku, &record.group, &group_key(&record.group)] {
                if let Some(promo) = map.get(target).and_then(promo_from_payload_allow_price) {
                    return Some(promo);
                }
            }
        }
        None
    })
}

fn promo_from_payload(value: &Value) -> Option<Promo> {
    let price = parse_price(
        value
            .get("promoPrice")
            .or_else(|| value.get("salePrice"))
            .or_else(|| value.get("actionPrice"))
            .unwrap_or(&Value::Null),
    );
    if price <= 0 {
        return None;
    }
    Some(Promo {
        price,
        active: value
            .get("promoActive")
            .and_then(Value::as_bool)
            .unwrap_or(true)
            && value
                .get("saleActive")
                .and_then(Value::as_bool)
                .unwrap_or(true)
            && value.get("active").and_then(Value::as_bool).unwrap_or(true),
        starts_at: string_field(value, "promoStart")
            .or_else(|| string_field(value, "saleStart"))
            .or_else(|| string_field(value, "startsAt"))
            .unwrap_or_default(),
        ends_at: string_field(value, "promoEnd")
            .or_else(|| string_field(value, "saleEnd"))
            .or_else(|| string_field(value, "endsAt"))
            .unwrap_or_default(),
    })
}

fn promo_from_payload_allow_price(value: &Value) -> Option<Promo> {
    promo_from_payload(value).or_else(|| {
        let price = parse_price(value.get("price").unwrap_or(&Value::Null));
        (price > 0).then_some(Promo {
            price,
            active: value.get("active").and_then(Value::as_bool).unwrap_or(true),
            starts_at: string_field(value, "startsAt").unwrap_or_default(),
            ends_at: string_field(value, "endsAt").unwrap_or_default(),
        })
    })
}

fn promo_active(promo: &Promo) -> bool {
    if !promo.active {
        return false;
    }
    let now_ms = Utc::now().timestamp_millis();
    if let Some(start_ms) = promo_bound_ms(&promo.starts_at, false) {
        if now_ms < start_ms {
            return false;
        }
    }
    if let Some(end_ms) = promo_bound_ms(&promo.ends_at, true) {
        if now_ms > end_ms {
            return false;
        }
    }
    true
}

fn mode_price(counts: &BTreeMap<i64, usize>) -> i64 {
    counts
        .iter()
        .max_by(|left, right| left.1.cmp(right.1).then_with(|| right.0.cmp(left.0)))
        .map(|(price, _)| *price)
        .unwrap_or(0)
}

fn price_list_rows(groups: &[Value]) -> Vec<Value> {
    groups
        .iter()
        .flat_map(|group| {
            let name = string_field(group, "name").unwrap_or_default();
            let sku_count = group.get("skuCount").and_then(Value::as_u64).unwrap_or(0);
            let product_count = group
                .get("productCount")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            let skus = group
                .get("skus")
                .and_then(Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .filter_map(Value::as_str)
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();
            let mut rows = vec![json!({
                "type": "base",
                "group": name,
                "label": name,
                "price": group.get("price").and_then(Value::as_i64).unwrap_or(0),
                "skuCount": sku_count,
                "productCount": product_count,
                "skus": skus,
                "promoStartsAt": "",
                "promoEndsAt": ""
            })];
            if let Some(promo_price) = group
                .get("promoPrice")
                .and_then(Value::as_i64)
                .filter(|value| *value > 0)
            {
                rows.push(json!({
                    "type": "promo",
                    "group": string_field(group, "name").unwrap_or_default(),
                    "label": format!("Акция {}", string_field(group, "name").unwrap_or_default()),
                    "price": promo_price,
                    "skuCount": sku_count,
                    "productCount": product_count,
                    "skus": skus,
                    "promoStartsAt": string_field(group, "promoStartsAt").unwrap_or_default(),
                    "promoEndsAt": string_field(group, "promoEndsAt").unwrap_or_default()
                }));
            }
            rows
        })
        .collect()
}

fn template_csv() -> String {
    price_list_csv(&[
        json!({"type":"base","label":"Подушка Велюр 40x40","price":220,"skuCount":"","productCount":"","skus":"","promoStartsAt":"","promoEndsAt":""}),
        json!({"type":"promo","label":"Акция Подушка Велюр 40x40","price":199,"skuCount":"","productCount":"","skus":"","promoStartsAt":"2026-01-01","promoEndsAt":"2026-01-31"}),
    ])
}

fn price_list_csv(rows: &[Value]) -> String {
    let mut output = vec![vec![
        "Категория/группа".to_string(),
        "Цена".to_string(),
        "Тип строки".to_string(),
        "Артикулов".to_string(),
        "Товаров".to_string(),
        "SKU".to_string(),
        "Акция с".to_string(),
        "Акция до".to_string(),
    ]
    .into_iter()
    .map(|value| csv_cell(&value))
    .collect::<Vec<_>>()
    .join(";")];
    for row in rows {
        output.push(
            [
                string_field(row, "label").unwrap_or_default(),
                row.get("price").map(value_text).unwrap_or_else(String::new),
                if string_field(row, "type").unwrap_or_default() == "promo" {
                    "Акция".to_string()
                } else {
                    "База".to_string()
                },
                row.get("skuCount").map(value_text).unwrap_or_default(),
                row.get("productCount").map(value_text).unwrap_or_default(),
                string_field(row, "skus").unwrap_or_default(),
                string_field(row, "promoStartsAt").unwrap_or_default(),
                string_field(row, "promoEndsAt").unwrap_or_default(),
            ]
            .into_iter()
            .map(|value| csv_cell(&value))
            .collect::<Vec<_>>()
            .join(";"),
        );
    }
    format!("\u{FEFF}{}\n", output.join("\n"))
}

fn csv_response(filename: &str, csv: &str) -> AppResult<Response> {
    let mut headers = no_store_headers();
    headers.insert(
        header::CONTENT_TYPE,
        "text/csv; charset=utf-8"
            .parse()
            .expect("valid content-type"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"{}\"", filename)
            .parse()
            .expect("valid disposition"),
    );
    Ok((headers, csv.to_string()).into_response())
}

fn import_rows(data: &Value) -> Vec<Value> {
    if let Some(rows) = data.get("rows").and_then(Value::as_array) {
        return rows.clone();
    }
    data.get("csv")
        .and_then(Value::as_str)
        .map(rows_from_csv)
        .unwrap_or_default()
}

fn parse_price_import_rows(
    records: &[PriceRecord],
    rows: &[Value],
) -> (Vec<PriceChange>, Vec<Value>) {
    let mut by_sku: HashMap<String, PriceRecord> = HashMap::new();
    let mut by_group: HashMap<String, Vec<PriceRecord>> = HashMap::new();
    for record in records {
        by_sku.insert(sku_key(&record.sku), record.clone());
        by_group
            .entry(group_key(&record.group))
            .or_default()
            .push(record.clone());
    }
    let mut changes = Vec::new();
    let mut errors = Vec::new();
    let mut seen = BTreeSet::new();
    for (index, row) in rows.iter().enumerate() {
        let row_number = index + 2;
        let group_name = value_by_columns(
            row,
            &[
                "Категория/группа",
                "Группа",
                "priceGroup",
                "group",
                "category",
            ],
        );
        let sku = value_by_columns(row, &["Артикул", "SKU", "sku", "variantSku"]);
        if formula_like(&group_name) || formula_like(&sku) {
            errors.push(json!({ "row": row_number, "error": "formula_input_rejected", "message": "Spreadsheet formulas are not accepted in price imports." }));
            continue;
        }
        let matched = if !sku.is_empty() {
            by_sku
                .get(&sku_key(&sku))
                .cloned()
                .into_iter()
                .collect::<Vec<_>>()
        } else {
            by_group
                .get(&group_key(&group_name))
                .cloned()
                .unwrap_or_default()
        };
        if matched.is_empty() {
            errors.push(json!({ "row": row_number, "error": "price_target_not_found", "message": "Price group or SKU was not found." }));
            continue;
        }
        let price_raw = value_by_columns(
            row,
            &["Цена", "Базовая цена", "price", "basePrice", "groupPrice"],
        );
        let promo_raw = value_by_columns(row, &["Акция цена", "promoPrice", "salePrice"]);
        if formula_like(&price_raw) || formula_like(&promo_raw) {
            errors.push(json!({ "row": row_number, "error": "formula_input_rejected", "message": "Spreadsheet formulas are not accepted in price imports." }));
            continue;
        }
        let target_key = if !sku.is_empty() {
            format!("sku:{}", sku_key(&sku))
        } else {
            format!("group:{}", group_key(&group_name))
        };
        let mut changed = false;
        if !price_raw.is_empty() {
            match require_positive_price_text(&price_raw, "price") {
                Ok(new_price) => {
                    let key = format!("base:{target_key}");
                    if !seen.insert(key) {
                        errors.push(json!({ "row": row_number, "error": "duplicate_price_target", "message": "Duplicate price target in import." }));
                    } else {
                        changes.push(change_for_match(
                            row_number,
                            if sku.is_empty() {
                                "group_price"
                            } else {
                                "sku_price"
                            },
                            if sku.is_empty() { &group_name } else { &sku },
                            &matched,
                            Some(new_price),
                            None,
                            true,
                            "",
                            "",
                        ));
                    }
                    changed = true;
                }
                Err(error) => errors.push(error),
            }
        }
        if !promo_raw.is_empty() {
            match require_positive_price_text(&promo_raw, "promoPrice") {
                Ok(promo_price) => {
                    let promo_start_raw =
                        value_by_columns(row, &["РђРєС†РёСЏ СЃ", "promoStart", "saleStart"]);
                    let promo_end_raw =
                        value_by_columns(row, &["РђРєС†РёСЏ РґРѕ", "promoEnd", "saleEnd"]);
                    if let Some(error) =
                        validate_promo_period(row_number, &promo_start_raw, &promo_end_raw)
                    {
                        errors.push(error);
                        continue;
                    }
                    let key = format!("promo:{target_key}");
                    if !seen.insert(key) {
                        errors.push(json!({ "row": row_number, "error": "duplicate_promo_target", "message": "Duplicate promo target in import." }));
                    } else {
                        changes.push(change_for_match(
                            row_number,
                            if sku.is_empty() {
                                "group_promo"
                            } else {
                                "sku_promo"
                            },
                            if sku.is_empty() { &group_name } else { &sku },
                            &matched,
                            None,
                            Some(promo_price),
                            parse_bool(
                                &value_by_columns(
                                    row,
                                    &["Акция активна", "promoActive", "saleActive"],
                                ),
                                true,
                            ),
                            &value_by_columns(row, &["Акция с", "promoStart", "saleStart"]),
                            &value_by_columns(row, &["Акция до", "promoEnd", "saleEnd"]),
                        ));
                    }
                    changed = true;
                }
                Err(error) => errors.push(error),
            }
        }
        if !changed {
            errors.push(json!({ "row": row_number, "error": "missing_price_value", "message": "Provide price or promoPrice." }));
        }
    }
    (changes, errors)
}

fn change_for_match(
    row: usize,
    kind: &str,
    target: &str,
    matched: &[PriceRecord],
    new_price: Option<i64>,
    promo_price: Option<i64>,
    promo_active: bool,
    promo_starts_at: &str,
    promo_ends_at: &str,
) -> PriceChange {
    let skus = unique_sorted(matched.iter().map(|record| record.sku.clone()).collect());
    let product_ids = unique_sorted(
        matched
            .iter()
            .map(|record| record.product_id.clone())
            .collect(),
    );
    let old_prices = unique_sorted_i64(matched.iter().map(|record| record.price).collect());
    PriceChange {
        row,
        kind: kind.to_string(),
        target: target.to_string(),
        group: matched
            .first()
            .map(|record| record.group.clone())
            .unwrap_or_default(),
        skus,
        product_ids,
        old_prices,
        new_price,
        promo_price,
        promo_active,
        promo_starts_at: text(promo_starts_at),
        promo_ends_at: text(promo_ends_at),
    }
}

async fn apply_price_changes_to_db(pool: &PgPool, changes: &[PriceChange]) -> AppResult<Value> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let mut affected_products = BTreeSet::new();
    let mut affected_skus = BTreeSet::new();
    for change in changes {
        for id in &change.product_ids {
            if !id.trim().is_empty() {
                affected_products.insert(id.clone());
            }
        }
        for sku in &change.skus {
            if !sku.trim().is_empty() {
                affected_skus.insert(sku.clone());
            }
        }
        if change.kind.ends_with("_price") {
            let Some(price) = change.new_price else {
                continue;
            };
            sqlx::query(
                "UPDATE variants SET price = $1, updated_at = now(), payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('priceGroup', $2) WHERE sku = ANY($3::text[])",
            )
            .bind(price)
            .bind(&change.group)
            .bind(&change.skus)
            .execute(&mut *tx)
            .await
            .map_err(|error| AppError::internal(error.to_string()))?;
        }
        if change.kind.ends_with("_promo") {
            let Some(price) = change.promo_price else {
                continue;
            };
            sqlx::query(
                "UPDATE variants SET updated_at = now(), payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('promoPrice', $1, 'promoActive', $2, 'promoStart', $3, 'promoEnd', $4, 'priceGroup', $5) WHERE sku = ANY($6::text[])",
            )
            .bind(price)
            .bind(change.promo_active)
            .bind(&change.promo_starts_at)
            .bind(&change.promo_ends_at)
            .bind(&change.group)
            .bind(&change.skus)
            .execute(&mut *tx)
            .await
            .map_err(|error| AppError::internal(error.to_string()))?;
        }
    }
    let product_ids = affected_products.into_iter().collect::<Vec<_>>();
    if !product_ids.is_empty() {
        sqlx::query(
            r#"
            UPDATE products p
               SET min_price = s.min_price,
                   max_price = s.max_price,
                   variant_count = s.variant_count,
                   updated_at = now()
              FROM (
                SELECT product_id,
                       MIN(price)::int AS min_price,
                       MAX(price)::int AS max_price,
                       COUNT(*)::int AS variant_count
                  FROM variants
                 WHERE product_id = ANY($1::text[])
                   AND price > 0
                 GROUP BY product_id
              ) s
             WHERE p.id = s.product_id
            "#,
        )
        .bind(&product_ids)
        .execute(&mut *tx)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    }
    tx.commit()
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(json!({ "updatedSkus": affected_skus.len(), "updatedProducts": product_ids.len() }))
}

fn changes_json(changes: &[PriceChange]) -> Vec<Value> {
    changes
        .iter()
        .map(|change| {
            json!({
                "row": change.row,
                "kind": change.kind,
                "target": change.target,
                "group": change.group,
                "skus": change.skus,
                "productIds": change.product_ids,
                "oldPrices": change.old_prices,
                "newPrice": change.new_price,
                "promoPrice": change.promo_price,
                "promoActive": change.promo_active,
                "promoStartsAt": change.promo_starts_at,
                "promoEndsAt": change.promo_ends_at
            })
        })
        .collect()
}

fn rows_from_csv(text_value: &str) -> Vec<Value> {
    let lines = text_value
        .trim_start_matches('\u{FEFF}')
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect::<Vec<_>>();
    let Some((header_line, data_lines)) = lines.split_first() else {
        return Vec::new();
    };
    let headers = parse_csv_line(header_line);
    data_lines
        .iter()
        .map(|line| {
            let cells = parse_csv_line(line);
            let mut object = serde_json::Map::new();
            for (index, cell) in cells.into_iter().enumerate() {
                object.insert(
                    headers
                        .get(index)
                        .cloned()
                        .unwrap_or_else(|| format!("column_{}", index + 1)),
                    json!(cell),
                );
            }
            Value::Object(object)
        })
        .collect()
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut cells = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    let chars = line.chars().collect::<Vec<_>>();
    let mut index = 0;
    while index < chars.len() {
        let ch = chars[index];
        if ch == '"' && quoted && chars.get(index + 1) == Some(&'"') {
            current.push('"');
            index += 1;
        } else if ch == '"' {
            quoted = !quoted;
        } else if (ch == ';' || ch == ',') && !quoted {
            cells.push(text(&current));
            current.clear();
        } else {
            current.push(ch);
        }
        index += 1;
    }
    cells.push(text(&current));
    cells
}

fn query_params(query: &str) -> HashMap<String, String> {
    query
        .split('&')
        .filter(|part| !part.is_empty())
        .filter_map(|part| {
            let (key, value) = part.split_once('=').unwrap_or((part, ""));
            Some((url_decode(key), url_decode(value)))
        })
        .collect()
}

fn url_decode(value: &str) -> String {
    let mut out = String::new();
    let mut chars = value.as_bytes().iter().copied().peekable();
    while let Some(byte) = chars.next() {
        if byte == b'%' {
            let hi = chars.next().unwrap_or(b'0');
            let lo = chars.next().unwrap_or(b'0');
            if let Ok(hex) = std::str::from_utf8(&[hi, lo]).unwrap_or("").parse::<u8>() {
                out.push(hex as char);
            }
        } else if byte == b'+' {
            out.push(' ');
        } else {
            out.push(byte as char);
        }
    }
    out
}

fn value_by_columns(row: &Value, columns: &[&str]) -> String {
    let Some(object) = row.as_object() else {
        return String::new();
    };
    for column in columns {
        if let Some(value) = object.get(*column) {
            return value_text(value);
        }
        if let Some((_, value)) = object
            .iter()
            .find(|(key, _)| normalized(key) == normalized(column))
        {
            return value_text(value);
        }
    }
    String::new()
}

fn require_positive_price_text(value: &str, field: &str) -> Result<i64, Value> {
    let price = parse_price(&json!(value));
    if price <= 0 {
        Err(
            json!({ "error": "invalid_price", "message": format!("{field} must be a positive number.") }),
        )
    } else {
        Ok(price)
    }
}

fn require_positive_price_value(value: i64, field: &str) -> AppResult<i64> {
    if value <= 0 {
        Err(AppError::bad_request(
            "invalid_price",
            format!("{field} must be a positive number."),
        ))
    } else {
        Ok(value)
    }
}

fn parse_price(value: &Value) -> i64 {
    match value {
        Value::Number(number) => number.as_f64().unwrap_or(0.0).round() as i64,
        Value::String(text) => {
            let prepared = text
                .trim()
                .replace(',', ".")
                .chars()
                .filter(|ch| ch.is_ascii_digit() || matches!(ch, '.' | '-'))
                .collect::<String>();
            prepared.parse::<f64>().unwrap_or(0.0).round() as i64
        }
        _ => 0,
    }
}

fn validate_promo_period(row: usize, start: &str, end: &str) -> Option<Value> {
    let start_ms = if start.trim().is_empty() {
        None
    } else {
        match promo_bound_ms(start, false) {
            Some(value) => Some(value),
            None => {
                return Some(
                    json!({ "row": row, "error": "invalid_promo_period", "message": "Promo start must be an ISO date or datetime." }),
                )
            }
        }
    };
    let end_ms = if end.trim().is_empty() {
        None
    } else {
        match promo_bound_ms(end, true) {
            Some(value) => Some(value),
            None => {
                return Some(
                    json!({ "row": row, "error": "invalid_promo_period", "message": "Promo end must be an ISO date or datetime." }),
                )
            }
        }
    };
    if let (Some(start_ms), Some(end_ms)) = (start_ms, end_ms) {
        if start_ms > end_ms {
            return Some(
                json!({ "row": row, "error": "invalid_promo_period", "message": "Promo start must not be after promo end." }),
            );
        }
    }
    None
}

fn promo_bound_ms(value: &str, end_of_day: bool) -> Option<i64> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(datetime) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(datetime.timestamp_millis());
    }
    let date = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d").ok()?;
    let datetime = if end_of_day {
        date.and_hms_opt(23, 59, 59)?
    } else {
        date.and_hms_opt(0, 0, 0)?
    };
    Some(datetime.and_utc().timestamp_millis())
}

fn parse_bool(value: &str, fallback: bool) -> bool {
    let prepared = normalized(value);
    if prepared.is_empty() {
        return fallback;
    }
    !matches!(
        prepared.as_str(),
        "0" | "false" | "no" | "нет" | "off" | "inactive"
    )
}

fn text(value: &str) -> String {
    value.trim().to_string()
}

fn collapse_spaces(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn normalized(value: &str) -> String {
    collapse_spaces(value).to_lowercase()
}

fn sku_key(value: &str) -> String {
    value.trim().to_uppercase()
}

fn group_key(value: &str) -> String {
    normalized(value)
}

fn formula_like(value: &str) -> bool {
    matches!(value.trim().chars().next(), Some('=' | '+' | '@'))
}

fn value_text(value: &Value) -> String {
    match value {
        Value::String(text) => text.trim().to_string(),
        Value::Number(number) => number.to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

fn csv_cell(value: &str) -> String {
    let raw = value.replace(['\r', '\n'], " ");
    let safe = if matches!(raw.trim().chars().next(), Some('=' | '+' | '@' | '-')) {
        format!("'{raw}")
    } else {
        raw
    };
    format!("\"{}\"", safe.replace('"', "\"\""))
}

fn unique_sorted(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .filter(|value| !value.trim().is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn unique_sorted_i64(values: Vec<i64>) -> Vec<i64> {
    values
        .into_iter()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

#[cfg(test)]
pub(crate) fn parse_price_import_rows_for_test(
    records: &[PriceRecord],
    rows: &[Value],
) -> (Vec<Value>, Vec<Value>) {
    let (changes, errors) = parse_price_import_rows(records, rows);
    (changes_json(&changes), errors)
}

#[cfg(test)]
pub(crate) fn price_import_history_entry_for_test(
    records: &[PriceRecord],
    rows: &[Value],
) -> Value {
    let (changes, errors) = parse_price_import_rows(records, rows);
    assert!(
        errors.is_empty(),
        "fixture price import rows should be valid"
    );
    price_import_history_entry(
        &json!({ "email": "admin@example.test" }),
        &changes,
        &json!({ "updatedSkus": 1, "updatedProducts": 1 }),
        "postgres",
        "applied",
    )
}

#[cfg(test)]
pub(crate) fn fixture_price_record_for_test() -> PriceRecord {
    PriceRecord {
        product_id: "p1".to_string(),
        product_payload: json!({}),
        sku: "SKU-1".to_string(),
        price: 220,
        variant_payload: json!({}),
        group: "Pillow Velour 40x40".to_string(),
    }
}
