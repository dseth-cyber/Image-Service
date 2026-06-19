#!/bin/sh
set -e

case "${1:-start}" in
  migrate)
    echo "=== Running Prisma DB push ==="
    npx prisma db push --skip-generate --accept-data-loss
    echo "=== Running seed ==="
    npx tsx prisma/seed.ts
    echo "=== Migration complete ==="
    ;;
  start|*)
    echo "=== Running Prisma DB push ==="
    npx prisma db push --skip-generate --accept-data-loss
    echo "=== Running seed ==="
    npx tsx prisma/seed.ts
    echo "=== Starting image-api ==="
    exec node dist/index.js
    ;;
esac
