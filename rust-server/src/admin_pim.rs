use std::{collections::HashMap, env, sync::Arc};

use axum::{
    extract::State,
    http::{header, HeaderMap, Uri},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

use crate::store::load_store_value as load_file_store_value;
use crate::{
    can_edit_content, load_current_user_from_file_store, no_store_headers, row_i64, string_field,
    AppError, AppResult, AppState,
};

const CATALOG_KEY: &str = "sobag:catalog:v1";
const IMPORT_BATCHES_KEY: &str = "sobag:import-batches:v1";

pub(crate) async fn admin_pim_preview(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: Uri,
) -> AppResult<Response> {
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

    let catalog = load_catalog_record(&state.pool).await?;
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

async fn load_catalog_record(pool: &PgPool) -> AppResult<Option<Value>> {
    let key = env::var("SOBAG_CATALOG_KEY").unwrap_or_else(|_| CATALOG_KEY.to_string());
    let Some(mut catalog) = load_file_store_value(&key)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
    else {
        return load_catalog_record_from_postgres(pool).await;
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

async fn load_catalog_record_from_postgres(pool: &PgPool) -> AppResult<Option<Value>> {
    let product_rows = sqlx::query(
        "SELECT p.id, p.base_sku, p.name, p.status, p.hidden, p.description, p.detail_description,
                p.stock, p.popular::bigint AS popular_int,
                COALESCE(NULLIF(p.min_price::double precision, 0), vp.min_price, 0) AS min_price,
                COALESCE(NULLIF(p.max_price::double precision, 0), vp.max_price, 0) AS max_price,
                COALESCE(NULLIF(p.variant_count::bigint, 0), vp.variant_count, 0) AS variant_count,
                array(
                    SELECT t.name FROM product_taxonomies pt
                    JOIN taxonomies t ON t.id = pt.taxonomy_id
                    WHERE pt.product_id = p.id AND pt.type = 'category'
                    ORDER BY t.name
                )::text[] AS categories,
                array(
                    SELECT t.name FROM product_taxonomies pt
                    JOIN taxonomies t ON t.id = pt.taxonomy_id
                    WHERE pt.product_id = p.id AND pt.type = 'collection'
                    ORDER BY t.name
                )::text[] AS collections,
                array(
                    SELECT t.name FROM product_taxonomies pt
                    JOIN taxonomies t ON t.id = pt.taxonomy_id
                    WHERE pt.product_id = p.id AND pt.type = 'holiday'
                    ORDER BY t.name
                )::text[] AS holidays,
                array(
                    SELECT t.name FROM product_taxonomies pt
                    JOIN taxonomies t ON t.id = pt.taxonomy_id
                    WHERE pt.product_id = p.id AND pt.type = 'tag'
                    ORDER BY t.name
                )::text[] AS tags
         FROM products p
         LEFT JOIN LATERAL (
             SELECT MIN(NULLIF(v.price::double precision, 0)) AS min_price,
                    MAX(NULLIF(v.price::double precision, 0)) AS max_price,
                    COUNT(*)::bigint AS variant_count
             FROM variants v
             WHERE v.product_id = p.id OR v.base_sku = p.base_sku
         ) vp ON TRUE
         ORDER BY p.base_sku ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    if product_rows.is_empty() {
        return Ok(None);
    }

    let variant_rows = sqlx::query(
        "SELECT id, product_id, base_sku, sku, type, size, material,
                concat_ws(' / ', NULLIF(type, ''), NULLIF(size, ''), NULLIF(material, '')) AS variant_name,
                price::double precision AS price_float,
                payload
         FROM variants
         ORDER BY product_id ASC, sku ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    let image_rows = sqlx::query(
        "SELECT id, product_id, url, storage_key, provider, width, height, mime,
                uploaded_at, sort_order, is_primary, payload
         FROM images
         ORDER BY product_id ASC, is_primary DESC, sort_order ASC, id ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| AppError::internal(error.to_string()))?;
    let batch_rows = sqlx::query(
        "SELECT id, source, status,
                COALESCE(created_at::text, '') AS created_at_text,
                COALESCE(applied_at::text, '') AS applied_at_text,
                row_count::bigint AS row_count_int,
                product_count::bigint AS product_count_int,
                snapshot_product_count::bigint AS snapshot_product_count_int,
                created::bigint AS created_int,
                updated::bigint AS updated_int,
                skipped::bigint AS skipped_int,
                errors::bigint AS errors_int
         FROM import_batches
         ORDER BY COALESCE(created_at, applied_at) DESC NULLS LAST, id DESC
         LIMIT 50",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut variants_by_product: HashMap<String, Vec<Value>> = HashMap::new();
    for row in variant_rows {
        let product_id: String = row.try_get("product_id").unwrap_or_default();
        let payload = row
            .try_get::<Value, _>("payload")
            .unwrap_or_else(|_| json!({}));
        variants_by_product
            .entry(product_id.clone())
            .or_default()
            .push(json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "productId": product_id,
                "baseSku": row.try_get::<String, _>("base_sku").unwrap_or_default(),
                "sku": row.try_get::<String, _>("sku").unwrap_or_default(),
                "type": row.try_get::<String, _>("type").unwrap_or_default(),
                "size": row.try_get::<String, _>("size").unwrap_or_default(),
                "material": row.try_get::<String, _>("material").unwrap_or_default(),
                "name": row.try_get::<String, _>("variant_name").unwrap_or_default(),
                "price": row_i64(&row, "price_float"),
                "priceSource": payload.get("priceSource")
                    .or_else(|| payload.get("price_group"))
                    .or_else(|| payload.get("priceGroup"))
                    .and_then(Value::as_str)
                    .unwrap_or("")
            }));
    }

    let mut images_by_product: HashMap<String, Vec<Value>> = HashMap::new();
    for row in image_rows {
        let product_id: String = row.try_get("product_id").unwrap_or_default();
        let payload = row
            .try_get::<Value, _>("payload")
            .unwrap_or_else(|_| json!({}));
        let is_primary = row.try_get::<bool, _>("is_primary").unwrap_or(false);
        images_by_product
            .entry(product_id.clone())
            .or_default()
            .push(json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "productId": product_id,
                "role": if is_primary { "main" } else { "gallery" },
                "source": "postgres",
                "url": row.try_get::<String, _>("url").unwrap_or_default(),
                "storageKey": row.try_get::<String, _>("storage_key").unwrap_or_default(),
                "provider": row.try_get::<String, _>("provider").unwrap_or_default(),
                "width": row.try_get::<i64, _>("width").unwrap_or(0),
                "height": row.try_get::<i64, _>("height").unwrap_or(0),
                "mime": row.try_get::<String, _>("mime").unwrap_or_default(),
                "fileName": "",
                "size": 0,
                "status": "active",
                "uploadedAt": row
                    .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("uploaded_at")
                    .ok()
                    .flatten()
                    .map(|value| value.to_rfc3339())
                    .unwrap_or_default(),
                "variants": payload.get("variants").cloned().unwrap_or_else(|| json!([]))
            }));
    }

    let mut products = Vec::new();
    for row in product_rows {
        let id: String = row.try_get("id").unwrap_or_default();
        let categories: Vec<String> = row.try_get("categories").unwrap_or_default();
        products.push(json!({
            "id": id,
            "baseSku": row.try_get::<String, _>("base_sku").unwrap_or_default(),
            "name": row.try_get::<String, _>("name").unwrap_or_default(),
            "status": row.try_get::<String, _>("status").unwrap_or_else(|_| "published".to_string()),
            "hidden": row.try_get::<bool, _>("hidden").unwrap_or(false),
            "category": categories.first().cloned().unwrap_or_default(),
            "categories": categories,
            "collections": row.try_get::<Vec<String>, _>("collections").unwrap_or_default(),
            "holidays": row.try_get::<Vec<String>, _>("holidays").unwrap_or_default(),
            "tags": row.try_get::<Vec<String>, _>("tags").unwrap_or_default(),
            "description": row.try_get::<String, _>("description").unwrap_or_default(),
            "detailDescription": row.try_get::<String, _>("detail_description").unwrap_or_default(),
            "basePrice": row_i64(&row, "min_price"),
            "stock": row.try_get::<String, _>("stock").unwrap_or_default(),
            "popular": row_i64(&row, "popular_int"),
            "minPrice": row_i64(&row, "min_price"),
            "maxPrice": row_i64(&row, "max_price"),
            "variantCount": row_i64(&row, "variant_count"),
            "variants": variants_by_product.remove(&id).unwrap_or_default(),
            "images": images_by_product.remove(&id).unwrap_or_default()
        }));
    }

    let import_batches = batch_rows
        .into_iter()
        .map(|row| {
            json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "source": row.try_get::<String, _>("source").unwrap_or_default(),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "createdAt": row.try_get::<String, _>("created_at_text").unwrap_or_default(),
                "appliedAt": row.try_get::<String, _>("applied_at_text").unwrap_or_default(),
                "rowCount": row_i64(&row, "row_count_int"),
                "productCount": row_i64(&row, "product_count_int"),
                "snapshotProductCount": row_i64(&row, "snapshot_product_count_int"),
                "counts": {
                    "created": row_i64(&row, "created_int"),
                    "updated": row_i64(&row, "updated_int"),
                    "skipped": row_i64(&row, "skipped_int"),
                    "errors": row_i64(&row, "errors_int")
                }
            })
        })
        .collect::<Vec<_>>();

    Ok(Some(json!({
        "products": products.clone(),
        "updatedAt": Utc::now().to_rfc3339(),
        "updatedBy": "postgres",
        "version": 1,
        "pim": build_pim_from_products(products, import_batches)
    })))
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

pub(crate) fn pim_report_for_view(catalog: &Value, view: &str) -> AppResult<Value> {
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

pub(crate) fn pim_csv_for_view(catalog: &Value, view: &str) -> AppResult<(String, String)> {
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
