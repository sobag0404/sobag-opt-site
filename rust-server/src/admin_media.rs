use std::{collections::BTreeMap, env};

use axum::{
    body::Bytes,
    http::{header, HeaderMap, StatusCode, Uri},
    Json,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Method;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use url::Url;

use crate::{
    can_edit_content, load_current_user_from_file_store, no_store_headers, AppError, AppResult,
};

type HmacSha256 = Hmac<Sha256>;

const DEFAULT_PROVIDER: &str = "s3-compatible";
const PRODUCT_IMAGE_PREFIX: &str = "products";
const MAX_JSON_IMAGE_BYTES: usize = 8 * 1024 * 1024;
const EMPTY_SHA256: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

#[derive(Clone, Debug)]
struct S3Config {
    endpoint: String,
    endpoint_source: String,
    bucket: String,
    access_key_id: String,
    secret_access_key: String,
    session_token: String,
    region: String,
    public_base_url: String,
    force_path_style: bool,
}

pub(crate) async fn admin_product_images_get(
    headers: HeaderMap,
    uri: Uri,
) -> AppResult<(HeaderMap, Json<Value>)> {
    require_media_user(&headers).await?;
    let params = query_params(uri.query().unwrap_or(""));
    let product_key = first_param(&params, &["product", "baseSku"]);
    if product_key.is_empty() {
        let mut payload = object_storage_status();
        if let Some(map) = payload.as_object_mut() {
            map.insert("images".to_string(), json!([]));
        }
        return Ok((no_store_headers(), Json(payload)));
    }
    let config = s3_config()?;
    let images = s3_list_by_product(&config, &product_key).await?;
    let mut payload = object_storage_status();
    if let Some(map) = payload.as_object_mut() {
        map.insert("productKey".to_string(), Value::String(product_key));
        map.insert("images".to_string(), Value::Array(images));
    }
    Ok((no_store_headers(), Json(payload)))
}

pub(crate) async fn admin_product_images_post(
    headers: HeaderMap,
    body: Bytes,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    require_media_user(&headers).await?;
    if body.len() > MAX_JSON_IMAGE_BYTES * 2 {
        return Err(AppError::bad_request(
            "invalid_image_size",
            "Image payload is empty or too large for JSON upload.",
        ));
    }
    let data = json_from_bytes(&body)?;
    let action = text(first_value(&data, &["action"]));
    if action == "mark-unused" {
        let image = normalize_image_metadata(data.get("image").unwrap_or(&data))?;
        let marked = mark_unused(&image);
        return Ok((
            StatusCode::OK,
            no_store_headers(),
            Json(json!({ "image": marked })),
        ));
    }
    if !action.is_empty() && action != "upload" {
        return Err(AppError::bad_request(
            "unknown_action",
            "Unknown image storage action.",
        ));
    }

    let product_key = text(first_value(&data, &["productKey", "baseSku", "productId"]));
    if product_key.is_empty() {
        return Err(AppError::bad_request(
            "missing_product_key",
            "Product key is required for image upload.",
        ));
    }
    let (image_body, mime) = parse_image_body(&data)?;
    let file_name = text(first_value(&data, &["fileName", "name"]));
    let width = number_or_null(data.get("width"));
    let height = number_or_null(data.get("height"));
    let config = s3_config()?;
    let storage_key = product_image_key(&product_key, &file_name, &mime)?;
    let image = s3_upload(
        &config,
        &storage_key,
        &image_body,
        &mime,
        &file_name,
        width,
        height,
    )
    .await?;
    Ok((
        StatusCode::OK,
        no_store_headers(),
        Json(json!({ "image": image })),
    ))
}

pub(crate) async fn admin_product_images_delete(
    headers: HeaderMap,
    uri: Uri,
    body: Bytes,
) -> AppResult<(StatusCode, HeaderMap, Json<Value>)> {
    require_media_user(&headers).await?;
    let params = query_params(uri.query().unwrap_or(""));
    let mut data = if body.is_empty() {
        json!({})
    } else {
        json_from_bytes(&body)?
    };
    if let Some(map) = data.as_object_mut() {
        if let Some(value) = params.get("url").and_then(|items| items.first()) {
            map.insert("url".to_string(), Value::String(value.clone()));
        }
        if let Some(value) = params.get("storageKey").and_then(|items| items.first()) {
            map.insert("storageKey".to_string(), Value::String(value.clone()));
        }
    }
    let image = normalize_image_metadata(data.get("image").unwrap_or(&data))?;
    if text(data.get("mode")) == "mark-unused" {
        let marked = mark_unused(&image);
        return Ok((
            StatusCode::OK,
            no_store_headers(),
            Json(json!({ "image": marked })),
        ));
    }
    let config = s3_config()?;
    let storage_key = storage_key_from_image(&image, &config)?;
    s3_delete(&config, &storage_key).await?;
    let mut deleted = image;
    if let Some(map) = deleted.as_object_mut() {
        map.insert("status".to_string(), Value::String("deleted".to_string()));
        map.insert(
            "deletedAt".to_string(),
            Value::String(Utc::now().to_rfc3339()),
        );
    }
    Ok((
        StatusCode::OK,
        no_store_headers(),
        Json(json!({ "image": deleted })),
    ))
}

async fn require_media_user(headers: &HeaderMap) -> AppResult<Value> {
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

fn json_from_bytes(bytes: &[u8]) -> AppResult<Value> {
    serde_json::from_slice(bytes)
        .map_err(|_| AppError::bad_request("invalid_json", "Invalid JSON payload."))
}

fn parse_image_body(data: &Value) -> AppResult<(Vec<u8>, String)> {
    let data_url = text(data.get("dataUrl"));
    let mut mime = text(first_value(data, &["mime", "contentType"]));
    let mut base64 = text(data.get("base64"));
    if !data_url.is_empty() {
        let Some((prefix, payload)) = data_url.split_once(",") else {
            return Err(AppError::bad_request(
                "invalid_image_payload",
                "Invalid dataUrl image payload.",
            ));
        };
        let Some(content_type) = prefix
            .strip_prefix("data:")
            .and_then(|item| item.strip_suffix(";base64"))
        else {
            return Err(AppError::bad_request(
                "invalid_image_payload",
                "Invalid dataUrl image payload.",
            ));
        };
        mime = content_type.to_string();
        base64 = payload.to_string();
    }
    if base64.is_empty() {
        return Err(AppError::bad_request(
            "missing_image_payload",
            "Missing base64 image payload.",
        ));
    }
    if !mime.starts_with("image/") || !allowed_mime(&mime) {
        return Err(AppError::bad_request(
            "unsupported_image_mime",
            "Only supported image uploads are allowed.",
        ));
    }
    let body = BASE64.decode(base64.as_bytes()).map_err(|_| {
        AppError::bad_request("invalid_image_payload", "Invalid base64 image payload.")
    })?;
    if body.is_empty() || body.len() > MAX_JSON_IMAGE_BYTES {
        return Err(AppError::bad_request(
            "invalid_image_size",
            "Image payload is empty or too large for JSON upload.",
        ));
    }
    Ok((body, mime))
}

fn object_storage_status() -> Value {
    let provider = normalize_provider(&env_text("SOBAG_OBJECT_STORAGE_PROVIDER"));
    let config = s3_config_raw();
    json!({
        "provider": provider,
        "configured": config.is_some(),
        "publicUrlConfigured": !env_text("SOBAG_S3_PUBLIC_BASE_URL").is_empty(),
        "supported": provider == DEFAULT_PROVIDER
    })
}

fn s3_config() -> AppResult<S3Config> {
    s3_config_raw().ok_or_else(|| {
        AppError::service_unavailable(
            "s3_storage_not_configured",
            "S3-compatible object storage is not configured.",
        )
    })
}

fn s3_config_raw() -> Option<S3Config> {
    let endpoint = env_text("SOBAG_S3_ENDPOINT");
    let bucket = env_text("SOBAG_S3_BUCKET");
    let access_key_id = env_text("SOBAG_S3_ACCESS_KEY_ID");
    let secret_access_key = env_text("SOBAG_S3_SECRET_ACCESS_KEY");
    if endpoint.is_empty()
        || bucket.is_empty()
        || access_key_id.is_empty()
        || secret_access_key.is_empty()
    {
        return None;
    }
    Some(S3Config {
        endpoint: s3_api_endpoint(&endpoint),
        endpoint_source: s3_api_endpoint_source(&endpoint),
        bucket,
        access_key_id,
        secret_access_key,
        session_token: env_text("SOBAG_S3_SESSION_TOKEN"),
        region: {
            let value = env_text("SOBAG_S3_REGION");
            if value.is_empty() {
                "auto".to_string()
            } else {
                value
            }
        },
        public_base_url: env_text("SOBAG_S3_PUBLIC_BASE_URL"),
        force_path_style: env_bool("SOBAG_S3_FORCE_PATH_STYLE", true),
    })
}

fn s3_api_endpoint(configured_endpoint: &str) -> String {
    for name in [
        "SOBAG_S3_INTERNAL_ENDPOINT",
        "SOBAG_S3_API_ENDPOINT",
        "AWS_ENDPOINT_URL_S3",
        "AWS_ENDPOINT_URL",
    ] {
        let value = env_text(name);
        if !value.is_empty() {
            return value;
        }
    }
    if endpoint_looks_like_public_read_url(configured_endpoint) {
        let local = env_text("SOBAG_S3_LOCAL_ENDPOINT");
        if local.is_empty() {
            return "http://127.0.0.1:9000".to_string();
        }
        return local;
    }
    configured_endpoint.to_string()
}

fn s3_api_endpoint_source(configured_endpoint: &str) -> String {
    for name in [
        "SOBAG_S3_INTERNAL_ENDPOINT",
        "SOBAG_S3_API_ENDPOINT",
        "AWS_ENDPOINT_URL_S3",
        "AWS_ENDPOINT_URL",
    ] {
        if !env_text(name).is_empty() {
            return name.to_string();
        }
    }
    if endpoint_looks_like_public_read_url(configured_endpoint) {
        if env_text("SOBAG_S3_LOCAL_ENDPOINT").is_empty() {
            return "derived-local-minio".to_string();
        }
        return "SOBAG_S3_LOCAL_ENDPOINT".to_string();
    }
    "SOBAG_S3_ENDPOINT".to_string()
}

fn endpoint_looks_like_public_read_url(configured_endpoint: &str) -> bool {
    let public_base = env_text("SOBAG_S3_PUBLIC_BASE_URL");
    if public_base.is_empty() {
        return false;
    }
    endpoint_matches_public_base(configured_endpoint, &public_base)
}

fn endpoint_matches_public_base(configured_endpoint: &str, public_base: &str) -> bool {
    let Ok(endpoint) = Url::parse(configured_endpoint) else {
        return false;
    };
    let Ok(public_url) = Url::parse(public_base) else {
        return false;
    };
    endpoint.host_str() == public_url.host_str()
        && endpoint
            .path()
            .trim_end_matches('/')
            .eq(public_url.path().trim_end_matches('/'))
}

fn env_text(name: &str) -> String {
    env::var(name).unwrap_or_default().trim().to_string()
}

fn env_bool(name: &str, fallback: bool) -> bool {
    match env_text(name).to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => true,
        "0" | "false" | "no" | "off" => false,
        _ => fallback,
    }
}

fn normalize_provider(value: &str) -> String {
    let provider = if value.trim().is_empty() {
        DEFAULT_PROVIDER
    } else {
        value.trim()
    }
    .to_ascii_lowercase();
    match provider.as_str() {
        "s3" | "minio" | "r2" => DEFAULT_PROVIDER.to_string(),
        DEFAULT_PROVIDER => DEFAULT_PROVIDER.to_string(),
        _ => provider,
    }
}

fn product_image_key(product_key: &str, file_name: &str, mime: &str) -> AppResult<String> {
    let product = safe_path_segment(product_key, "unknown-product");
    let fallback = format!("image{}", extension_from_mime(mime));
    let name = safe_image_file_name(file_name, &fallback, mime);
    let mut random = [0u8; 4];
    getrandom::getrandom(&mut random)
        .map_err(|_| AppError::internal("random generation failed"))?;
    Ok(format!(
        "{}/{}/{}-{}-{}",
        PRODUCT_IMAGE_PREFIX,
        product,
        Utc::now().timestamp_millis(),
        hex::encode(random),
        name
    ))
}

fn safe_path_segment(value: &str, fallback: &str) -> String {
    let mut out = String::new();
    let mut last_dash = false;
    for ch in value.chars() {
        let keep = ch.is_ascii_alphanumeric() || matches!(ch, '_' | '-');
        let next = if keep { ch } else { '-' };
        if next == '-' {
            if last_dash {
                continue;
            }
            last_dash = true;
        } else {
            last_dash = false;
        }
        out.push(next);
        if out.len() >= 120 {
            break;
        }
    }
    let cleaned = out.trim_matches('-').to_string();
    if cleaned.is_empty() {
        fallback.to_string()
    } else {
        cleaned
    }
}

fn safe_file_name(value: &str, fallback: &str) -> String {
    let mut out = String::new();
    let source = if value.trim().is_empty() {
        fallback
    } else {
        value
    };
    for ch in source.chars() {
        let next = if matches!(ch, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|')
            || ch.is_whitespace()
        {
            '-'
        } else {
            ch
        };
        out.push(next);
        if out.len() >= 160 {
            break;
        }
    }
    let cleaned = out.trim_matches('-').to_string();
    if cleaned.is_empty() {
        fallback.to_string()
    } else {
        cleaned
    }
}

fn safe_image_file_name(value: &str, fallback: &str, mime: &str) -> String {
    let mut name = safe_file_name(value, fallback);
    let lower = name.to_ascii_lowercase();
    if !matches!(
        lower.rsplit('.').next().unwrap_or(""),
        "png" | "jpg" | "jpeg" | "webp" | "avif" | "gif"
    ) {
        name.push_str(extension_from_mime(mime));
    }
    name
}

fn extension_from_mime(mime: &str) -> &'static str {
    match mime.to_ascii_lowercase().as_str() {
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/avif" => ".avif",
        "image/gif" => ".gif",
        "image/jpeg" | "image/jpg" => ".jpg",
        _ => ".jpg",
    }
}

fn allowed_mime(mime: &str) -> bool {
    matches!(
        mime.to_ascii_lowercase().as_str(),
        "image/png" | "image/jpeg" | "image/jpg" | "image/webp" | "image/avif" | "image/gif"
    )
}

async fn s3_upload(
    config: &S3Config,
    key: &str,
    body: &[u8],
    mime: &str,
    file_name: &str,
    width: Value,
    height: Value,
) -> AppResult<Value> {
    validate_storage_key(key)?;
    let response = s3_fetch(
        config,
        Method::PUT,
        key,
        BTreeMap::new(),
        vec![("content-type".to_string(), mime.to_string())],
        Some(body.to_vec()),
    )
    .await?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::bad_gateway(
            "s3_upload_failed",
            format!(
                "S3 upload failed with HTTP {}; class={}; {}.",
                status,
                classify_s3_error_body(&body),
                safe_s3_diagnostics(config)
            ),
        ));
    }
    let etag = response
        .headers()
        .get("etag")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .trim_matches('"')
        .to_string();
    Ok(normalize_image_metadata_value(json!({
        "provider": DEFAULT_PROVIDER,
        "url": public_url_for_key(config, key),
        "storageKey": key,
        "mime": mime,
        "uploadedAt": Utc::now().to_rfc3339(),
        "fileName": file_name,
        "size": body.len(),
        "etag": etag,
        "width": width,
        "height": height
    })))
}

