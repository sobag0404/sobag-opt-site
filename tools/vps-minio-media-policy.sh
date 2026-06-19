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
  { sudo systemctl show minio -p Environment --value 2>/dev/null || true; } \
    | tr ' ' '\n' \
    | sed -n "s/^${key}=//p" \
    | head -n 1
}

systemd_env_files() {
  { sudo systemctl show minio -p EnvironmentFiles --value 2>/dev/null || true; } \
    | tr ' ' '\n' \
    | sed -n -E 's#^(/[^[:space:]]+).*$#\1#p'
}

minio_process_env_value() {
  key="$1"
  pids="$(sudo pgrep -f '(^|/|[[:space:]])minio([[:space:]]|$)' 2>/dev/null || true)"
  printf '%s\n' "$pids" \
    | while IFS= read -r pid; do
        [ -n "$pid" ] || continue
        { sudo tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null || true; } \
          | sed -n "s/^${key}=//p" \
          | head -n 1
      done \
    | sed -n '1p'
}

minio_container_ids() {
  runtime="$1"
  { sudo "$runtime" ps --format '{{.ID}} {{.Names}} {{.Image}} {{.Command}}' 2>/dev/null || true; } \
    | awk 'tolower($0) ~ /minio/ { print $1 }'
}

container_env_value() {
  key="$1"
  for runtime in docker podman; do
    command -v "$runtime" >/dev/null 2>&1 || continue
    { minio_container_ids "$runtime" || true; } \
      | while IFS= read -r container_id; do
          [ -n "$container_id" ] || continue
          { sudo "$runtime" inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container_id" 2>/dev/null || true; } \
            | sed -n "s/^${key}=//p" \
            | head -n 1
        done \
      | sed -n '1p'
  done | sed -n '1p'
}

container_secret_file_value() {
  path="$1"
  [ -n "$path" ] || return 0
  for runtime in docker podman; do
    command -v "$runtime" >/dev/null 2>&1 || continue
    { minio_container_ids "$runtime" || true; } \
      | while IFS= read -r container_id; do
          [ -n "$container_id" ] || continue
          sudo "$runtime" exec "$container_id" sh -c 'file="$1"; [ -f "$file" ] && sed -n "1{s/[[:space:]]*$//;p;q;}" "$file" || true' sh "$path" 2>/dev/null || true
        done \
      | sed -n '1p'
  done | sed -n '1p'
}

container_compose_env_files() {
  for runtime in docker podman; do
    command -v "$runtime" >/dev/null 2>&1 || continue
    { minio_container_ids "$runtime" || true; } \
      | while IFS= read -r container_id; do
          [ -n "$container_id" ] || continue
          working_dir="$(sudo "$runtime" inspect --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' "$container_id" 2>/dev/null || true)"
          config_files="$(sudo "$runtime" inspect --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$container_id" 2>/dev/null || true)"
          [ -n "$working_dir" ] && [ "$working_dir" != "<no value>" ] && printf '%s/.env\n' "$working_dir"
          printf '%s\n' "$config_files" | tr ',' '\n' | while IFS= read -r config_file; do
            [ -n "$config_file" ] || continue
            [ "$config_file" = "<no value>" ] && continue
            config_dir="$(dirname "$config_file")"
            printf '%s/.env\n' "$config_dir"
            { sudo sed -n -E 's/^[[:space:]]*-[[:space:]]*([^#[:space:]]+).*$/\1/p; s/^[[:space:]]*env_file:[[:space:]]*([^#[:space:]]+).*$/\1/p' "$config_file" 2>/dev/null || true; } \
              | sed -E 's/^["'\'']?([^"'\'']+)["'\'']?$/\1/' \
              | while IFS= read -r env_file; do
                [ -n "$env_file" ] || continue
                case "$env_file" in
                  /*) printf '%s\n' "$env_file" ;;
                  *) printf '%s/%s\n' "$config_dir" "$env_file" ;;
                esac
              done
          done
        done
  done | awk 'NF && !seen[$0]++'
}

env_file_value() {
  file="$1"
  key="$2"
  [ -f "$file" ] || return 0
  { sudo sed -n -E "s/^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*['\"]?([^'\"]*)['\"]?[[:space:]]*$/\2/p" "$file" 2>/dev/null || true; } | head -n 1
}

secret_file_value() {
  file="$1"
  [ -n "$file" ] || return 0
  [ -f "$file" ] || return 0
  { sudo sed -n '1{s/[[:space:]]*$//;p;q;}' "$file" 2>/dev/null || true; }
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
root_source="process-env"
minio_env_candidates="/etc/default/minio /etc/minio/minio.env /etc/minio/env /etc/sysconfig/minio $(systemd_env_files || true) $(container_compose_env_files || true)"
checked_minio_env_files=""
for minio_env_file in $minio_env_candidates; do
  [ -n "$minio_env_file" ] || continue
  case " $checked_minio_env_files " in
    *" $minio_env_file "*) continue ;;
  esac
  checked_minio_env_files="$checked_minio_env_files $minio_env_file"
  if [ -z "$root_user" ]; then
    root_user="$(env_file_value "$minio_env_file" MINIO_ROOT_USER)"
    [ -n "$root_user" ] && root_source="env-file"
  fi
  if [ -z "$root_password" ]; then
    root_password="$(env_file_value "$minio_env_file" MINIO_ROOT_PASSWORD)"
    [ -n "$root_password" ] && root_source="env-file"
  fi
  if [ -z "$root_user_file" ]; then
    root_user_file="$(env_file_value "$minio_env_file" MINIO_ROOT_USER_FILE)"
  fi
  if [ -z "$root_password_file" ]; then
    root_password_file="$(env_file_value "$minio_env_file" MINIO_ROOT_PASSWORD_FILE)"
  fi
  if [ -z "$root_user" ]; then
    root_user="$(env_file_value "$minio_env_file" MINIO_ACCESS_KEY)"
    [ -n "$root_user" ] && root_source="legacy-env-file"
  fi
  if [ -z "$root_password" ]; then
    root_password="$(env_file_value "$minio_env_file" MINIO_SECRET_KEY)"
    [ -n "$root_password" ] && root_source="legacy-env-file"
  fi
done
if [ -z "$root_user" ] && [ -n "$root_user_file" ]; then
  root_user="$(secret_file_value "$root_user_file")"
  [ -n "$root_user" ] && root_source="host-secret-file"
fi
if [ -z "$root_password" ] && [ -n "$root_password_file" ]; then
  root_password="$(secret_file_value "$root_password_file")"
  [ -n "$root_password" ] && root_source="host-secret-file"
fi
if [ -z "$root_user" ]; then
  root_user="$(systemd_env_value MINIO_ROOT_USER)"
  [ -n "$root_user" ] && root_source="systemd-env"
fi
if [ -z "$root_password" ]; then
  root_password="$(systemd_env_value MINIO_ROOT_PASSWORD)"
  [ -n "$root_password" ] && root_source="systemd-env"
fi
if [ -z "$root_user_file" ]; then
  root_user_file="$(systemd_env_value MINIO_ROOT_USER_FILE)"
fi
if [ -z "$root_password_file" ]; then
  root_password_file="$(systemd_env_value MINIO_ROOT_PASSWORD_FILE)"
fi
if [ -z "$root_user" ]; then
  root_user="$(minio_process_env_value MINIO_ROOT_USER)"
  [ -n "$root_user" ] && root_source="minio-process-env"
fi
if [ -z "$root_password" ]; then
  root_password="$(minio_process_env_value MINIO_ROOT_PASSWORD)"
  [ -n "$root_password" ] && root_source="minio-process-env"
fi
if [ -z "$root_user_file" ]; then
  root_user_file="$(minio_process_env_value MINIO_ROOT_USER_FILE)"
fi
if [ -z "$root_password_file" ]; then
  root_password_file="$(minio_process_env_value MINIO_ROOT_PASSWORD_FILE)"
fi
if [ -z "$root_user" ]; then
  root_user="$(container_env_value MINIO_ROOT_USER)"
  [ -n "$root_user" ] && root_source="container-env"
fi
if [ -z "$root_password" ]; then
  root_password="$(container_env_value MINIO_ROOT_PASSWORD)"
  [ -n "$root_password" ] && root_source="container-env"
fi
if [ -z "$root_user_file" ]; then
  root_user_file="$(container_env_value MINIO_ROOT_USER_FILE)"
fi
if [ -z "$root_password_file" ]; then
  root_password_file="$(container_env_value MINIO_ROOT_PASSWORD_FILE)"
fi
if [ -z "$root_user" ]; then
  root_user="$(container_env_value MINIO_ACCESS_KEY)"
  [ -n "$root_user" ] && root_source="legacy-container-env"
fi
if [ -z "$root_password" ]; then
  root_password="$(container_env_value MINIO_SECRET_KEY)"
  [ -n "$root_password" ] && root_source="legacy-container-env"
fi
if [ -z "$root_user" ] && [ -n "$root_user_file" ]; then
  root_user="$(secret_file_value "$root_user_file")"
  [ -z "$root_user" ] && root_user="$(container_secret_file_value "$root_user_file")"
  [ -n "$root_user" ] && root_source="secret-file"
fi
if [ -z "$root_password" ] && [ -n "$root_password_file" ]; then
  root_password="$(secret_file_value "$root_password_file")"
  [ -z "$root_password" ] && root_password="$(container_secret_file_value "$root_password_file")"
  [ -n "$root_password" ] && root_source="secret-file"
fi

if [ -z "$root_user" ] || [ -z "$root_password" ]; then
  echo "MinIO root credentials are not available to deploy user; cannot repair media policy"
  exit 2
fi
echo "MinIO root credential source: $root_source"

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

minio_execstart_tokens() {
  { sudo systemctl show minio -p ExecStart --value 2>/dev/null || true; } \
    | tr ' ' '\n'
}

minio_volume_candidates() {
  {
    printf '%s\n' "$(systemd_env_value MINIO_VOLUMES)"
    printf '%s\n' "$(minio_process_env_value MINIO_VOLUMES)"
    printf '%s\n' "$(container_env_value MINIO_VOLUMES)"
    for minio_env_file in $minio_env_candidates; do
      env_file_value "$minio_env_file" MINIO_VOLUMES
    done
    minio_execstart_tokens
    printf '%s\n' "/var/lib/minio"
  } \
    | tr ' ,"'"'"'\t' '\n' \
    | sed -E 's/[;,]+$//' \
    | awk '
        /^$/ { next }
        /^--/ { next }
        /^https?:/ { next }
        /^\// { print }
      ' \
    | awk 'NF && !seen[$0]++'
}

is_safe_minio_data_path() {
  path="$1"
  case "$path" in
    "/"|"/etc"|"/home"|"/root"|"/opt"|"/var"|"/var/lib"|"/srv"|"/mnt"|"/data") return 1 ;;
    "/var/lib/minio"|"/var/lib/minio/"*) return 0 ;;
    "/srv/minio"|"/srv/minio/"*) return 0 ;;
    "/data/minio"|"/data/minio/"*) return 0 ;;
    "/mnt/minio"|"/mnt/minio/"*) return 0 ;;
    "/mnt/data/minio"|"/mnt/data/minio/"*) return 0 ;;
    "/opt/"*"minio"*) return 0 ;;
    "/opt/sobag-opt/"*) case "$path" in *"minio"*|*"object-storage"*|*"s3"*) return 0 ;; esac ;;
  esac
  return 1
}

repair_minio_data_ownership_if_safe() {
  owner="${SOBAG_MINIO_DATA_OWNER:-minio-user:minio-user}"
  owner_user="${owner%%:*}"
  if ! getent passwd "$owner_user" >/dev/null 2>&1; then
    echo "MinIO data ownership repair skipped: owner-user-missing"
    return 1
  fi

  repaired=1
  checked_paths=""
  for candidate_path in $(minio_volume_candidates); do
    [ -n "$candidate_path" ] || continue
    case " $checked_paths " in
      *" $candidate_path "*) continue ;;
    esac
    checked_paths="$checked_paths $candidate_path"
    if ! is_safe_minio_data_path "$candidate_path"; then
      echo "MinIO data ownership candidate skipped: unsafe-path"
      continue
    fi
    [ -d "$candidate_path" ] || continue

    current_owner="$(sudo stat -c '%U:%G' "$candidate_path" 2>/dev/null || true)"
    if [ "$current_owner" = "$owner" ]; then
      echo "MinIO data ownership already safe"
      repaired=0
      continue
    fi
    if sudo chown -R "$owner" "$candidate_path" >/dev/null 2>&1; then
      echo "MinIO data ownership repaired: safe-path"
      repaired=0
    else
      echo "MinIO data ownership repair failed: chown-denied"
    fi
  done
  return "$repaired"
}

policy_name="sobag-media-products-rw-$(date -u +%m%d%H%M%S)"
policy_file="$(mktemp)"
probe_file="$(mktemp)"
verify_log="$(mktemp)"
cleanup() {
  rm -f "$policy_file" "$probe_file" "$verify_log"
}
trap cleanup EXIT
admin_alias="sobag-minio-admin"

configure_discovered_admin_alias() {
  discovered_alias="sobag-minio-admin-discovered"
  if mc alias set "$discovered_alias" "$endpoint" "$root_user" "$root_password" >/dev/null 2>&1 \
    && mc admin info "$discovered_alias" >/dev/null 2>&1; then
    admin_alias="$discovered_alias"
    echo "MinIO admin alias source: discovered-credentials"
    return 0
  fi
  return 1
}

configure_default_admin_alias() {
  if mc alias set "$admin_alias" "$endpoint" "$root_user" "$root_password" >/dev/null 2>&1; then
    echo "MinIO admin alias source: discovered-credentials"
    return 0
  fi
  return 1
}

find_existing_admin_alias() {
  for alias_name in sobag-minio-root minio local myminio minio-local; do
    if mc admin info "$alias_name" >/dev/null 2>&1; then
      admin_alias="$alias_name"
      echo "MinIO admin alias source: existing"
      return 0
    fi
  done
  return 1
}

existing_admin_aliases() {
  {
    printf '%s\n' sobag-minio-root minio local myminio minio-local
    mc alias list 2>/dev/null \
      | awk '
          /^[[:alnum:]_.-]+[[:space:]]/ { print $1 }
          /^[[:alnum:]_.-]+[[:space:]]*:/ { sub(/:.*/, "", $1); print $1 }
        ' \
      | sed -E 's/[^[:alnum:]_.-].*$//'
  } | awk 'NF && !seen[$0]++'
}

