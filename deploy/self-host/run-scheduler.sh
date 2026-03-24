#!/bin/sh
set -eu

/app/deploy/self-host/init-data-dir.sh

CRON_FILE="/tmp/sync-dictionary.cron"
SYNC_TZ_VALUE="${SYNC_TZ:-Asia/Shanghai}"
SYNC_SCHEDULE_VALUE="${SYNC_SCHEDULE:-0 8 * * *}"

printf 'CRON_TZ=%s\n%s cd /app && npm run sync-dictionary\n' "$SYNC_TZ_VALUE" "$SYNC_SCHEDULE_VALUE" > "$CRON_FILE"

exec supercronic "$CRON_FILE"
