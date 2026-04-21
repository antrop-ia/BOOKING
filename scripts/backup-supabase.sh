#!/usr/bin/env bash
# Daily logical backup of the Parrilla 8187 Supabase data via REST API.
#
# Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
# /etc/parrilla-booking/backup.env
#
# Dumps each app table to JSON, the auth.users list via admin API,
# then tars + gzips everything. Keeps the last 30 days.
#
# Limitations of this approach (vs pg_dump):
# - DATA only, no schema / RLS policies / functions
# - To restore: recreate schema via Supabase migrations, then re-insert JSON

set -euo pipefail

ENV_FILE="/etc/parrilla-booking/backup.env"
BACKUP_DIR="/var/backups/parrilla-booking"
RETENTION_DAYS=30
LOG_FILE="/var/log/parrilla-backup.log"

TABLES=(
  "tenants"
  "establishments"
  "business_hours"
  "reservations"
  "slot_blocks"
  "tenant_memberships"
)

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  exit 1
}

[[ -f "$ENV_FILE" ]] || fail "$ENV_FILE not found"
# shellcheck disable=SC1090
source "$ENV_FILE"

[[ -n "${SUPABASE_URL:-}" ]] || fail "SUPABASE_URL not set in $ENV_FILE"
[[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] || fail "SUPABASE_SERVICE_ROLE_KEY not set in $ENV_FILE"

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
WORKDIR=$(mktemp -d -t parrilla-backup-XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

log "Starting backup into $WORKDIR (timestamp=$TIMESTAMP)"

dump_table() {
  local table="$1"
  local out="$WORKDIR/${table}.json"
  local url="${SUPABASE_URL}/rest/v1/${table}?select=*"

  local http_code
  http_code=$(curl -sS -w '%{http_code}' -o "$out" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Accept: application/json" \
    "$url")

  if [[ "$http_code" != "200" ]]; then
    fail "Failed to dump table '$table' (HTTP $http_code). Body: $(head -c 200 "$out")"
  fi

  local rows
  rows=$(python3 -c "import json,sys; print(len(json.load(open('$out'))))" 2>/dev/null || echo "?")
  log "  table $table: $rows rows"
}

dump_auth_users() {
  local out="$WORKDIR/auth_users.json"
  local url="${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000"

  local http_code
  http_code=$(curl -sS -w '%{http_code}' -o "$out" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Accept: application/json" \
    "$url")

  if [[ "$http_code" != "200" ]]; then
    fail "Failed to dump auth.users (HTTP $http_code). Body: $(head -c 200 "$out")"
  fi

  local count
  count=$(python3 -c "import json,sys; print(len(json.load(open('$out')).get('users',[])))" 2>/dev/null || echo "?")
  log "  auth.users: $count users"
}

# Manifest file with metadata about the backup
write_manifest() {
  cat > "$WORKDIR/MANIFEST.txt" <<EOF
Parrilla 8187 — Supabase logical backup
Timestamp UTC: $(date -u -Iseconds)
Source: $SUPABASE_URL
Tables: ${TABLES[*]}
Also: auth.users
Method: REST API via PostgREST + Supabase Auth Admin API
Note: data only. Restore requires recreating schema first.
EOF
}

log "Dumping tables..."
for t in "${TABLES[@]}"; do
  dump_table "$t"
done

log "Dumping auth users..."
dump_auth_users

write_manifest

# Bundle everything
ARCHIVE="$BACKUP_DIR/parrilla-${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$WORKDIR" .
SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "Archive written: $ARCHIVE ($SIZE)"

# Rotation
DELETED=$(find "$BACKUP_DIR" -type f -name 'parrilla-*.tar.gz' -mtime +$RETENTION_DAYS -delete -print | wc -l)
[[ "$DELETED" -gt 0 ]] && log "Rotation: deleted $DELETED archive(s) older than $RETENTION_DAYS days"

REMAINING=$(find "$BACKUP_DIR" -type f -name 'parrilla-*.tar.gz' | wc -l)
log "Done. $REMAINING archive(s) retained."