cat > "$policy_file" <<POLICY_JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::${SOBAG_S3_BUCKET}/products/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": [
        "arn:aws:s3:::${SOBAG_S3_BUCKET}"
      ]
    }
  ]
}
POLICY_JSON

configure_discovered_admin_alias || find_existing_admin_alias || configure_default_admin_alias
if ! mc admin info "$admin_alias" >/dev/null 2>&1; then
  echo "MinIO root admin login failed; cannot repair media policy"
  exit 2
fi
ensure_policy() {
  target_alias="$1"
  if mc admin policy create "$target_alias" "$policy_name" "$policy_file" >/dev/null 2>&1; then
    echo "MinIO media policy command: create"
    return 0
  fi
  if mc admin policy add "$target_alias" "$policy_name" "$policy_file" >/dev/null 2>&1; then
    echo "MinIO media policy command: add"
    return 0
  fi
  echo "MinIO media policy create unavailable"
  return 1
}

attach_policy_to_user() {
  target_alias="$1"
  target_user="$2"
  label="$3"
  if mc admin policy attach "$target_alias" "$policy_name" --user "$target_user" >/dev/null 2>&1; then
    echo "MinIO policy attached to $label"
    return 0
  fi
  if mc admin policy attach "$target_alias" "$policy_name" --user="$target_user" >/dev/null 2>&1; then
    echo "MinIO policy attached to $label"
    return 0
  fi
  if mc admin policy set "$target_alias" "$policy_name" "user=$target_user" >/dev/null 2>&1; then
    echo "MinIO policy set on $label"
    return 0
  fi
  return 1
}

