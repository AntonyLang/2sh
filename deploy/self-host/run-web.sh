#!/bin/sh
set -eu

/app/deploy/self-host/init-data-dir.sh

exec npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
