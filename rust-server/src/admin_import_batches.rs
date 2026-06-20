use axum::{
    http::{header, HeaderMap, StatusCode},
    Json,
};
use chrono::Utc;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::admin_audit::append_admin_audit;
use crate::admin_catalog::clean_product;
use crate::store::{load_store_value, save_store_value};
use crate::{
    can_edit_content, load_current_user_from_file_store, no_store_headers, AppError, AppResult,
};

const CATALOG_KEY: &str = "sobag:catalog:v1";
const IMPORT_BATCHES_KEY: &str = "sobag:import-batches:v1";
const MAX_BATCH_PRODUCTS: usize = 2_000;
const MAX_PRODUCTS: usize = 25_000;

pub(crate) async fn admin_import_batches_get(
    headers: HeaderMap,
) -> AppResult<(HeaderMap, Json<Value>)> {
    require_admin_import_user(&headers).await?;
    Ok((
        no_store_headers(),
        Json(json!({ "batches": load_import_batches().await? })),
    ))
}

pub(crate) async fn admin_import_batches_post(
    headers: HeaderMap,
    Json(data): Json<Value>,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    let user = require_admin_import_user(&headers).await?;
    let mut batches = load_import_batches().await?;
    let action = text(data.get("action")).to_ascii_lowercase();
    let action = if action.is_empty() {
        "preview".to_string()
    } else {
        action
    };
    let catalog = load_catalog().await?;
    let current_products = latest_catalog_products(&catalog).await?;

    match action.as_str() {
        "preview" => {
            let input_products = data
                .get("products")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            if input_products.is_empty() {
                return Err(AppError::bad_request(
                    "empty_import",
                    "No products to preview.",
                ));
            }
            let batch = make_batch(
                &input_products,
                &current_products,
                &user,
                text(data.get("source")),
                data.get("updateExisting")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
            );
            batches.insert(0, batch);
            let saved = save_import_batches(&batches).await?;
            append_admin_audit(
                "catalog_import",
                "preview",
                &user,
                json!({
                    "entityType": "import_batch",
                    "entityId": text(saved[0].get("id")),
                    "status": "preview",
                    "rowCount": input_products.len(),
                    "counts": saved[0].get("counts").cloned().unwrap_or_else(|| json!({}))
                }),
            )
            .await?;
            Ok((
                StatusCode::OK,
                no_store_headers(),
                Json(json!({ "batch": batch_summary(&saved[0]) })),
            ))
        }
        "reject" => {
            let id = text(data.get("id"));
            let index = find_batch_index(&batches, &id)?;
            if text(batches[index].get("status")) != "preview" {
                return Err(AppError::bad_request(
                    "invalid_batch_status",
                    "Only preview batches can be rejected.",
                ));
            }
            let now = Utc::now().to_rfc3339();
            if let Some(map) = batches[index].as_object_mut() {
                map.insert("status".to_string(), Value::String("rejected".to_string()));
                map.insert("rejectedAt".to_string(), Value::String(now));
                map.insert("rejectedBy".to_string(), Value::String(user_email(&user)));
            }
            let saved = save_import_batches(&batches).await?;
            append_admin_audit(
                "catalog_import",
                "reject",
                &user,
                json!({
                    "entityType": "import_batch",
                    "entityId": id,
                    "status": "rejected",
                    "counts": saved[index].get("counts").cloned().unwrap_or_else(|| json!({}))
                }),
            )
            .await?;
            Ok((
                StatusCode::OK,
                no_store_headers(),
                Json(json!({ "batch": batch_summary(&saved[index]) })),
            ))
        }
        "apply" => {
            let id = text(data.get("id"));
            let index = find_batch_index(&batches, &id)?;
            if text(batches[index].get("status")) != "preview" {
                return Err(AppError::bad_request(
                    "invalid_batch_status",
                    "Only preview batches can be applied.",
                ));
            }
            let next_products = apply_batch_products(&current_products, &batches[index]);
            if next_products.is_empty() || next_products.len() > MAX_PRODUCTS {
                return Err(AppError::bad_request(
                    "invalid_catalog_size",
                    "Catalog size after import is invalid.",
                ));
            }
            let now = Utc::now().to_rfc3339();
            let snapshot = json!({
                "products": current_products,
                "updatedAt": catalog.get("updatedAt").cloned().unwrap_or(Value::Null),
                "updatedBy": text(catalog.get("updatedBy"))
            });
            if let Some(map) = batches[index].as_object_mut() {
                map.insert("status".to_string(), Value::String("applied".to_string()));
                map.insert("appliedAt".to_string(), Value::String(now.clone()));
                map.insert("appliedBy".to_string(), Value::String(user_email(&user)));
                map.insert("snapshot".to_string(), snapshot);
            }
            save_catalog(&next_products, &user, &batches, &now, "import-batch-apply").await?;
            let saved = save_import_batches(&batches).await?;
            append_admin_audit(
                "catalog_import",
                "apply",
                &user,
                json!({
                    "entityType": "import_batch",
                    "entityId": id,
                    "status": "applied",
                    "productCount": next_products.len(),
                    "counts": saved[index].get("counts").cloned().unwrap_or_else(|| json!({}))
                }),
            )
            .await?;
            Ok((
                StatusCode::OK,
                no_store_headers(),
                Json(json!({
                    "batch": batch_summary(&saved[index]),
                    "count": next_products.len(),
                    "updatedAt": now
                })),
            ))
        }
        "rollback" => {
            let id = text(data.get("id"));
            let index = find_batch_index(&batches, &id)?;
            let latest = latest_applied_with_snapshot(&batches);
            if latest != Some(index) {
                return Err(AppError::bad_request(
                    "not_latest_applied_batch",
                    "Rollback is available only for the latest applied batch.",
                ));
            }
            let products = batches[index]
                .pointer("/snapshot/products")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            let now = Utc::now().to_rfc3339();
            if let Some(map) = batches[index].as_object_mut() {
                map.insert(
                    "status".to_string(),
                    Value::String("rolled_back".to_string()),
                );
                map.insert("rolledBackAt".to_string(), Value::String(now.clone()));
                map.insert("rolledBackBy".to_string(), Value::String(user_email(&user)));
            }
            save_catalog(&products, &user, &batches, &now, "import-batch-rollback").await?;
            let saved = save_import_batches(&batches).await?;
            append_admin_audit(
                "catalog_import",
                "rollback",
                &user,
                json!({
                    "entityType": "import_batch",
                    "entityId": id,
                    "status": "rolled_back",
                    "productCount": products.len(),
                    "counts": saved[index].get("counts").cloned().unwrap_or_else(|| json!({}))
                }),
            )
            .await?;
            Ok((
                StatusCode::OK,
                no_store_headers(),
                Json(json!({
                    "batch": batch_summary(&saved[index]),
                    "count": products.len(),
                    "updatedAt": now
                })),
            ))
        }
        _ => Err(AppError::bad_request(
            "unknown_action",
            "Unknown import batch action.",
        )),
    }
}