attach_named_policy_to_user() {
  target_alias="$1"
  target_policy="$2"
  target_user="$3"
  label="$4"
  if mc admin policy attach "$target_alias" "$target_policy" --user "$target_user" >/dev/null 2>&1; then
    echo "MinIO named policy attached to $label"
    return 0
  fi
  if mc admin policy attach "$target_alias" "$target_policy" --user="$target_user" >/dev/null 2>&1; then
    echo "MinIO named policy attached to $label"
    return 0
  fi
  if mc admin policy set "$target_alias" "$target_policy" "user=$target_user" >/dev/null 2>&1; then
    echo "MinIO named policy set on $label"
    return 0
  fi
  return 1
}

enable_user_if_supported() {
  target_alias="$1"
  target_user="$2"
  label="$3"
  if mc admin user enable "$target_alias" "$target_user" >/dev/null 2>&1; then
    echo "MinIO user enabled: $label"
    return 0
  fi
  echo "MinIO user enable unavailable: $label"
  return 1
}

alias_targets_endpoint() {
  target_alias="$1"
  mc alias list "$target_alias" 2>/dev/null | grep -F "$endpoint" >/dev/null 2>&1
}

ensure_policy "$admin_alias" || true

# 1x1 WebP probe, matching the media smoke object class closely without storing
# customer data.
printf '%s' "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA" | base64 -d > "$probe_file" 2>/dev/null \
  || printf '%s\n' "sobag media policy smoke" > "$probe_file"
