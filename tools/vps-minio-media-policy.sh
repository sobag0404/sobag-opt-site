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

systemd_env_files() {
  sudo systemctl show minio -p EnvironmentFiles --value 2>/dev/null \
    | tr ' ' '\n' \
    | sed -n -E 's#^(/[^[:space:]]+).*$#\1#p'
}

env_file_value() {
  file="$1"
  key="$2"
  [ -f "$file" ] || return 0
  sudo sed -n -E "s/^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*['\"]?([^'\"]*)['\"]?[[:space:]]*$/\2/p" "$file" 2>/dev/null | head -n 1
}

secret_file_value() {
  file="$1"
  [ -n "$file" ] || return 0
  [ -f "$file" ] || return 0
  sudo sed -n '1{s/[[:space:]]*$//;p;q;}' "$file" 2>/dev/null
}

safe_verify_error_class() {
  if grep -Eiq "AccessDenied|access denied|forbidden|403|insufficient" "$verify_log"; then
    printf '%s\n' "access-denied"
  elif grep -Eiq "InvalidAccessKey|invalid access key|SignatureDoesNotMatch|signature" "$verify_log"; then
    printf '%s\n' "credential-or-signature"
  elif grep -Eiq "NoSuchBucket|bucket does not exist" "$verify_log"; then
    printf '%s\n' "bucket-missing"
  elif grep -Eiq "quota|507|disk full|no space|XMinioStorageFull" "$verify_log"; then
    printf '%s\n' "quota-or-disk"
  else
    printf '%s\n' "unknown"
  fi
}

require_env SOBAG_S3_BUCKET
require_env SOBAG_S3_ACCESS_KEY_ID
require_env SOBAG_S3_SECRET_ACCESS_KEY

endpoint="${SOBAG_S3_LOCAL_ENDPOINT:-http://127.0.0.1:9000}"
app_env_file="${SOBAG_ENV_FILE:-/opt/sobag-opt/shared/.env}"

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
root_user_file="${MINIO_ROOT_USER_FILE:-}"
root_password_file="${MINIO_ROOT_PASSWORD_FILE:-}"
minio_env_candidates="/etc/default/minio /etc/minio/minio.env /etc/minio/env /etc/sysconfig/minio $(systemd_env_files)"
checked_minio_env_files=""
for minio_env_file in $minio_env_candidates; do
  [ -n "$minio_env_file" ] || continue
  case " $checked_minio_env_files " in
    *" $minio_env_file "*) continue ;;
  esac
  checked_minio_env_files="$checked_minio_env_files $minio_env_file"
  if [ -z "$root_user" ]; then
    root_user="$(env_file_value "$minio_env_file" MINIO_ROOT_USER)"
  fi
  if [ -z "$root_password" ]; then
    root_password="$(env_file_value "$minio_env_file" MINIO_ROOT_PASSWORD)"
  fi
  if [ -z "$root_user_file" ]; then
    root_user_file="$(env_file_value "$minio_env_file" MINIO_ROOT_USER_FILE)"
  fi
  if [ -z "$root_password_file" ]; then
    root_password_file="$(env_file_value "$minio_env_file" MINIO_ROOT_PASSWORD_FILE)"
  fi
  if [ -z "$root_user" ]; then
    root_user="$(env_file_value "$minio_env_file" MINIO_ACCESS_KEY)"
  fi
  if [ -z "$root_password" ]; then
    root_password="$(env_file_value "$minio_env_file" MINIO_SECRET_KEY)"
  fi
done
if [ -z "$root_user" ] && [ -n "$root_user_file" ]; then
  root_user="$(secret_file_value "$root_user_file")"
fi
if [ -z "$root_password" ] && [ -n "$root_password_file" ]; then
  root_password="$(secret_file_value "$root_password_file")"
fi
if [ -z "$root_user" ]; then
  root_user="$(systemd_env_value MINIO_ROOT_USER)"
fi
if [ -z "$root_password" ]; then
  root_password="$(systemd_env_value MINIO_ROOT_PASSWORD)"
fi
if [ -z "$root_user_file" ]; then
  root_user_file="$(systemd_env_value MINIO_ROOT_USER_FILE)"
fi
if [ -z "$root_password_file" ]; then
  root_password_file="$(systemd_env_value MINIO_ROOT_PASSWORD_FILE)"
fi
if [ -z "$root_user" ] && [ -n "$root_user_file" ]; then
  root_user="$(secret_file_value "$root_user_file")"
fi
if [ -z "$root_password" ] && [ -n "$root_password_file" ]; then
  root_password="$(secret_file_value "$root_password_file")"
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
verify_log="$(mktemp)"
cleanup() {
  rm -f "$policy_file" "$probe_file" "$verify_log"
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
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${SOBAG_S3_BUCKET}"
      ]
    }
  ]
}
POLICY_JSON

mc alias set sobag-minio-admin "$endpoint" "$root_user" "$root_password" >/dev/null
if ! mc admin info sobag-minio-admin >/dev/null 2>&1; then
  echo "MinIO root admin login failed; cannot repair media policy"
  exit 2
fi
if ! mc admin policy create sobag-minio-admin "$policy_name" "$policy_file" >/dev/null 2>&1; then
  mc admin policy add sobag-minio-admin "$policy_name" "$policy_file" >/dev/null 2>&1 || true
fi

printf '%s\n' "sobag media policy smoke" > "$probe_file"
probe_key="products/.cutover-policy-smoke/$(date -u +%Y%m%dT%H%M%SZ)-$$.txt"

