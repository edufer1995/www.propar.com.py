#!/usr/bin/env bash
#
# (Re)crea la base abas_v2 desde cero y corre las migraciones.
# Idempotente: se puede correr las veces que haga falta.
#
# Uso: scripts/etl/00_reset_v2.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$DIR"

DB_NAME="${DB_DATABASE:-abas_v2}"

echo "==> Recreando base ${DB_NAME} (contenedor podman 'pg')"
podman exec -i pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};
SQL

echo "==> Corriendo migraciones"
node ace migration:run --force

echo "==> Listo. Ahora podés correr: node ace etl:import"