probe_product_key="${SOBAG_MEDIA_POLICY_PROBE_PRODUCT_KEY:-opt_70190}"
probe_product_key="$(printf '%s' "$probe_product_key" | tr -c 'A-Za-z0-9_.-' '_')"
[ -n "$probe_product_key" ] || probe_product_key="opt_70190"
probe_key="products/${probe_product_key}/cutover-policy-smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$.webp"
echo "MinIO media policy probe prefix: products/${probe_product_key}"

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

verify_app_write_with_retry() {
  attempt=1
  while [ "$attempt" -le 6 ]; do
    if verify_app_write; then
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  return 1
}

original_app_access_key_id="$SOBAG_S3_ACCESS_KEY_ID"
original_app_secret_access_key="$SOBAG_S3_SECRET_ACCESS_KEY"

if verify_app_write_with_retry; then
  set_env_value "$app_env_file" SOBAG_S3_ENDPOINT "$endpoint"
  set_env_value "$app_env_file" SOBAG_S3_REGION "${SOBAG_S3_LOCAL_REGION:-us-east-1}"
  set_env_value "$app_env_file" SOBAG_S3_FORCE_PATH_STYLE "true"
  echo "MinIO scoped media policy verified for products/*"
  exit 0
fi

if [ "$(safe_verify_error_class)" = "access-denied" ]; then
  echo "MinIO media write access denied; attempting safe data ownership repair"
  if repair_minio_data_ownership_if_safe && verify_app_write_with_retry; then
    set_env_value "$app_env_file" SOBAG_S3_ENDPOINT "$endpoint"
    set_env_value "$app_env_file" SOBAG_S3_REGION "${SOBAG_S3_LOCAL_REGION:-us-east-1}"
    set_env_value "$app_env_file" SOBAG_S3_FORCE_PATH_STYLE "true"
    echo "MinIO scoped media policy verified for products/* after data ownership repair"
    exit 0
  fi
