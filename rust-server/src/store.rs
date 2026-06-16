use std::{
    env,
    path::{Path as FsPath, PathBuf},
};

use chrono::{DateTime, Utc};
use serde_json::{json, Value};

pub(crate) async fn load_store_value(key: &str) -> Result<Option<Value>, std::io::Error> {
    match store_provider() {
        StoreProvider::File => load_local_file_store_value(key).await,
        StoreProvider::Redis => load_redis_store_value(key).await,
    }
}

async fn load_local_file_store_value(key: &str) -> Result<Option<Value>, std::io::Error> {
    let dir = env::var("SOBAG_FILE_STORE_DIR").unwrap_or_else(|_| ".sobag-store".to_string());
    let path = file_store_path_for_key(dir, key);
    let text = match tokio::fs::read_to_string(path).await {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    let record: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
    Ok(file_store_unwrap_value(&record, Utc::now().timestamp()))
}

pub(crate) async fn save_store_value(key: &str, value: &Value) -> Result<(), std::io::Error> {
    match store_provider() {
        StoreProvider::File => save_local_file_store_value(key, value).await,
        StoreProvider::Redis => save_redis_store_value(key, value, None).await,
    }
}

async fn save_local_file_store_value(key: &str, value: &Value) -> Result<(), std::io::Error> {
    let dir = env::var("SOBAG_FILE_STORE_DIR").unwrap_or_else(|_| ".sobag-store".to_string());
    tokio::fs::create_dir_all(&dir).await?;
    let path = file_store_path_for_key(dir, key);
    let record = json!({
        "version": 1,
        "expiresAt": "",
        "value": value
    });
    let text = serde_json::to_string_pretty(&record)
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error.to_string()))?;
    tokio::fs::write(path, format!("{text}\n")).await
}

pub(crate) async fn save_store_value_with_ttl(
    key: &str,
    value: &Value,
    ttl_seconds: i64,
) -> Result<(), std::io::Error> {
    match store_provider() {
        StoreProvider::File => save_local_file_store_value_with_ttl(key, value, ttl_seconds).await,
        StoreProvider::Redis => save_redis_store_value(key, value, Some(ttl_seconds.max(0))).await,
    }
}

async fn save_local_file_store_value_with_ttl(
    key: &str,
    value: &Value,
    ttl_seconds: i64,
) -> Result<(), std::io::Error> {
    let dir = env::var("SOBAG_FILE_STORE_DIR").unwrap_or_else(|_| ".sobag-store".to_string());
    tokio::fs::create_dir_all(&dir).await?;
    let path = file_store_path_for_key(dir, key);
    let expires_at = if ttl_seconds > 0 {
        (Utc::now() + chrono::Duration::seconds(ttl_seconds)).to_rfc3339()
    } else {
        String::new()
    };
    let record = json!({
        "version": 1,
        "expiresAt": expires_at,
        "value": value
    });
    let text = serde_json::to_string_pretty(&record)
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error.to_string()))?;
    tokio::fs::write(path, format!("{text}\n")).await
}

pub(crate) async fn delete_store_value(key: &str) -> Result<(), std::io::Error> {
    match store_provider() {
        StoreProvider::File => delete_local_file_store_value(key).await,
        StoreProvider::Redis => {
            redis_request(redis_del_command(key)?).await?;
            Ok(())
        }
    }
}

async fn delete_local_file_store_value(key: &str) -> Result<(), std::io::Error> {
    let dir = env::var("SOBAG_FILE_STORE_DIR").unwrap_or_else(|_| ".sobag-store".to_string());
    let path = file_store_path_for_key(dir, key);
    match tokio::fs::remove_file(path).await {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum StoreProvider {
    File,
    Redis,
}

fn store_provider() -> StoreProvider {
    normalized_store_provider(env::var("SOBAG_STORE_PROVIDER").ok().as_deref())
}

pub(crate) fn normalized_store_provider(value: Option<&str>) -> StoreProvider {
    match value.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "file" | "filesystem" | "fs" => StoreProvider::File,
        _ => StoreProvider::Redis,
    }
}

struct RedisRestConfig {
    url: String,
    token: String,
}

fn redis_rest_config() -> Result<RedisRestConfig, std::io::Error> {
    let url = first_non_empty_value(
        env::var("KV_REST_API_URL").ok().as_deref(),
        env::var("UPSTASH_REDIS_REST_URL").ok().as_deref(),
    )
    .trim_end_matches('/')
    .to_string();
    let token = first_non_empty_value(
        env::var("KV_REST_API_TOKEN").ok().as_deref(),
        env::var("UPSTASH_REDIS_REST_TOKEN").ok().as_deref(),
    );
    if url.is_empty() || token.is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "redis store provider is not configured",
        ));
    }
    Ok(RedisRestConfig { url, token })
}