async fn s3_delete(config: &S3Config, key: &str) -> AppResult<()> {
    validate_storage_key(key)?;
    let response = s3_fetch(
        config,
        Method::DELETE,
        key,
        BTreeMap::new(),
        Vec::new(),
        None,
    )
    .await?;
    if !response.status().is_success() && response.status().as_u16() != 404 {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::bad_gateway(
            "s3_delete_failed",
            format!(
                "S3 delete failed with HTTP {}; class={}; {}.",
                status,
                classify_s3_error_body(&body),
                safe_s3_diagnostics(config)
            ),
        ));
    }
    Ok(())
}

async fn s3_list_by_product(config: &S3Config, product_key: &str) -> AppResult<Vec<Value>> {
    let prefix = format!(
        "{}/{}/",
        PRODUCT_IMAGE_PREFIX,
        safe_path_segment(product_key, "unknown-product")
    );
    validate_storage_prefix(&prefix)?;
    let mut query = BTreeMap::new();
    query.insert("list-type".to_string(), "2".to_string());
    query.insert("prefix".to_string(), prefix);
    query.insert("max-keys".to_string(), "100".to_string());
    let response = s3_fetch(config, Method::GET, "", query, Vec::new(), None).await?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::bad_gateway(
            "s3_list_failed",
            format!(
                "S3 list failed with HTTP {}; class={}; {}.",
                status,
                classify_s3_error_body(&body),
                safe_s3_diagnostics(config)
            ),
        ));
    }
    let xml = response
        .text()
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(parse_s3_list_xml(&xml)
        .into_iter()
        .map(|item| {
            normalize_image_metadata_value(json!({
                "provider": DEFAULT_PROVIDER,
                "url": public_url_for_key(config, &item.key),
                "storageKey": item.key,
                "mime": item.mime,
                "uploadedAt": item.last_modified,
                "size": item.size,
                "etag": item.etag,
                "fileName": item.file_name
            }))
        })
        .collect())
}