fi

if grep -Eiq "quota|507|disk full|no space|XMinioStorageFull" "$verify_log"; then
  echo "MinIO media write hit storage quota/disk; attempting scoped smoke cleanup and bucket quota clear"
  mc rm --incomplete --recursive --force "${admin_alias}/${SOBAG_S3_BUCKET}/products/" >/dev/null 2>&1 || true
  mc rm --recursive --force "${admin_alias}/${SOBAG_S3_BUCKET}/products/opt_policy_smoke/" >/dev/null 2>&1 || true
  mc quota clear "${admin_alias}/${SOBAG_S3_BUCKET}" >/dev/null 2>&1 || true
  if verify_app_write_with_retry; then
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
if ! attach_policy_to_user "$admin_alias" "$SOBAG_S3_ACCESS_KEY_ID" "existing access key as user"; then
  echo "Existing access key is not a direct MinIO user"
fi
if mc admin accesskey edit "$admin_alias" "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
  echo "MinIO access key policy edited"
elif mc admin accesskey edit "${admin_alias}/${SOBAG_S3_ACCESS_KEY_ID}" --policy "$policy_file" >/dev/null 2>&1; then
  echo "MinIO nested access key policy edited"
elif mc admin user svcacct edit "$admin_alias" "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
  echo "MinIO service account policy edited"
else
  echo "Existing access key policy edit unavailable"
fi

if verify_app_write_with_retry; then
  echo "MinIO scoped media policy verified for products/*"
  exit 0
fi

media_user="sobagmedia$(date -u +%m%d%H%M%S)"
media_secret="$(openssl rand -hex 32)"
media_credential_created=0
if mc admin user add "$admin_alias" "$media_user" "$media_secret" >/dev/null 2>&1; then
  enable_user_if_supported "$admin_alias" "$media_user" "dedicated media user" || true
  if ! attach_policy_to_user "$admin_alias" "$media_user" "dedicated MinIO media user"; then
    echo "Could not attach scoped media policy to dedicated MinIO media user"
    exit 2
  fi
  echo "Dedicated MinIO media user created"
  media_credential_created=1
elif mc admin accesskey create "${admin_alias}/" "$root_user" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media access key created under root user"
  media_credential_created=1
elif mc admin accesskey create "${admin_alias}/${root_user}" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media access key created under root user"
  media_credential_created=1
elif mc admin accesskey create "${admin_alias}/" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media access key created"
  media_credential_created=1
elif mc admin accesskey create "$admin_alias" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media access key created"
  media_credential_created=1
elif mc admin user svcacct add "$admin_alias" "$root_user" --access-key "$media_user" --secret-key "$media_secret" --policy "$policy_file" >/dev/null 2>&1; then
  echo "Dedicated MinIO media service account created"
  media_credential_created=1
else
  echo "Dedicated MinIO media credential creation unavailable"
fi