pub(crate) fn first_non_empty_value(primary: Option<&str>, fallback: Option<&str>) -> String {
    let primary = primary.unwrap_or("").trim();
    if !primary.is_empty() {
        return primary.to_string();
    }
    fallback.unwrap_or("").trim().to_string()
}

async fn load_redis_store_value(key: &str) -> Result<Option<Value>, std::io::Error> {
    let result = redis_request(redis_get_command(key)?).await?;
    Ok(redis_result_to_value(&result))
}

async fn save_redis_store_value(
    key: &str,
    value: &Value,
    ttl_seconds: Option<i64>,
) -> Result<(), std::io::Error> {
    redis_request(redis_set_command(key, value, ttl_seconds)?).await?;
    Ok(())
}

async fn redis_request(command: Value) -> Result<Value, std::io::Error> {
    let config = redis_rest_config()?;
    let response = reqwest::Client::new()
        .post(config.url)
        .bearer_auth(config.token)
        .json(&command)
        .send()
        .await
        .map_err(redis_io_error)?;
    let status = response.status();
    let payload: Value = response.json().await.map_err(redis_io_error)?;
    if !status.is_success() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "redis store request failed",
        ));
    }
    if let Some(error) = payload.get("error").and_then(Value::as_str) {
        if !error.is_empty() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "redis store command failed",
            ));
        }
    }
    Ok(payload.get("result").cloned().unwrap_or(Value::Null))
}

fn redis_io_error(error: reqwest::Error) -> std::io::Error {
    std::io::Error::new(std::io::ErrorKind::Other, error.to_string())
}

pub(crate) fn redis_get_command(key: &str) -> Result<Value, std::io::Error> {
    Ok(json!(["GET", key]))
}

pub(crate) fn redis_set_command(
    key: &str,
    value: &Value,
    ttl_seconds: Option<i64>,
) -> Result<Value, std::io::Error> {
    let encoded = serde_json::to_string(value)
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error.to_string()))?;
    if let Some(ttl) = ttl_seconds.filter(|ttl| *ttl > 0) {
        Ok(json!(["SET", key, encoded, "EX", ttl]))
    } else {
        Ok(json!(["SET", key, encoded]))
    }
}

pub(crate) fn redis_del_command(key: &str) -> Result<Value, std::io::Error> {
    Ok(json!(["DEL", key]))
}

pub(crate) fn redis_result_to_value(result: &Value) -> Option<Value> {
    match result {
        Value::Null => None,
        Value::String(text) => serde_json::from_str(text)
            .ok()
            .or_else(|| Some(Value::String(text.clone()))),
        value => Some(value.clone()),
    }
}

pub(crate) fn file_key_hex(value: &str) -> String {
    value
        .as_bytes()
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<Vec<_>>()
        .join("")
}

pub(crate) fn file_store_path_for_key(dir: impl AsRef<FsPath>, key: &str) -> PathBuf {
    dir.as_ref().join(format!("{}.json", file_key_hex(key)))
}

pub(crate) fn session_store_key(token: &str) -> String {
    format!("sobag:session:{}", token.trim())
}

pub(crate) fn file_store_unwrap_value(record: &Value, now_unix: i64) -> Option<Value> {
    if !record.is_object() || record.get("value").is_none() {
        return Some(record.clone());
    }
    if let Some(expires_at) = record.get("expiresAt").and_then(Value::as_str) {
        if !expires_at.trim().is_empty() {
            let expired = DateTime::parse_from_rfc3339(expires_at)
                .map(|date| date.timestamp() <= now_unix)
                .unwrap_or(false);
            if expired {
                return None;
            }
        }
    }
    Some(record.get("value").cloned().unwrap_or(Value::Null))
}