async fn require_admin_import_user(headers: &HeaderMap) -> AppResult<Value> {
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

async fn load_catalog() -> AppResult<Value> {
    Ok(load_store_value(CATALOG_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(|| json!({ "products": [] })))
}

async fn latest_catalog_products(catalog: &Value) -> AppResult<Vec<Value>> {
    let products = catalog
        .get("products")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if !products.is_empty() {
        return Ok(products);
    }
    let text = tokio::fs::read_to_string("data/products-live.json")
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    let products: Vec<Value> =
        serde_json::from_str(&text).map_err(|error| AppError::internal(error.to_string()))?;
    Ok(products)
}

async fn load_import_batches() -> AppResult<Vec<Value>> {
    let value = load_store_value(IMPORT_BATCHES_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(normalize_import_batches(value.as_ref()))
}

async fn save_import_batches(batches: &[Value]) -> AppResult<Vec<Value>> {
    let prepared = batches
        .iter()
        .filter(|batch| batch.is_object())
        .take(50)
        .cloned()
        .collect::<Vec<Value>>();
    let value = json!({
        "batches": prepared,
        "updatedAt": Utc::now().to_rfc3339(),
        "version": 1,
        "pim": { "version": 1, "importBatches": prepared.iter().map(batch_summary).collect::<Vec<Value>>() }
    });
    save_store_value(IMPORT_BATCHES_KEY, &value)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(prepared)
}

async fn save_catalog(
    products: &[Value],
    user: &Value,
    batches: &[Value],
    updated_at: &str,
    source: &str,
) -> AppResult<()> {
    let value = json!({
        "version": 1,
        "products": products,
        "updatedAt": updated_at,
        "updatedBy": user_email(user),
        "source": source,
        "pim": {
            "version": 1,
            "importBatches": batches.iter().map(batch_summary).collect::<Vec<Value>>()
        }
    });
    save_store_value(CATALOG_KEY, &value)
        .await
        .map_err(|error| AppError::internal(error.to_string()))
}

fn normalize_import_batches(value: Option<&Value>) -> Vec<Value> {
    let batches = match value {
        Some(Value::Array(items)) => items.clone(),
        Some(Value::Object(map)) => map
            .get("batches")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
        _ => Vec::new(),
    };
    batches.into_iter().filter(Value::is_object).collect()
}

fn make_batch(
    raw_products: &[Value],
    current_products: &[Value],
    user: &Value,
    source: String,
    update_existing: bool,
) -> Value {
    let existing_skus = current_products
        .iter()
        .map(|product| base_sku_key(product.get("baseSku")))
        .collect::<std::collections::BTreeSet<String>>();
    let mut seen = std::collections::BTreeSet::new();
    let mut rows = Vec::new();
    let mut products = Vec::new();
    let mut counts = json!({ "created": 0, "skipped": 0, "updated": 0, "errors": 0 });

    for (index, raw) in raw_products.iter().take(MAX_BATCH_PRODUCTS).enumerate() {
        let row = index + 1;
        let Some(product) = clean_product(raw) else {
            inc_count(&mut counts, "errors");
            rows.push(row_status(row, raw, "error", "error", "invalid_product"));
            continue;
        };
        let sku = base_sku_key(product.get("baseSku"));
        if !seen.insert(sku.clone()) {
            inc_count(&mut counts, "skipped");
            rows.push(row_status(
                row,
                &product,
                "duplicate_skipped",
                "skipped",
                "base_sku_repeated_in_batch",
            ));
            continue;
        }
        let exists = existing_skus.contains(&sku);
        if exists && !update_existing {
            inc_count(&mut counts, "skipped");
            rows.push(row_status(
                row,
                &product,
                "duplicate_skipped",
                "skipped",
                "base_sku_exists",
            ));
            continue;
        }
        let action = if exists { "updated" } else { "created" };
        inc_count(&mut counts, action);
        rows.push(json!({
            "row": row,
            "baseSku": text(product.get("baseSku")),
            "name": text(product.get("name")),
            "status": action,
            "action": action,
            "reason": "",
            "variantCount": variant_skus(&product).len()
        }));
        products.push(json!({ "action": action, "product": product }));
    }
    if raw_products.len() > MAX_BATCH_PRODUCTS {
        inc_count(&mut counts, "errors");
        rows.push(json!({
            "row": MAX_BATCH_PRODUCTS + 1,
            "baseSku": "",
            "name": "",
            "status": "error",
            "action": "error",
            "reason": "batch_too_large"
        }));
    }

    json!({
        "id": format!("IB-{}-{}", Utc::now().timestamp_millis(), short_hash(&Value::Array(rows.clone()))),
        "source": if source.is_empty() { "admin-import" } else { source.as_str() },
        "status": "preview",
        "updateExisting": update_existing,
        "createdAt": Utc::now().to_rfc3339(),
        "createdBy": user_email(user),
        "counts": counts,
        "rows": rows,
        "products": products
    })
}

fn apply_batch_products(current_products: &[Value], batch: &Value) -> Vec<Value> {
    let mut current = current_products.to_vec();
    let entries = batch
        .get("products")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    for entry in entries {
        let action = text(entry.get("action"));
        let Some(product) = entry.get("product").and_then(clean_product) else {
            continue;
        };
        let sku = base_sku_key(product.get("baseSku"));
        if action == "updated" {
            if let Some(slot) = current
                .iter_mut()
                .find(|item| base_sku_key(item.get("baseSku")) == sku)
            {
                *slot = product;
            }
        } else if action == "created"
            && !current
                .iter()
                .any(|item| base_sku_key(item.get("baseSku")) == sku)
        {
            current.insert(0, product);
        }
    }
    current
}

fn latest_applied_with_snapshot(batches: &[Value]) -> Option<usize> {
    batches
        .iter()
        .enumerate()
        .filter(|(_, batch)| {
            text(batch.get("status")) == "applied"
                && batch
                    .pointer("/snapshot/products")
                    .and_then(Value::as_array)
                    .is_some()
        })
        .max_by_key(|(_, batch)| text(batch.get("appliedAt")).max(text(batch.get("createdAt"))))
        .map(|(index, _)| index)
}

fn find_batch_index(batches: &[Value], id: &str) -> AppResult<usize> {
    batches
        .iter()
        .position(|batch| text(batch.get("id")) == id)
        .ok_or_else(|| AppError::not_found("batch_not_found", "Import batch was not found."))
}

fn batch_summary(batch: &Value) -> Value {
    let mut safe = batch.as_object().cloned().unwrap_or_default();
    safe.remove("products");
    safe.remove("snapshot");
    Value::Object(safe)
}

fn row_status(row: usize, product: &Value, status: &str, action: &str, reason: &str) -> Value {
    json!({
        "row": row,
        "baseSku": text(product.get("baseSku")),
        "name": text(product.get("name")),
        "status": status,
        "action": action,
        "reason": reason
    })
}

fn variant_skus(product: &Value) -> Vec<String> {
    let base = text(product.get("baseSku"));
    let types = value_list(product.get("types"));
    let sizes = value_list(product.get("sizes"));
    let materials = value_list(product.get("materials"));
    if types.is_empty() || sizes.is_empty() || materials.is_empty() {
        return vec![base];
    }
    let mut out = Vec::new();
    for item_type in &types {
        for size in &sizes {
            for material in &materials {
                out.push(format!(
                    "{}_{}_{}_{}",
                    base,
                    sku_part(item_type, 3),
                    sku_size_part(size),
                    sku_part(material, 3)
                ));
            }
        }
    }
    out
}

fn value_list(value: Option<&Value>) -> Vec<String> {
    value
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .map(|item| text(Some(item)))
                .filter(|item| !item.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn sku_part(value: &str, limit: usize) -> String {
    value
        .to_uppercase()
        .chars()
        .filter(|ch| ch.is_alphanumeric())
        .take(limit)
        .collect()
}

fn sku_size_part(value: &str) -> String {
    value
        .to_uppercase()
        .chars()
        .filter(|ch| ch.is_alphanumeric() || matches!(ch, 'X' | 'Х' | ',' | '.' | '-'))
        .collect()
}

fn base_sku_key(value: Option<&Value>) -> String {
    text(value).to_uppercase()
}

fn text(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.trim().to_string(),
        Some(Value::Number(number)) => number.to_string(),
        Some(Value::Bool(value)) => value.to_string(),
        _ => String::new(),
    }
}

fn user_email(user: &Value) -> String {
    text(user.get("email"))
}

fn inc_count(counts: &mut Value, key: &str) {
    let current = counts.get(key).and_then(Value::as_i64).unwrap_or(0);
    if let Some(map) = counts.as_object_mut() {
        map.insert(key.to_string(), json!(current + 1));
    }
}

fn short_hash(value: &Value) -> String {
    let mut hasher = Sha256::new();
    hasher.update(serde_json::to_string(value).unwrap_or_default());
    hex::encode(&hasher.finalize()[..3])
}

#[cfg(test)]
pub(crate) fn make_batch_for_test(raw_products: &[Value], current_products: &[Value]) -> Value {
    make_batch(
        raw_products,
        current_products,
        &json!({ "email": "admin@example.test" }),
        "test".to_string(),
        false,
    )
}