if [ "$media_credential_created" = "1" ]; then
  SOBAG_S3_ACCESS_KEY_ID="$media_user"
  SOBAG_S3_SECRET_ACCESS_KEY="$media_secret"
  export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
  if verify_app_write_with_retry; then
    set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
    set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
    echo "MinIO scoped media policy verified with dedicated media credential"
    exit 0
  fi
  media_service_user="${media_user}sa"
  media_service_secret="$(openssl rand -hex 32)"
  if mc admin accesskey create "${admin_alias}/" "$media_user" --access-key "$media_service_user" --secret-key "$media_service_secret" --policy "$policy_file" >/dev/null 2>&1; then
    echo "Dedicated MinIO media service account created under media user"
    SOBAG_S3_ACCESS_KEY_ID="$media_service_user"
    SOBAG_S3_SECRET_ACCESS_KEY="$media_service_secret"
    export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    if verify_app_write_with_retry; then
      set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
      set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
      echo "MinIO scoped media policy verified with media service account"
      exit 0
    fi
  elif mc admin user svcacct add "$admin_alias" "$media_user" --access-key "$media_service_user" --secret-key "$media_service_secret" --policy "$policy_file" >/dev/null 2>&1; then
    echo "Dedicated MinIO media service account created under media user"
    SOBAG_S3_ACCESS_KEY_ID="$media_service_user"
    SOBAG_S3_SECRET_ACCESS_KEY="$media_service_secret"
    export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    if verify_app_write_with_retry; then
      set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
      set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
      echo "MinIO scoped media policy verified with media service account"
      exit 0
    fi
  else
    echo "Dedicated MinIO media service account creation unavailable"
  fi
fi

echo "MinIO admin alias direct write policy repair attempt"
if ! attach_policy_to_user "$admin_alias" "$root_user" "discovered admin user"; then
  echo "MinIO discovered admin user policy attach unavailable"
fi
if attach_named_policy_to_user "$admin_alias" "readwrite" "$root_user" "discovered admin user bootstrap"; then
  bootstrap_service_user="sobagmediaboot$(date -u +%m%d%H%M%S)"
  bootstrap_service_secret="$(openssl rand -hex 32)"
  if mc admin accesskey create "${admin_alias}/" "$root_user" --access-key "$bootstrap_service_user" --secret-key "$bootstrap_service_secret" --policy "$policy_file" >/dev/null 2>&1 \
    || mc admin user svcacct add "$admin_alias" "$root_user" --access-key "$bootstrap_service_user" --secret-key "$bootstrap_service_secret" --policy "$policy_file" >/dev/null 2>&1; then
    echo "MinIO scoped media service account created after admin bootstrap"
    SOBAG_S3_ACCESS_KEY_ID="$bootstrap_service_user"
    SOBAG_S3_SECRET_ACCESS_KEY="$bootstrap_service_secret"
    export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    if verify_app_write_with_retry; then
      set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
      set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
      echo "MinIO scoped media policy verified with bootstrap service account"
      exit 0
    fi
  else
    echo "MinIO bootstrap service account creation unavailable"
  fi
else
  echo "MinIO named readwrite bootstrap unavailable"
fi

if mc cp "$probe_file" "${admin_alias}/${SOBAG_S3_BUCKET}/${probe_key}" >/dev/null 2>"$verify_log"; then
  mc rm "${admin_alias}/${SOBAG_S3_BUCKET}/${probe_key}" >/dev/null 2>&1 || true
  SOBAG_S3_ACCESS_KEY_ID="$root_user"
  SOBAG_S3_SECRET_ACCESS_KEY="$root_password"
  export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
  set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
  set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
  echo "MinIO media write verified with admin alias direct fallback"
  exit 0
fi
echo "MinIO admin alias direct write unavailable; class=$(safe_verify_error_class)"

