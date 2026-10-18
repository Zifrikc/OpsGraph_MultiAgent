#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
docker compose up -d --wait falkordb
set -a
. ./.env
set +a
export FALKORDB_HOST=localhost FALKORDB_PORT=6380 RUN_INTEGRATION=1
(cd apps/api && uv run pytest -q)
(cd apps/web && npm run build)
