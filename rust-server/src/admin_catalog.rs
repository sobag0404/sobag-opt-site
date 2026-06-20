use std::collections::BTreeSet;

use axum::{
    http::{header, HeaderMap, StatusCode},
    Json,
};
use chrono::Utc;
use serde_json::{json, Map, Value};

use crate::admin_audit::append_admin_audit;
use crate::store::{load_store_value, save_store_value};
use crate::{
    can_edit_content, load_current_user_from_file_store, no_store_headers, AppError, AppResult,
};

const CATALOG_KEY: &str = "sobag:catalog:v1";
const MAX_PRODUCTS: usize = 25_000;

pub(crate) async fn admin_catalog_get(headers: HeaderMap) -> AppResult<(HeaderMap, Json<Value>)> {
    require_admin_catalog_user(&headers).await?;
    let catalog = load_store_value(CATALOG_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(|| json!({ "products": [], "updatedAt": Value::Null, "source": "empty" }));
    Ok((no_store_headers(), Json(catalog)))
}

pub(crate) async fn admin_catalog_put(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    let user = require_admin_catalog_user(&headers).await?;
    let products = data
        .get("products")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(clean_product)
                .collect::<Vec<Value>>()
        })
        .unwrap_or_default();
    if products.is_empty() {
        return Err(AppError::bad_request(
            "empty_catalog",
            "Catalog must not be empty.",
        ));
    }
    if products.len() > MAX_PRODUCTS {
        return Err(AppError::bad_request(
            "catalog_too_large",
            "Too many products in one catalog save.",
        ));
    }

    let current = load_store_value(CATALOG_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let import_batches = current
        .as_ref()
        .and_then(|value| value.pointer("/pim/importBatches"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let updated_at = Utc::now().to_rfc3339();
    let updated_by = string_field(&user, "email");
    let catalog = json!({
        "version": 1,
        "products": products,
        "updatedAt": updated_at,
        "updatedBy": updated_by,
        "source": "admin-catalog-save",
        "pim": { "version": 1, "importBatches": import_batches }
    });
    save_store_value(CATALOG_KEY, &catalog)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    append_admin_audit(
        "catalog_update",
        "catalog_save",
        &user,
        json!({
            "entityType": "catalog",
            "entityId": "products",
            "productCount": products.len(),
            "status": "saved"
        }),
    )
    .await?;
    Ok((
        StatusCode::OK,
        no_store_headers(),
        Json(json!({ "updatedAt": updated_at, "count": products.len() })),
    ))
}

async fn require_admin_catalog_user(headers: &HeaderMap) -> AppResult<Value> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some((_store, user)) = load_current_user_from_file_store(cookie_header)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return Err(AppError::unauthorized("Need to sign in."));
    };
    if !can_edit_content(&user) {
        return Err(AppError::forbidden("Insufficient permissions."));
    }
    Ok(user)
}

pub(crate) fn clean_product(product: &Value) -> Option<Value> {
    let object = product.as_object()?;
    let base_sku = text(object.get("baseSku"));
    let name = text(object.get("name"));
    if base_sku.is_empty() || name.is_empty() {
        return None;
    }
    let mut clean = object.clone();
    clean.remove("variants");
    clean.remove("minPrice");
    clean.remove("maxPrice");
    clean.insert(
        "id".to_string(),
        Value::String(non_empty_text(object.get("id")).unwrap_or_else(|| base_sku.clone())),
    );
    clean.insert("baseSku".to_string(), Value::String(base_sku));
    clean.insert("name".to_string(), Value::String(name));
    let status = clean_product_status(product);
    clean.insert("status".to_string(), Value::String(status.clone()));
    clean.insert("hidden".to_string(), Value::Bool(status != "published"));
    clean.insert(
        "basePrice".to_string(),
        json!(positive_i64(object.get("basePrice"), 1)),
    );
    clean.insert(
        "categories".to_string(),
        Value::Array(clean_string_list(
            object.get("categories"),
            object.get("category"),
        )),
    );
    for key in [
        "collections",
        "holidays",
        "tags",
        "types",
        "sizes",
        "materials",
    ] {
        clean.insert(
            key.to_string(),
            Value::Array(clean_string_list(object.get(key), None)),
        );
    }
    clean.insert(
        "images".to_string(),
        Value::Array(clean_product_images(object.get("images"))),
    );
    clean.insert(
        "variantPrices".to_string(),
        Value::Object(
            object
                .get("variantPrices")
                .and_then(Value::as_object)
                .cloned()
                .unwrap_or_default(),
        ),
    );
    Some(Value::Object(clean))
}