attempt_alias_policy_repair() {
  candidate_alias="$1"
  source_label="$2"
  [ -n "$candidate_alias" ] || return 1
  if [ "$candidate_alias" = "$admin_alias" ]; then
    return 1
  fi
  if ! mc admin info "$candidate_alias" >/dev/null 2>&1; then
    return 1
  fi
  if ! alias_targets_endpoint "$candidate_alias"; then
    echo "MinIO admin alias fallback skipped: endpoint-mismatch"
    return 1
  fi
  echo "MinIO admin alias fallback source: $source_label"
  ensure_policy "$candidate_alias" || true

  if ! attach_policy_to_user "$candidate_alias" "$SOBAG_S3_ACCESS_KEY_ID" "fallback existing access key as user"; then
    echo "MinIO fallback existing access key direct-user attach unavailable"
  fi
  if mc admin accesskey edit "$candidate_alias" "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
    echo "MinIO fallback access key policy edited"
  elif mc admin accesskey edit "${candidate_alias}/${SOBAG_S3_ACCESS_KEY_ID}" --policy "$policy_file" >/dev/null 2>&1; then
    echo "MinIO fallback nested access key policy edited"
  elif mc admin user svcacct edit "$candidate_alias" "$SOBAG_S3_ACCESS_KEY_ID" --policy "$policy_file" >/dev/null 2>&1; then
    echo "MinIO fallback service account policy edited"
  else
    echo "MinIO fallback existing access key policy edit unavailable"
  fi
  if verify_app_write_with_retry; then
    echo "MinIO scoped media policy verified via fallback admin alias"
    exit 0
  fi

  fallback_media_user="sobagmedia$(date -u +%m%d%H%M%S)fb"
  fallback_media_secret="$(openssl rand -hex 32)"
  fallback_media_credential_created=0
  if mc admin user add "$candidate_alias" "$fallback_media_user" "$fallback_media_secret" >/dev/null 2>&1; then
    enable_user_if_supported "$candidate_alias" "$fallback_media_user" "fallback dedicated media user" || true
    if attach_policy_to_user "$candidate_alias" "$fallback_media_user" "fallback dedicated media user"; then
      echo "MinIO fallback dedicated media user created"
      fallback_media_credential_created=1
    else
      echo "MinIO fallback dedicated user policy attach unavailable"
    fi
  elif mc admin accesskey create "${candidate_alias}/" --access-key "$fallback_media_user" --secret-key "$fallback_media_secret" --policy "$policy_file" >/dev/null 2>&1; then
    echo "MinIO fallback dedicated media access key created"
    fallback_media_credential_created=1
  elif mc admin accesskey create "$candidate_alias" --access-key "$fallback_media_user" --secret-key "$fallback_media_secret" --policy "$policy_file" >/dev/null 2>&1; then
    echo "MinIO fallback dedicated media access key created"
    fallback_media_credential_created=1
  else
    echo "MinIO fallback dedicated credential creation unavailable"
  fi
  if [ "$fallback_media_credential_created" = "1" ]; then
    previous_key="$SOBAG_S3_ACCESS_KEY_ID"
    previous_secret="$SOBAG_S3_SECRET_ACCESS_KEY"
    SOBAG_S3_ACCESS_KEY_ID="$fallback_media_user"
    SOBAG_S3_SECRET_ACCESS_KEY="$fallback_media_secret"
    export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    if verify_app_write_with_retry; then
      set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
      set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
      echo "MinIO scoped media policy verified with fallback dedicated media credential"
      exit 0
    fi
    SOBAG_S3_ACCESS_KEY_ID="$previous_key"
    SOBAG_S3_SECRET_ACCESS_KEY="$previous_secret"
    export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    fallback_service_user="${fallback_media_user}sa"
    fallback_service_secret="$(openssl rand -hex 32)"
    if mc admin accesskey create "${candidate_alias}/" "$fallback_media_user" --access-key "$fallback_service_user" --secret-key "$fallback_service_secret" --policy "$policy_file" >/dev/null 2>&1 \
      || mc admin user svcacct add "$candidate_alias" "$fallback_media_user" --access-key "$fallback_service_user" --secret-key "$fallback_service_secret" --policy "$policy_file" >/dev/null 2>&1; then
      echo "MinIO fallback dedicated media service account created"
      SOBAG_S3_ACCESS_KEY_ID="$fallback_service_user"
      SOBAG_S3_SECRET_ACCESS_KEY="$fallback_service_secret"
      export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
      if verify_app_write_with_retry; then
        set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
        set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
        echo "MinIO scoped media policy verified with fallback media service account"
        exit 0
      fi
      SOBAG_S3_ACCESS_KEY_ID="$previous_key"
      SOBAG_S3_SECRET_ACCESS_KEY="$previous_secret"
      export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
    else
      echo "MinIO fallback dedicated media service account creation unavailable"
    fi
  fi
  return 1
}

SOBAG_S3_ACCESS_KEY_ID="$root_user"
SOBAG_S3_SECRET_ACCESS_KEY="$root_password"
export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
if verify_app_write; then
  set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
  set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
  echo "MinIO media write verified with server root credential fallback"
  exit 0
fi
echo "MinIO server root credential fallback unavailable; class=$(safe_verify_error_class)"

