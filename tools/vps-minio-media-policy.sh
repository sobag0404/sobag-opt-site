#!/usr/bin/env bash
set -euo pipefail

require_env() {
  name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required object-storage env: $name"
    exit 2
  fi
}

systemd_env_value() {
  key="$1"
  sudo systemctl show minio -p Environment --value 2>/dev/null \
    | tr ' ' '\n' \
    | sed -n "s/^${key}=//p" \
    | head -n 1
}

env_file_value() {
  file="$1"
  key="$2"
  [ -f "$file" ] || return 0
  sudo sed -n -E "s/^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*['\"]?([^'\"]*)['\"]?[[:space:]]*$/\2/p" "$file" 2>/dev/null | head -n 1
}

require_env SOBAG_S3_BUCKET
require_env SOBAG_S3_ACCESS_KEY_ID
require_env SOBAG_S3_SECRET_ACCESS_KEY

endpoint="${SOBAG_S3_LOCAL_ENDPOINT:-http://127.0.0.1:9000}"
env_file="${SOBAG_ENV_FILE:-/opt/sobag-opt/shared/.env}"

if ! command -v mc >/dev/null 2>&1; then
  echo "MinIO client mc is not installed; cannot repair media policy"
  exit 2
fi

if ! curl -fsS "$endpoint/minio/health/live" >/dev/null 2>&1; then
  echo "Local MinIO health check is unavailable; cannot repair media policy"
  exit 2
fi

root_user="${MINIO_ROOT_USER:-}"
root_password="${MINIO_ROOT_PASSWORD:-}"
for env_file in /etc/default/minio /etc/minio/minio.env /etc/sysconfig/minio; do
  if [ -z "$root_user" ]; then
    root_user="$(env_file_value "$env_file" MINIO_ROOT_USER)"
  fi
  if [ -z "$root_password" ]; then
    root_password="$(env_file_value "$env_file" MINIO_ROOT_PASSWORD)"
  fi
done
if [ -z "$root_user" ]; then
  root_user="$(systemd_env_value MINIO_ROOT_USER)"
fi
if [ -z "$root_password" ]; then
  root_password="$(systemd_env_value MINIO_ROOT_PASSWORD)"
fi

if [ -z "$root_user" ] || [ -z "$root_password" ]; then
  echo "MinIO root credentials are not available to deploy user; cannot repair media policy"
  exit 2
fi

set_env_value() {
  file="$1"
  key="$2"
  value="$3"
  tmp="$(mktemp)"
  if [ -f "$file" ]; then
    awk -v key="$key" -v value="$value" '
      BEGIN { replaced = 0 }
      $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
        print key "=" value
        replaced = 1
        next
      }
      { print }
      END {
        if (!replaced) print key "=" value
      }
    ' "$file" > "$tmp"
  else
    printf '%s=%s\n' "$key" "$value" > "$tmp"
  fi
  install -m 600 "$tmp" "$file"
  rm -f "$tmp"
}

policy_name="sobag-media-products-rw"
policy_file="$(mktemp)"
probe_file="$(mktemp)"
cleanup() {
  rm -f "$policy_file" "$probe_file"
}
trap cleanup EXIT

cat > "$policy_file" <<POLICY_JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::${SOBAG_S3_BUCKET}/products/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${SOBAG_S3_BUCKET}"
      ],
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "products/*"
          ]
        }
      }
    }
  ]
}
POLICY_JSON

mc alias set sobag-minio-admin "$endpoint" "$root_user" "$root_password" >/dev/null
if ! mc admin policy create sobag-minio-admin "$policy_name" "$policy_file" >/dev/null 2>&1; then
  mc admin policy add sobag-minio-admin "$policy_name" "$policy_file" >/dev/null 2>&1 || true
fi

if ! mc admin policy attach sobag-minio-admin "$policy_name" --user "$SOBAG_S3_ACCESS_KEY_ID" >/dev/null 2>&1; then
  if mc admin policy set sobag-minio-admin "$policy_name" "user=$SOBAG_S3_ACCESS_KEY_ID" >/dev/null 2>&1; then
    :
  elif mc admin accesskey edit sobag-minio-admin "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
    :
  elif mc admin accesskey edit "sobag-minio-admin/${SOBAG_S3_ACCESS_KEY_ID}" --policy "$policy_file" >/dev/null 2>&1; then
    :
  elif mc admin user svcacct edit sobag-minio-admin "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
    :
  else
    media_user="sobagmedia$(date -u +%m%d%H%M%S)"
    media_secret="$(openssl rand -hex 32)"
    if mc admin user add sobag-minio-admin "$media_user" "$media_secret" >/dev/null 2>&1; then
      if ! mc admin policy attach sobag-minio-admin "$policy_name" --user "$media_user" >/dev/null 2>&1; then
        if ! mc admin policy set sobag-minio-admin "$policy_name" "user=$media_user" >/dev/null 2>&1; then
          echo "Could not attach scoped media policy to dedicated MinIO media user"
          exit 2
        fi
      fi
    elif mc admin accesskey create "sobag-minio-admin/${root_user}" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
      :
    elif mc admin accesskey create sobag-minio-admin --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
      :
    elif mc admin user svcacct add sobag-minio-admin "$root_user" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
      :
    else
      echo "Could not create dedicated MinIO media credential"
      exit 2
    fi
    SOBAG_S3_ACCESS_KEY_ID="$media_user"
    SOBAG_S3_SECRET_ACCESS_KEY="$media_secret"
    export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    set_env_value "$env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
    set_env_value "$env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
  fi
fi

set_env_value "$env_file" SOBAG_S3_ENDPOINT "$endpoint"
set_env_value "$env_file" SOBAG_S3_REGION "${SOBAG_S3_LOCAL_REGION:-us-east-1}"
set_env_value "$env_file" SOBAG_S3_FORCE_PATH_STYLE "true"

mc alias set sobag-minio-app "$endpoint" "$SOBAG_S3_ACCESS_KEY_ID" "$SOBAG_S3_SECRET_ACCESS_KEY" >/dev/null
printf '%s\n' "sobag media policy smoke" > "$probe_file"
probe_key="products/.cutover-policy-smoke/$(date -u +%Y%m%dT%H%M%SZ)-$$.txt"
if ! mc cp "$probe_file" "sobag-minio-app/${SOBAG_S3_BUCKET}/${probe_key}" >/dev/null 2>&1; then
  echo "Scoped media policy verification upload failed"
  exit 2
fi
mc rm "sobag-minio-app/${SOBAG_S3_BUCKET}/${probe_key}" >/dev/null 2>&1 || true
echo "MinIO scoped media policy verified for products/*"
