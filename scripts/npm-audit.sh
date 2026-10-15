#!/usr/bin/env bash
# Security gate: `npm audit --omit=dev --audit-level=high` in the current
# directory. Only the dependencies that ship with the app block CI. Dev tools
# (ESLint, Wrangler, Vitest) never reach a visitor, and an advisory in them
# without any patched version — braces, GHSA-vfj7-8cjw-p6xm, via
# eslint-config-next — would otherwise keep CI red with nothing to update.
# The full audit is still printed first, so dev findings stay visible.
#
# Retries only when the registry's audit endpoint itself fails (e.g. npm
# maintenance returning HTTP 503). Found vulnerabilities fail immediately, and
# an endpoint that stays unavailable fails closed.
set -u
echo "--- Full audit incl. dev tools (informational, does not block) ---"
npm audit --audit-level=high || true
echo "--- Gate: shipped dependencies only ---"
attempts=5
for attempt in $(seq 1 "$attempts"); do
  output=$(npm audit --omit=dev --audit-level=high 2>&1)
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