async fn s3_fetch(
    config: &S3Config,
    method: Method,
    key: &str,
    query: BTreeMap<String, String>,
    headers: Vec<(String, String)>,
    body: Option<Vec<u8>>,
) -> AppResult<reqwest::Response> {
    let url = build_s3_url(config, key, &query)?;
    let signed = sign_s3_request(config, method.as_str(), &url, headers, body.as_deref())?;
    let client = reqwest::Client::new();
    let mut request = client.request(method, url);
    for (key, value) in signed {
        request = request.header(key, value);
    }
    if let Some(body) = body {
        request = request.body(body);
    }
    request
        .send()
        .await
        .map_err(|error| AppError::bad_gateway("s3_request_failed", error.to_string()))
}

fn build_s3_url(config: &S3Config, key: &str, query: &BTreeMap<String, String>) -> AppResult<Url> {
    let mut url = Url::parse(&config.endpoint)
        .map_err(|_| AppError::internal("Invalid S3 endpoint configuration."))?;
    let base = url.path().trim_end_matches('/').to_string();
    let key_path = encode_key_path(key);
    let bucket = encode_uri_segment(&config.bucket);
    if config.force_path_style {
        let path = format!(
            "{}/{}{}",
            base,
            bucket,
            if key_path.is_empty() {
                String::new()
            } else {
                format!("/{}", key_path)
            }
        );
        url.set_path(if path.is_empty() { "/" } else { &path });
    } else {
        let host = url
            .host_str()
            .ok_or_else(|| AppError::internal("Invalid S3 endpoint host."))?
            .to_string();
        url.set_host(Some(&format!("{}.{}", config.bucket, host)))
            .map_err(|_| AppError::internal("Invalid S3 virtual host."))?;
        url.set_path(&format!(
            "{}{}",
            base,
            if key_path.is_empty() {
                "/".to_string()
            } else {
                format!("/{}", key_path)
            }
        ));
    }
    if !query.is_empty() {
        url.set_query(Some(&canonical_query(query)));
    }
    Ok(url)
}

