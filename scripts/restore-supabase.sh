#!/usr/bin/env bash
# Restore data from a Parrilla 8187 backup archive into Supabase.
#
# Usage:
#   ./restore-supabase.sh <archive.tar.gz> [--dry-run]
#
# IMPORTANT: this script INSERTS existing rows. Conflicts on primary key
# are handled with ON CONFLICT DO NOTHING (via Prefer: resolution=ignore-duplicates).
# If you need a full wipe-and-restore, truncate tables manually first.
#
# Order of restore respects FK dependencies:
#   tenants → establishments → business_hours, tenant_memberships, slot_blocks
#   then reservations (depends on tenant + establishment)
#
# auth.users is NOT restored automatically — users must be recreated via
# Supabase Auth admin API (see RESTORE_NOTES at the bottom).

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <archive.tar.gz> [--dry-run]" >&2
  exit 1
fi

ARCHIVE="$1"
DRY_RUN=${2:-}
ENV_FILE="/etc/parrilla-booking/backup.env"

[[ -f "$ARCHIVE" ]] || { echo "Archive not found: $ARCHIVE" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "$ENV_FILE not found" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

WORKDIR=$(mktemp -d -t parrilla-restore-XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

tar -xzf "$ARCHIVE" -C "$WORKDIR"
echo "Archive extracted:"
ls -la "$WORKDIR"
echo ""
cat "$WORKDIR/MANIFEST.txt"
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "DRY RUN — no changes made."
  exit 0
fi

read -p "Confirm restore into $SUPABASE_URL? (type YES): " confirm
[[ "$confirm" == "YES" ]] || { echo "Aborted."; exit 1; }

ORDER=(
  "tenants"
  "establishments"
  "business_hours"
  "tenant_memberships"
  "slot_blocks"
  "reservations"
)

for table in "${ORDER[@]}"; do
  file="$WORKDIR/${table}.json"
  [[ -f "$file" ]] || { echo "Skip $table (no file)"; continue; }
  rows=$(python3 -c "import json; print(len(json.load(open('$file'))))")
  echo "Restoring $table ($rows rows)..."

  if [[ "$rows" == "0" ]]; then continue; fi

  http_code=$(curl -sS -w '%{http_code}' -o /tmp/restore-resp.txt \
    -X POST "${SUPABASE_URL}/rest/v1/${table}" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=ignore-duplicates,return=minimal" \
    --data-binary "@$file")

  if [[ "$http_code" != "201" && "$http_code" != "200" && "$http_code" != "204" ]]; then
    echo "FAILED $table (HTTP $http_code):"
    head -c 300 /tmp/restore-resp.txt
    echo ""
    exit 1
  fi
  echo "  OK"
done

echo ""
echo "Restore complete."
echo ""
cat <<'NOTES'
RESTORE_NOTES:
- auth.users was NOT restored. Recreate admin accounts via:
    curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
      -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@...", "password":"...", "email_confirm":true}'
- If the target database does not have the schema yet, recreate via Supabase
  migrations BEFORE running this script.
NOTES
