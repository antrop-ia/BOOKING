#!/usr/bin/env bash
# Daily backup da stack parrilla-evolution (Sprint 9 — pacote B.1).
#
# A Evolution API v2 guarda as sessoes do Baileys (WhatsApp) no Postgres
# interno da stack — perder esse banco = ter que parear tudo de novo via QR.
# Este script:
#   1. pg_dump consistente do banco `evolution` (user `evo`)
#   2. tar.gz do volume `parrilla_evolution_instances` (legado / metadata extra)
#   3. empacota os 2 + manifest em /var/backups/parrilla-evolution/
#   4. rotaciona arquivos com mais de 30 dias
#
# Restore documentado em docs/runbook.md secao 7.

set -euo pipefail

BACKUP_DIR="/var/backups/parrilla-evolution"
RETENTION_DAYS=30
LOG_FILE="/var/log/parrilla-evolution-backup.log"

PG_DB="evolution"
PG_USER="evo"
PG_SERVICE="parrilla-evolution_postgres"
INSTANCES_VOLUME="parrilla_evolution_instances"

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  exit 1
}

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
WORKDIR=$(mktemp -d -t parrilla-evolution-backup-XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

log "Starting Evolution backup (timestamp=$TIMESTAMP)"

# ─────────────────────────────────────────────────────────────────
# 1. pg_dump
# ─────────────────────────────────────────────────────────────────
PG_CONTAINER=$(docker ps --filter "name=${PG_SERVICE}" --format "{{.Names}}" | head -1)
[[ -n "$PG_CONTAINER" ]] || fail "Postgres container nao encontrado (esperado prefixo $PG_SERVICE)"
log "  postgres container: $PG_CONTAINER"

PG_DUMP_FILE="$WORKDIR/evolution.sql"
docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" --clean --if-exists > "$PG_DUMP_FILE"
PG_SIZE=$(du -h "$PG_DUMP_FILE" | cut -f1)
PG_LINES=$(wc -l < "$PG_DUMP_FILE")
log "  pg_dump: $PG_SIZE ($PG_LINES linhas)"

# ─────────────────────────────────────────────────────────────────
# 2. tar.gz do volume instances (sessoes Baileys / metadata)
# ─────────────────────────────────────────────────────────────────
INSTANCES_TAR="$WORKDIR/instances.tar.gz"
docker run --rm \
  -v "${INSTANCES_VOLUME}:/source:ro" \
  -v "$WORKDIR:/backup" \
  alpine \
  tar -czf /backup/instances.tar.gz -C /source . 2>/dev/null
INST_SIZE=$(du -h "$INSTANCES_TAR" | cut -f1)
log "  instances volume: $INST_SIZE"

# ─────────────────────────────────────────────────────────────────
# 3. Manifest
# ─────────────────────────────────────────────────────────────────
cat > "$WORKDIR/MANIFEST.txt" <<EOF
Parrilla 8187 — Evolution API stack backup
Timestamp UTC: $(date -u -Iseconds)
Stack: parrilla-evolution
Postgres: $PG_DB (user $PG_USER)
Volume: $INSTANCES_VOLUME

Files:
- evolution.sql        (pg_dump --clean --if-exists)
- instances.tar.gz     (tar do volume $INSTANCES_VOLUME)
- MANIFEST.txt         (este arquivo)

Restore: ver docs/runbook.md secao 7.
EOF

# ─────────────────────────────────────────────────────────────────
# 4. Empacotar tudo num arquivo final
# ─────────────────────────────────────────────────────────────────
ARCHIVE="$BACKUP_DIR/evolution-${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$WORKDIR" .
ARCHIVE_SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "Archive written: $ARCHIVE ($ARCHIVE_SIZE)"

# ─────────────────────────────────────────────────────────────────
# 5. Rotacao
# ─────────────────────────────────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -type f -name 'evolution-*.tar.gz' -mtime +$RETENTION_DAYS -delete -print | wc -l)
[[ "$DELETED" -gt 0 ]] && log "Rotation: deleted $DELETED archive(s) older than $RETENTION_DAYS days"

REMAINING=$(find "$BACKUP_DIR" -type f -name 'evolution-*.tar.gz' | wc -l)
log "Done. $REMAINING archive(s) retained."