fn safe_s3_diagnostics(config: &S3Config) -> String {
    let endpoint = Url::parse(&config.endpoint).ok();
    let endpoint_host = endpoint
        .as_ref()
        .map(canonical_host)
        .unwrap_or_else(|| "invalid-endpoint".to_string());
    let endpoint_path = endpoint
        .as_ref()
        .map(|url| {
            if url.path().trim().is_empty() || url.path() == "/" {
                "/".to_string()
            } else {
                url.path().to_string()
            }
        })
        .unwrap_or_else(|| "invalid".to_string());
    let region = if config.region.is_empty() {
        "empty"
    } else {
        "set"
    };
    format!(
        "endpointSource={}, endpointHost={}, endpointPath={}, pathStyle={}, region={}",
        config.endpoint_source, endpoint_host, endpoint_path, config.force_path_style, region
    )
}

fn classify_s3_error_body(body: &str) -> String {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return "empty".to_string();
    }
    let code = xml_value(trimmed, "Code");
    if !code.is_empty() {
        return safe_path_segment(&code, "xml-error");
    }
    if trimmed.starts_with('{') {
        return "json-error".to_string();
    }
    "text-error".to_string()
}

fn sign_s3_request(
    config: &S3Config,
    method: &str,
    url: &Url,
    headers: Vec<(String, String)>,
    body: Option<&[u8]>,
) -> AppResult<Vec<(String, String)>> {
    let payload_hash = body
        .map(sha256_hex)
        .unwrap_or_else(|| EMPTY_SHA256.to_string());
    let now = Utc::now();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date_stamp = now.format("%Y%m%d").to_string();
    let mut all = BTreeMap::new();
    for (key, value) in headers {
        all.insert(key.to_ascii_lowercase(), normalize_header_value(&value));
    }
    all.insert("host".to_string(), canonical_host(url));
    all.insert("x-amz-content-sha256".to_string(), payload_hash.clone());
    all.insert("x-amz-date".to_string(), amz_date.clone());
    if !config.session_token.is_empty() {
        all.insert(
            "x-amz-security-token".to_string(),
            config.session_token.clone(),
        );
    }
    let signed_headers = all.keys().cloned().collect::<Vec<_>>().join(";");
    let canonical_headers = all
        .iter()
        .map(|(key, value)| format!("{}:{}\n", key, value))
        .collect::<String>();
    let canonical_request = [
        method.to_ascii_uppercase(),
        url.path().to_string(),
        url.query().unwrap_or("").to_string(),
        canonical_headers,
        signed_headers.clone(),
        payload_hash,
    ]
    .join("\n");
    let credential_scope = format!("{}/{}/s3/aws4_request", date_stamp, config.region);
    let string_to_sign = [
        "AWS4-HMAC-SHA256".to_string(),
        amz_date,
        credential_scope.clone(),
        sha256_hex(canonical_request.as_bytes()),
    ]
    .join("\n");
    let date_key = hmac_sha256(
        format!("AWS4{}", config.secret_access_key).as_bytes(),
        date_stamp.as_bytes(),
    )?;
    let region_key = hmac_sha256(&date_key, config.region.as_bytes())?;
    let service_key = hmac_sha256(&region_key, b"s3")?;
    let signing_key = hmac_sha256(&service_key, b"aws4_request")?;
    let signature = hex::encode(hmac_sha256(&signing_key, string_to_sign.as_bytes())?);
    all.insert(
        "authorization".to_string(),
        format!(
            "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
            config.access_key_id, credential_scope, signed_headers, signature
        ),
    );
    Ok(all.into_iter().collect())
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> AppResult<Vec<u8>> {
    let mut mac =
        HmacSha256::new_from_slice(key).map_err(|_| AppError::internal("S3 signing failed."))?;
    mac.update(data);
    Ok(mac.finalize().into_bytes().to_vec())
}

fn sha256_hex(data: &[u8]) -> String {
    hex::encode(Sha256::digest(data))
}

fn canonical_query(params: &BTreeMap<String, String>) -> String {
    params
        .iter()
        .map(|(key, value)| format!("{}={}", encode_uri_segment(key), encode_uri_segment(value)))
        .collect::<Vec<_>>()
        .join("&")
}

fn encode_key_path(key: &str) -> String {
    key.split('/')
        .filter(|segment| !segment.is_empty())
        .map(encode_uri_segment)
        .collect::<Vec<_>>()
        .join("/")
}

fn encode_uri_segment(value: &str) -> String {
    url::form_urlencoded::byte_serialize(value.as_bytes()).collect()
}

fn canonical_host(url: &Url) -> String {
    match (url.host_str(), url.port()) {
        (Some(host), Some(port)) => format!("{}:{}", host, port),
        (Some(host), None) => host.to_string(),
        _ => String::new(),
    }
}

fn public_url_for_key(config: &S3Config, key: &str) -> String {
    if !config.public_base_url.is_empty() {
        format!(
            "{}/{}",
            config.public_base_url.trim_end_matches('/'),
            encode_key_path(key)
        )
    } else {
        build_s3_url(config, key, &BTreeMap::new())
            .map(|url| url.to_string())
            .unwrap_or_default()
    }
}

fn normalize_image_metadata(input: &Value) -> AppResult<Value> {
    let normalized = normalize_image_metadata_value(input.clone());
    if normalized
        .get("url")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .is_empty()
        && normalized
            .get("storageKey")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .is_empty()
    {
        return Err(AppError::bad_request(
            "missing_image_metadata",
            "Missing image metadata.",
        ));
    }
    Ok(normalized)
}

fn normalize_image_metadata_value(input: Value) -> Value {
    let object = input.as_object().cloned().unwrap_or_default();
    let variants = object
        .get("variants")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .map(|item| normalize_image_metadata_value(item.clone()))
                .filter(|item| {
                    !text(item.get("url")).is_empty() || !text(item.get("storageKey")).is_empty()
                })
                .collect::<Vec<Value>>()
        })
        .unwrap_or_default();
    let provider = {
        let provider = text(object.get("provider"));
        if provider.is_empty() {
            String::new()
        } else {
            normalize_provider(&provider)
        }
    };
    let uploaded_at = {
        let value = text(object.get("uploadedAt"));
        if value.is_empty() {
            Utc::now().to_rfc3339()
        } else {
            value
        }
    };
    let status = {
        let value = text(object.get("status"));
        if value.is_empty() {
            "active".to_string()
        } else {
            value
        }
    };
    json!({
        "url": text(first_map_value(&object, &["url", "downloadUrl", "publicUrl"])),
        "storageKey": text(first_map_value(&object, &["storageKey", "pathname", "key"])),
        "provider": provider,
        "width": number_or_null(object.get("width")),
        "height": number_or_null(object.get("height")),
        "mime": text(first_map_value(&object, &["mime", "contentType"])),
        "uploadedAt": uploaded_at,
        "fileName": text(object.get("fileName")),
        "size": number_or_null(object.get("size")),
        "etag": text(object.get("etag")),
        "status": status,
        "variants": variants
    })
}

