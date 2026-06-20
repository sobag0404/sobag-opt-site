use chrono::Utc;
use getrandom::getrandom;
use serde_json::{json, Map, Value};

use crate::store::{load_store_value, save_store_value};
use crate::{AppError, AppResult};

const STORE_KEY: &str = "sobag:store:v1";
const MAX_AUDIT_RECORDS: usize = 500;

pub(crate) async fn append_admin_audit(
    record_type: &str,
    action: &str,
    user: &Value,
    details: Value,
) -> AppResult<()> {
    let mut store = load_store_value(STORE_KEY)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?
        .unwrap_or_else(empty_store);
    let record = admin_audit_record(record_type, action, user, details);
    let mut audit = store
        .get("audit")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    audit.insert(0, record);
    audit.truncate(MAX_AUDIT_RECORDS);
    if let Some(map) = store.as_object_mut() {
        map.insert("audit".to_string(), Value::Array(audit));
    }
    save_store_value(STORE_KEY, &store)
        .await
        .map_err(|error| AppError::internal(error.to_string()))
}

pub(crate) fn admin_audit_record(
    record_type: &str,
    action: &str,
    user: &Value,
    details: Value,
) -> Value {
    let mut record = details.as_object().cloned().unwrap_or_else(Map::new);
    record.insert("id".to_string(), Value::String(audit_id()));
    record.insert("type".to_string(), Value::String(record_type.to_string()));
    record.insert("action".to_string(), Value::String(action.to_string()));
    record.insert(
        "actor".to_string(),
        json!({
            "id": text(user.get("id")).or_else(|| text(user.get("email"))).unwrap_or_else(|| "unknown".to_string()),
            "role": text(user.get("role")).unwrap_or_else(|| "unknown".to_string())
        }),
    );
    record.insert(
        "timestamp".to_string(),
        Value::String(Utc::now().to_rfc3339()),
    );
    Value::Object(record)
}

fn empty_store() -> Value {
    json!({
        "users": {},
        "orders": [],
        "carts": {},
        "savedCarts": {},
        "favorites": {},
        "reviews": [],
        "briefs": [],
        "audit": [],
        "version": 1
    })
}

fn audit_id() -> String {
    let mut bytes = [0u8; 3];
    let suffix = if getrandom(&mut bytes).is_ok() {
        hex::encode(bytes)
    } else {
        "000000".to_string()
    };
    format!("AUD-{}-{suffix}", Utc::now().timestamp_millis())
}

fn text(value: Option<&Value>) -> Option<String> {
    match value {
        Some(Value::String(text)) if !text.trim().is_empty() => Some(text.trim().to_string()),
        Some(Value::Number(number)) => Some(number.to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn admin_audit_record_is_compact_and_secret_free() {
        let record = admin_audit_record(
            "catalog_import",
            "apply",
            &json!({ "email": "admin@example.test", "role": "admin", "passwordHash": "secret" }),
            json!({ "entityType": "import_batch", "entityId": "IB-1", "counts": { "created": 1 } }),
        );
        assert_eq!(record["type"], "catalog_import");
        assert_eq!(record["action"], "apply");
        assert_eq!(record["actor"]["id"], "admin@example.test");
        assert!(record.get("passwordHash").is_none());
    }
}
