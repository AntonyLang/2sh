#!/bin/sh
set -eu

DATA_DIR_PATH="${DATA_DIR:-/app/var}"

case "$DATA_DIR_PATH" in
  /*) TARGET_DIR="$DATA_DIR_PATH" ;;
  *) TARGET_DIR="/app/$DATA_DIR_PATH" ;;
esac

mkdir -p \
  "$TARGET_DIR/compiled" \
  "$TARGET_DIR/snapshots" \
  "$TARGET_DIR/reports" \
  "$TARGET_DIR/reports/usage" \
  "$TARGET_DIR/review-candidates/reports" \
  "$TARGET_DIR/logs/queries" \
  "$TARGET_DIR/feedback" \
  "$TARGET_DIR/mirror"