fn mark_unused(image: &Value) -> Value {
    let mut next = image.clone();
    if let Some(map) = next.as_object_mut() {
        map.insert("status".to_string(), Value::String("unused".to_string()));
        map.insert(
            "markedUnusedAt".to_string(),
            Value::String(Utc::now().to_rfc3339()),
        );
    }
    next
}

fn storage_key_from_image(image: &Value, config: &S3Config) -> AppResult<String> {
    let storage_key = text(image.get("storageKey"));
    if !storage_key.is_empty() {
        validate_storage_key(&storage_key)?;
        return Ok(storage_key);
    }
    let url = text(image.get("url"));
    if url.is_empty() {
        return Err(AppError::bad_request(
            "missing_s3_storage_key",
            "Missing S3 storage key.",
        ));
    }
    if !config.public_base_url.is_empty() {
        let base = config.public_base_url.trim_end_matches('/');
        if let Some(rest) = url.strip_prefix(&format!("{}/", base)) {
            let key = decode_key_path(rest);
            validate_storage_key(&key)?;
            return Ok(key);
        }
    }
    let parsed = Url::parse(&url)
        .map_err(|_| AppError::bad_request("missing_s3_storage_key", "Missing S3 storage key."))?;
    let path = decode_key_path(parsed.path().trim_start_matches('/'));
    let bucket_prefix = format!("{}/", config.bucket);
    let key = if path.starts_with(&bucket_prefix) {
        path[bucket_prefix.len()..].to_string()
    } else {
        path
    };
    validate_storage_key(&key)?;
    Ok(key)
}

