#!/usr/bin/env bash
#
# Deploy de www.abas.com.py-v2 en la VM de producción.
#
# Uso (en el server, como root):
#   bash /var/www/www2/scripts/deploy-prod.sh
#
# Automatiza el runbook completo: pull, build, restaurar .env, deps del
# build (npm run build deja build/node_modules VACÍO), oracledb (no está
# en package.json a propósito), migraciones y restart. Cualquier paso que
# falle corta el deploy (set -e) — el proceso viejo sigue corriendo hasta
# el pm2 restart del final.
#
set -euo pipefail

RAIZ=/var/www/www2

# Node 24.19 fijo: 24.20 tiene una regresión que rompe @adonisjs/ace
export PATH=/opt/node24/bin:$PATH
VERSION_NODE=$(node -v)
case "$VERSION_NODE" in
  v24.19.*) echo "Node $VERSION_NODE OK" ;;
  *)
    echo "ERROR: node es $VERSION_NODE y se requiere v24.19.x (/opt/node24/bin primero en el PATH)"
    exit 1
    ;;
esac

test -f "$RAIZ/.env.prod" || { echo "ERROR: falta $RAIZ/.env.prod (master del .env del build)"; exit 1; }

cd "$RAIZ"
git pull origin master
npm run build

# El build recrea build/ entero: restaurar el .env desde el master copy
command cp -f "$RAIZ/.env.prod" "$RAIZ/build/.env"

cd "$RAIZ/build"
npm ci --omit=dev
npm install oracledb
node ace migration:run --force

pm2 restart www-v2 --update-env
pm2 logs www-v2 --lines 50 --nostream