try_root_write_pair() {
  source_label="$1"
  candidate_user="$2"
  candidate_secret="$3"
  [ -n "$candidate_user" ] || return 1
  [ -n "$candidate_secret" ] || return 1
  if ! mc alias set sobag-minio-alt-root "$endpoint" "$candidate_user" "$candidate_secret" >/dev/null 2>&1; then
    return 1
  fi
  if ! mc admin info sobag-minio-alt-root >/dev/null 2>&1; then
    return 1
  fi
  previous_key="$SOBAG_S3_ACCESS_KEY_ID"
  previous_secret="$SOBAG_S3_SECRET_ACCESS_KEY"
  SOBAG_S3_ACCESS_KEY_ID="$candidate_user"
  SOBAG_S3_SECRET_ACCESS_KEY="$candidate_secret"
  export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
  if verify_app_write; then
    set_env_value "$app_env_file" SOBAG_S3_ACCESS_KEY_ID "$SOBAG_S3_ACCESS_KEY_ID"
    set_env_value "$app_env_file" SOBAG_S3_SECRET_ACCESS_KEY "$SOBAG_S3_SECRET_ACCESS_KEY"
    echo "MinIO media write verified with server credential fallback from $source_label"
    exit 0
  fi
  SOBAG_S3_ACCESS_KEY_ID="$previous_key"
  SOBAG_S3_SECRET_ACCESS_KEY="$previous_secret"
  export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY
  return 1
}

try_env_file_root_pair() {
  candidate_file="$1"
  [ -f "$candidate_file" ] || return 1
  candidate_user="$(env_file_value "$candidate_file" MINIO_ROOT_USER)"
  candidate_secret="$(env_file_value "$candidate_file" MINIO_ROOT_PASSWORD)"
  candidate_user_file="$(env_file_value "$candidate_file" MINIO_ROOT_USER_FILE)"
  candidate_secret_file="$(env_file_value "$candidate_file" MINIO_ROOT_PASSWORD_FILE)"
  [ -z "$candidate_user" ] && [ -n "$candidate_user_file" ] && candidate_user="$(secret_file_value "$candidate_user_file")"
  [ -z "$candidate_secret" ] && [ -n "$candidate_secret_file" ] && candidate_secret="$(secret_file_value "$candidate_secret_file")"
  try_root_write_pair "env-file" "$candidate_user" "$candidate_secret" && return 0
  candidate_user="$(env_file_value "$candidate_file" MINIO_ACCESS_KEY)"
  candidate_secret="$(env_file_value "$candidate_file" MINIO_SECRET_KEY)"
  try_root_write_pair "legacy-env-file" "$candidate_user" "$candidate_secret" && return 0
  return 1
}

try_container_root_pairs() {
  candidate_user="$(container_env_value MINIO_ROOT_USER)"
  candidate_secret="$(container_env_value MINIO_ROOT_PASSWORD)"
  candidate_user_file="$(container_env_value MINIO_ROOT_USER_FILE)"
  candidate_secret_file="$(container_env_value MINIO_ROOT_PASSWORD_FILE)"
  [ -z "$candidate_user" ] && [ -n "$candidate_user_file" ] && candidate_user="$(container_secret_file_value "$candidate_user_file")"
  [ -z "$candidate_secret" ] && [ -n "$candidate_secret_file" ] && candidate_secret="$(container_secret_file_value "$candidate_secret_file")"
  try_root_write_pair "container-env" "$candidate_user" "$candidate_secret" && return 0
  candidate_user="$(container_env_value MINIO_ACCESS_KEY)"
  candidate_secret="$(container_env_value MINIO_SECRET_KEY)"
  try_root_write_pair "legacy-container-env" "$candidate_user" "$candidate_secret" && return 0
  return 1
}

try_all_root_write_candidates() {
  try_root_write_pair "process-env" "${MINIO_ROOT_USER:-}" "${MINIO_ROOT_PASSWORD:-}" && return 0
  try_root_write_pair "minio-process-env" "$(minio_process_env_value MINIO_ROOT_USER)" "$(minio_process_env_value MINIO_ROOT_PASSWORD)" && return 0
  for minio_env_file in $minio_env_candidates; do
    [ -n "$minio_env_file" ] || continue
    try_env_file_root_pair "$minio_env_file" && return 0
  done
  try_root_write_pair "systemd-env" "$(systemd_env_value MINIO_ROOT_USER)" "$(systemd_env_value MINIO_ROOT_PASSWORD)" && return 0
  try_container_root_pairs && return 0
  return 1
}

try_all_root_write_candidates || true

SOBAG_S3_ACCESS_KEY_ID="$original_app_access_key_id"
SOBAG_S3_SECRET_ACCESS_KEY="$original_app_secret_access_key"
export SOBAG_S3_ACCESS_KEY_ID SOBAG_S3_SECRET_ACCESS_KEY

for candidate_alias in $(existing_admin_aliases); do
  attempt_alias_policy_repair "$candidate_alias" "existing" || true
done

echo "Scoped media policy verification upload failed; class=$(safe_verify_error_class)"
exit 2