fn validate_storage_key(key: &str) -> AppResult<()> {
    let key = key.trim();
    if key.is_empty()
        || key.starts_with('/')
        || key.contains('\\')
        || key.split('/').any(|part| part == ".." || part.is_empty())
        || !key.starts_with(&format!("{}/", PRODUCT_IMAGE_PREFIX))
    {
        return Err(AppError::bad_request(
            "invalid_storage_key",
            "Invalid image storage key.",
        ));
    }
    Ok(())
}

fn validate_storage_prefix(prefix: &str) -> AppResult<()> {
    let prefix = prefix.trim();
    if !prefix.ends_with('/') {
        return validate_storage_key(prefix);
    }
    let key_like = prefix.trim_end_matches('/');
    validate_storage_key(key_like)
}

fn decode_key_path(path: &str) -> String {
    path.split('/')
        .filter(|segment| !segment.is_empty())
        .map(|segment| {
            url::form_urlencoded::parse(segment.as_bytes())
                .next()
                .map(|(_, value)| value.into_owned())
                .unwrap_or_else(|| segment.to_string())
        })
        .collect::<Vec<_>>()
        .join("/")
}

#[derive(Debug)]
struct S3ListItem {
    key: String,
    last_modified: String,
    etag: String,
    size: Value,
    mime: String,
    file_name: String,
}