fn clean_product_status(product: &Value) -> String {
    let raw = text(product.get("status")).to_ascii_lowercase();
    if matches!(raw.as_str(), "draft" | "published" | "hidden" | "archive") {
        return raw;
    }
    if product
        .get("hidden")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        "hidden".to_string()
    } else {
        "published".to_string()
    }
}

fn clean_product_images(value: Option<&Value>) -> Vec<Value> {
    let Some(items) = value.and_then(Value::as_array) else {
        return Vec::new();
    };
    let mut seen = BTreeSet::new();
    items
        .iter()
        .filter_map(normalize_image_metadata)
        .filter(|image| {
            let key = text(image.get("storageKey"));
            let key = if key.is_empty() {
                text(image.get("url"))
            } else {
                key
            };
            !key.is_empty() && seen.insert(key)
        })
        .collect()
}

fn normalize_image_metadata(value: &Value) -> Option<Value> {
    let mut map = Map::new();
    if let Some(text) = value.as_str() {
        map.insert("url".to_string(), Value::String(text.trim().to_string()));
    } else {
        map = value.as_object()?.clone();
    }
    let url = first_text(&map, &["url", "downloadUrl", "publicUrl"]);
    let storage_key = first_text(&map, &["storageKey", "pathname", "key"]);
    if url.is_empty() && storage_key.is_empty() {
        return None;
    }
    let variants = map
        .get("variants")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(normalize_image_metadata)
                .collect::<Vec<Value>>()
        })
        .unwrap_or_default();
    Some(json!({
        "url": url,
        "storageKey": storage_key,
        "provider": text(map.get("provider")),
        "width": optional_positive_i64(map.get("width")),
        "height": optional_positive_i64(map.get("height")),
        "mime": first_text(&map, &["mime", "contentType"]),
        "uploadedAt": non_empty_text(map.get("uploadedAt")).unwrap_or_else(|| Utc::now().to_rfc3339()),
        "fileName": text(map.get("fileName")),
        "size": optional_positive_i64(map.get("size")),
        "etag": text(map.get("etag")),
        "status": non_empty_text(map.get("status")).unwrap_or_else(|| "active".to_string()),
        "variants": variants
    }))
}

fn clean_string_list(value: Option<&Value>, fallback: Option<&Value>) -> Vec<Value> {
    let mut seen = BTreeSet::new();
    let mut out = Vec::new();
    let source = value
        .filter(|item| match item {
            Value::Array(items) => !items.is_empty(),
            Value::String(text) => !text.trim().is_empty(),
            _ => false,
        })
        .or(fallback);
    match source {
        Some(Value::Array(items)) => {
            for item in items {
                push_unique_text(&mut out, &mut seen, text(Some(item)));
            }
        }
        Some(item) => {
            let raw = text(Some(item));
            let separator = if raw.contains(';') { ';' } else { ',' };
            for item in raw.split(separator) {
                push_unique_text(&mut out, &mut seen, item.trim().to_string());
            }
        }
        None => {}
    }
    out
}

fn push_unique_text(out: &mut Vec<Value>, seen: &mut BTreeSet<String>, item: String) {
    let normalized = item.split_whitespace().collect::<Vec<_>>().join(" ");
    if normalized.is_empty() {
        return;
    }
    if seen.insert(normalized.to_ascii_lowercase()) {
        out.push(Value::String(normalized));
    }
}

fn first_text(map: &Map<String, Value>, keys: &[&str]) -> String {
    for key in keys {
        let value = text(map.get(*key));
        if !value.is_empty() {
            return value;
        }
    }
    String::new()
}

fn text(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.trim().to_string(),
        Some(Value::Number(number)) => number.to_string(),
        Some(Value::Bool(value)) => value.to_string(),
        _ => String::new(),
    }
}

fn string_field(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string()
}

fn non_empty_text(value: Option<&Value>) -> Option<String> {
    let value = text(value);
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn positive_i64(value: Option<&Value>, fallback: i64) -> i64 {
    optional_positive_i64(value).unwrap_or(fallback).max(1)
}

fn optional_positive_i64(value: Option<&Value>) -> Option<i64> {
    let number = match value {
        Some(Value::Number(number)) => number.as_f64(),
        Some(Value::String(text)) => text.trim().replace(',', ".").parse::<f64>().ok(),
        _ => None,
    }?;
    if number.is_finite() && number > 0.0 {
        Some(number.round() as i64)
    } else {
        None
    }
}

#[cfg(test)]
pub(crate) fn clean_product_for_test(product: &Value) -> Option<Value> {
    clean_product(product)
}
