#!/usr/bin/env bash
# Security gate: `npm audit --audit-level=high` in the current directory.
# Retries only when the registry's audit endpoint itself fails (e.g. npm
# maintenance returning HTTP 503). Found vulnerabilities fail immediately, and
# an endpoint that stays unavailable fails closed.
set -u
attempts=5
for attempt in $(seq 1 "$attempts"); do
  output=$(npm audit --audit-level=high 2>&1)
  status=$?
  echo "$output"
  if [ "$status" -eq 0 ]; then exit 0; fi
  if ! printf '%s' "$output" | grep -qiE 'audit endpoint returned an error|ENOAUDIT|E50[0-9]|ETIMEDOUT|ECONNRESET|EAI_AGAIN'; then
    exit "$status"
  fi
  if [ "$attempt" -lt "$attempts" ]; then
    echo "npm audit endpoint unavailable (attempt $attempt/$attempts), retrying in $((attempt * 30))s" >&2
    sleep $((attempt * 30))
  fi
done
echo "npm audit endpoint stayed unavailable; failing closed." >&2
exit 1