fn parse_s3_list_xml(xml: &str) -> Vec<S3ListItem> {
    xml.split("<Contents>")
        .skip(1)
        .filter_map(|chunk| chunk.split("</Contents>").next())
        .filter_map(|block| {
            let key = xml_value(block, "Key");
            if key.is_empty() || validate_storage_key(&key).is_err() {
                return None;
            }
            let size = xml_value(block, "Size")
                .parse::<i64>()
                .ok()
                .map(Value::from)
                .unwrap_or(Value::Null);
            let file_name = key.rsplit('/').next().unwrap_or("").to_string();
            Some(S3ListItem {
                key,
                last_modified: xml_value(block, "LastModified"),
                etag: xml_value(block, "ETag").trim_matches('"').to_string(),
                size,
                mime: String::new(),
                file_name,
            })
        })
        .collect()
}

fn xml_value(block: &str, tag: &str) -> String {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    block
        .split(&open)
        .nth(1)
        .and_then(|value| value.split(&close).next())
        .map(xml_decode)
        .unwrap_or_default()
}

fn xml_decode(value: &str) -> String {
    value
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&gt;", ">")
        .replace("&lt;", "<")
        .replace("&amp;", "&")
}

fn normalize_header_value(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn query_params(raw: &str) -> BTreeMap<String, Vec<String>> {
    let mut params = BTreeMap::new();
    for (key, value) in url::form_urlencoded::parse(raw.as_bytes()) {
        params
            .entry(key.into_owned())
            .or_insert_with(Vec::new)
            .push(value.into_owned());
    }
    params
}

fn first_param(params: &BTreeMap<String, Vec<String>>, keys: &[&str]) -> String {
    keys.iter()
        .find_map(|key| params.get(*key).and_then(|items| items.first()))
        .cloned()
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn first_value<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a Value> {
    keys.iter().find_map(|key| value.get(*key))
}

fn first_map_value<'a>(
    map: &'a serde_json::Map<String, Value>,
    keys: &[&str],
) -> Option<&'a Value> {
    keys.iter().find_map(|key| map.get(*key))
}