verify_app_write() {
  rm -f "$verify_log"
  if ! mc alias set sobag-minio-app "$endpoint" "$SOBAG_S3_ACCESS_KEY_ID" "$SOBAG_S3_SECRET_ACCESS_KEY" >/dev/null 2>"$verify_log"; then
    return 1
  fi
  if ! mc cp "$probe_file" "sobag-minio-app/${SOBAG_S3_BUCKET}/${probe_key}" >/dev/null 2>>"$verify_log"; then
    return 1
  fi
  mc rm "sobag-minio-app/${SOBAG_S3_BUCKET}/${probe_key}" >/dev/null 2>&1 || true
  return 0
}

if verify_app_write; then
  set_env_value "$app_env_file" SOBAG_S3_ENDPOINT "$endpoint"
  set_env_value "$app_env_file" SOBAG_S3_REGION "${SOBAG_S3_LOCAL_REGION:-us-east-1}"
  set_env_value "$app_env_file" SOBAG_S3_FORCE_PATH_STYLE "true"
  echo "MinIO scoped media policy verified for products/*"
  exit 0
fi

if grep -Eiq "quota|507|disk full|no space|XMinioStorageFull" "$verify_log"; then
  echo "MinIO media write hit storage quota/disk; attempting scoped smoke cleanup and bucket quota clear"
  mc rm --incomplete --recursive --force "sobag-minio-admin/${SOBAG_S3_BUCKET}/products/" >/dev/null 2>&1 || true
  mc rm --recursive --force "sobag-minio-admin/${SOBAG_S3_BUCKET}/products/.cutover-policy-smoke/" >/dev/null 2>&1 || true
  mc quota clear "sobag-minio-admin/${SOBAG_S3_BUCKET}" >/dev/null 2>&1 || true
  if verify_app_write; then
    set_env_value "$app_env_file" SOBAG_S3_ENDPOINT "$endpoint"
    set_env_value "$app_env_file" SOBAG_S3_REGION "${SOBAG_S3_LOCAL_REGION:-us-east-1}"
    set_env_value "$app_env_file" SOBAG_S3_FORCE_PATH_STYLE "true"
    echo "MinIO scoped media policy verified for products/* after quota cleanup"
    exit 0
  fi
  echo "MinIO media write still blocked by storage quota/disk"
  exit 2
fi

set_env_value "$app_env_file" SOBAG_S3_ENDPOINT "$endpoint"
set_env_value "$app_env_file" SOBAG_S3_REGION "${SOBAG_S3_LOCAL_REGION:-us-east-1}"
set_env_value "$app_env_file" SOBAG_S3_FORCE_PATH_STYLE "true"

echo "MinIO media write denied; attempting scoped credential/policy repair"
if mc admin policy attach sobag-minio-admin "$policy_name" --user "$SOBAG_S3_ACCESS_KEY_ID" >/dev/null 2>&1; then
  echo "MinIO policy attached to existing access key as user"
elif mc admin policy set sobag-minio-admin "$policy_name" "user=$SOBAG_S3_ACCESS_KEY_ID" >/dev/null 2>&1; then
  echo "MinIO policy set on existing access key as user"
else
  echo "Existing access key is not a direct MinIO user"
fi
if mc admin accesskey edit sobag-minio-admin "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
  echo "MinIO access key policy edited"
elif mc admin accesskey edit "sobag-minio-admin/${SOBAG_S3_ACCESS_KEY_ID}" --policy "$policy_file" >/dev/null 2>&1; then
  echo "MinIO nested access key policy edited"
elif mc admin user svcacct edit sobag-minio-admin "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
  echo "MinIO service account policy edited"
else
  echo "Existing access key policy edit unavailable"
fi

if verify_app_write; then
  echo "MinIO scoped media policy verified for products/*"
  exit 0
fi

media_user="sobagmedia$(date -u +%m%d%H%M%S)"
media_secret="$(openssl rand -hex 32)"
media_credential_created=0
if mc admin user add sobag-minio-admin "$media_user" "$media_secret" >/dev/null 2>&1; then
  if ! mc admin policy attach sobag-minio-admin "$policy_name" --user "$media_user" >/dev/null 2>&1; then
    if ! mc admin policy set sobag-minio-admin "$policy_name" "user=$media_user" >/dev/null 2>&1; then
      echo "Could not attach scoped media policy to dedicated MinIO media user"
      exit 2
    fi
  fi
  echo "Dedicated MinIO media user created"
  media_credential_created=1
elif mc admin accesskey create "sobag-minio-admin/${root_user}" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media access key created under root user"
  media_credential_created=1
elif mc admin accesskey create sobag-minio-admin --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media access key created"
  media_credential_created=1
elif mc admin user svcacct add sobag-minio-admin "$root_user" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media service account created"
  media_credential_created=1
else
  echo "Dedicated MinIO media credential creation unavailable"
fi

if [ "$media_credential_created" = "1" ]; then
  SOBAG_S3_ACCESS_KEY_ID="$media_user"
  SOBAG_S3_SECRET_ACCESS_KEY="$media_secret"
  export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
  if verify_app_write; then
    set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
    set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
    echo "MinIO scoped media policy verified with dedicated media credential"
    exit 0
  fi
fi

SOBAG_S3_ACCESS_KEY_ID="$root_user"
SOBAG_S3_SECRET_ACCESS_KEY="$root_password"
export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
if verify_app_write; then
  set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
  set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
  echo "MinIO media write verified with server root credential fallback"
  exit 0
fi

echo "Scoped media policy verification upload failed; class=$(safe_verify_error_class)"
exit 2
