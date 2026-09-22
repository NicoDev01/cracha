#!/usr/bin/env bash
set -e

export PATH="/usr/lib/postgresql/16/bin:/usr/bin:/bin"
PGDATA="/tmp/test_pg_db"
PGLOG="/tmp/pg.log"

rm -rf "$PGDATA" "$PGLOG"
initdb -D "$PGDATA" --auth=trust -U postgres --no-instructions > /dev/null
pg_ctl -D "$PGDATA" -l "$PGLOG" -o "-p 5433 -k /tmp" start

cleanup() {
    pg_ctl -D "$PGDATA" stop || true
    rm -rf "$PGDATA" "$PGLOG"
}
trap cleanup EXIT

createdb -h /tmp -p 5433 -U postgres cracha_billing_test

export BILLING_TEST_DATABASE_URL="postgresql://postgres@/cracha_billing_test?host=/tmp&port=5433"

# Run python test script
cd /mnt/c/Users/nico_/Desktop/Projekte/cracha
python3 scripts/test-billing.py