fn text(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.trim().to_string(),
        Some(Value::Number(number)) => number.to_string(),
        Some(Value::Bool(value)) => value.to_string(),
        _ => String::new(),
    }
}

fn number_or_null(value: Option<&Value>) -> Value {
    match value {
        Some(Value::Number(number)) => Value::Number(number.clone()),
        Some(Value::String(text)) => text.parse::<i64>().map(Value::from).unwrap_or(Value::Null),
        _ => Value::Null,
    }
}

#[cfg(test)]
pub(crate) fn product_image_key_for_test(product_key: &str, file_name: &str, mime: &str) -> String {
    product_image_key(product_key, file_name, mime).expect("test product image key")
}

#[cfg(test)]
pub(crate) fn normalize_image_for_test(value: Value) -> Value {
    normalize_image_metadata_value(value)
}

#[cfg(test)]
pub(crate) fn validate_storage_key_for_test(key: &str) -> bool {
    validate_storage_key(key).is_ok()
}

#[cfg(test)]
pub(crate) fn validate_storage_prefix_for_test(prefix: &str) -> bool {
    validate_storage_prefix(prefix).is_ok()
}

#[cfg(test)]
pub(crate) fn canonical_host_for_test(raw_url: &str) -> String {
    Url::parse(raw_url)
        .map(|url| canonical_host(&url))
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn endpoint_matches_public_base_for_test(endpoint: &str, public_base: &str) -> bool {
    endpoint_matches_public_base(endpoint, public_base)
}

#[cfg(test)]
pub(crate) fn s3_url_for_test(
    endpoint: &str,
    bucket: &str,
    force_path_style: bool,
    key: &str,
) -> String {
    let config = S3Config {
        endpoint: endpoint.to_string(),
        endpoint_source: "test".to_string(),
        bucket: bucket.to_string(),
        access_key_id: "test-access".to_string(),
        secret_access_key: "test-secret".to_string(),
        session_token: String::new(),
        region: "us-east-1".to_string(),
        public_base_url: String::new(),
        force_path_style,
    };
    build_s3_url(&config, key, &BTreeMap::new())
        .map(|url| url.to_string())
        .unwrap_or_default()
}
