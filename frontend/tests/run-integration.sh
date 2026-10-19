#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${NODE_BIN:=node}"
: "${PYTHON_BIN:=.venv/bin/python}"
: "${PLAYWRIGHT_PACKAGE:=playwright}"
"$PYTHON_BIN" -m uvicorn backend_fixture:app --app-dir frontend/tests --host 127.0.0.1 --port 18000 > /tmp/deathline-test-backend.log 2>&1 &
api_pid=$!
DEATHLINE_API_TARGET=http://127.0.0.1:18000 "$NODE_BIN" frontend/node_modules/vite/bin/vite.js frontend --host 127.0.0.1 --port 15173 --strictPort > /tmp/deathline-test-frontend.log 2>&1 &
front_pid=$!
cleanup() {
  kill "$api_pid" "$front_pid" 2>/dev/null || true
  wait "$api_pid" "$front_pid" 2>/dev/null || true
}
trap cleanup EXIT
PLAYWRIGHT_PACKAGE="$PLAYWRIGHT_PACKAGE" "$NODE_BIN" frontend/tests/integration.mjs
