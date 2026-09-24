"""Run only against a disposable empty PostgreSQL database (CI service or local test db).

Bootstrap intentionally fails when auth already exists. Never point at Supabase.
"""
import concurrent.futures
import os
from pathlib import Path
import subprocess

from urllib.parse import urlsplit

url = os.environ.get("BILLING_TEST_DATABASE_URL")
if not url:
    raise SystemExit("BILLING_TEST_DATABASE_URL must name a disposable empty database")

parsed_url = urlsplit(url)
if parsed_url.password and "PGPASSWORD" not in os.environ:
    os.environ["PGPASSWORD"] = parsed_url.password


def sql(text):
    result = subprocess.run(
        ["psql", "--no-psqlrc", url, "-v", "ON_ERROR_STOP=1", "-At"],
        input=text,
        text=True,
        encoding="utf-8",
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


for path in [
    "supabase/tests/billing-bootstrap.sql",
    "supabase/migrations/20260813120000_replace_plans_with_credits.sql",
    "supabase/migrations/20260813140000_tighten_credit_grants.sql",
    "supabase/migrations/20260813150000_halve_the_welcome_grant.sql",
    "supabase/migrations/20260920090000_billing_guards.sql",
    "supabase/migrations/20260920091000_signup_email_guard.sql",
    "supabase/migrations/20260920100000_database_quota_guards.sql",
    "supabase/migrations/20260923120000_account_self_deletion.sql",
    "supabase/migrations/20260924100000_activation_funnel_and_reminder.sql",
    "supabase/tests/billing-assertions.sql",
    "supabase/tests/account-deletion-assertions.sql",
    "supabase/tests/activation-assertions.sql",
]:
    sql(Path(path).read_text(encoding="utf-8"))

user = "00000000-0000-4000-8000-000000000001"
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    results = list(
        executor.map(
            lambda i: sql(f"select credit_hold('{user}',10,'parallel-{i}')->>'allowed';"),
            range(8),
        )
    )
assert results.count("true") == 1, results
sql("select credit_release(reference) from credit_holds;")
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    results = list(
        executor.map(
            lambda _: sql(
                f"select credit_spend('{user}',5,'chat','parallel-chat',null)->>'allowed';"
            ),
            range(8),
        )
    )
assert results.count("true") == 1, results
assert (
    sql(
        f"select balance+reserved=(select sum(amount) from credit_entries where user_id='{user}') from credit_accounts where user_id='{user}';"
    )
    == "t"
)

# Test database quota allocation concurrency up to max 25 with distinct fixture IDs
for d in range(24):
    res = sql(f"select allowed from public.database_allocate('{user}','u1-db-{d}');")
    assert res == "t", res

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    alloc_results = list(
        executor.map(
            lambda i: sql(
                f"select allowed from public.database_allocate('{user}','u1-parallel-db-{i}');"
            ),
            range(8),
        )
    )
assert alloc_results.count("t") == 1, alloc_results
assert sql(f"select database_count('{user}');") == "25"

# Idempotent re-allocation of existing database should succeed without increasing count
assert sql(f"select allowed from public.database_allocate('{user}','u1-db-0');") == "t"
assert sql(f"select database_count('{user}');") == "25"

# Allocation beyond 25 must be rejected
assert sql(f"select allowed from public.database_allocate('{user}','u1-db-excess');") == "f"
assert sql(f"select database_count('{user}');") == "25"

# Deallocation releases slot
assert sql(f"select database_deallocate('{user}','u1-db-0');") == "24"
assert sql(f"select database_count('{user}');") == "24"

# Concurrency for a user WITHOUT a credit_accounts row (tests pg_advisory_xact_lock)
user_no_credit = "00000000-0000-4000-8000-000000000002"
sql(f"insert into auth.users values ('{user_no_credit}');")
# Explicitly delete the auto-created credit_accounts row to guarantee testing without it
sql(f"delete from public.credit_accounts where user_id = '{user_no_credit}';")
assert sql(f"select count(*) from public.credit_accounts where user_id = '{user_no_credit}';") == "0"

for d in range(24):
    assert sql(f"select allowed from public.database_allocate('{user_no_credit}','u2-db-{d}');") == "t"

# Foreign database collision: user 2 tries to allocate user 1's existing database
assert (
    sql(f"select allowed from public.database_allocate('{user_no_credit}','u1-db-1');")
    == "f"
)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    alloc_results2 = list(
        executor.map(
            lambda i: sql(
                f"select allowed from public.database_allocate('{user_no_credit}','u2-parallel-db2-{i}');"
            ),
            range(8),
        )
    )
assert alloc_results2.count("t") == 1, alloc_results2
assert sql(f"select database_count('{user_no_credit}');") == "25"

# Batch sync existing databases
user_sync = "00000000-0000-4000-8000-000000000003"
sql(f"insert into auth.users values ('{user_sync}');")
assert (
    sql(
        f"select database_sync_batch('{user_sync}', array['synced-1', 'synced-2', 'synced-3']);"
    )
    == "3"
)
assert sql(f"select database_count('{user_sync}');") == "3"

# 30 concurrent reservations starting from count 0: exactly 25 must succeed, 5 must be rejected
user_burst = "00000000-0000-4000-8000-000000000004"
sql(f"insert into auth.users values ('{user_burst}');")
with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
    burst_results = list(
        executor.map(
            lambda i: sql(
                f"select allowed from public.database_allocate('{user_burst}','burst-db-{i}');"
            ),
            range(30),
        )
    )
assert burst_results.count("t") == 25, f"Expected 25 successes, got {burst_results.count('t')}"
assert burst_results.count("f") == 5, f"Expected 5 rejections, got {burst_results.count('f')}"
assert sql(f"select database_count('{user_burst}');") == "25"

# Migration / Cutover of existing KV user & protection against stale snapshot resurrection
user_mig = "00000000-0000-4000-8000-000000000005"
sql(f"insert into auth.users values ('{user_mig}');")
kv_ids_25 = [f"'mig-db-{i}'" for i in range(25)]
kv_array_sql = f"array[{', '.join(kv_ids_25)}]"
# Allocation with 25 existing KV databases must fail to allocate 26th
assert (
    sql(
        f"select allowed from public.database_allocate('{user_mig}','mig-db-26',25,{kv_array_sql});"
    )
    == "f"
)
assert sql(f"select database_count('{user_mig}');") == "25"
# Deallocate one database:
assert sql(f"select database_deallocate('{user_mig}','mig-db-0');") == "24"
assert sql(f"select database_count('{user_mig}');") == "24"
# Repeated sync with stale 25-item snapshot must NOT resurrect deleted 'mig-db-0'
assert sql(f"select database_sync_batch('{user_mig}', {kv_array_sql});") == "24"
assert sql(f"select database_count('{user_mig}');") == "24"
# Free slot can now be allocated
assert (
    sql(f"select allowed from public.database_allocate('{user_mig}','mig-db-26');")
    == "t"
)
assert sql(f"select database_count('{user_mig}');") == "25"

# Atomic deletion claim (database_claim_delete) prevents check-then-act crawl race
user_claim = "00000000-0000-4000-8000-000000000006"
user_foreign = "00000000-0000-4000-8000-000000000009"
sql(f"insert into auth.users values ('{user_claim}');")
sql(f"insert into auth.users values ('{user_foreign}');")
sql(f"select allowed from public.database_allocate('{user_claim}','del-db-1');")
sql(f"select credit_hold('{user_claim}',10,'del-hold-1');")
sql(f"update public.credit_holds set database_id='del-db-1' where reference='del-hold-1';")

# With active hold, claim_delete must reject with active_crawl
assert sql(f"select allowed from public.database_claim_delete('{user_claim}','del-db-1');") == "f"
assert sql(f"select reason from public.database_claim_delete('{user_claim}','del-db-1');") == "active_crawl"

# After release of hold, claim_delete succeeds
sql("select credit_release('del-hold-1');")
assert sql(f"select allowed from public.database_claim_delete('{user_claim}','del-db-1');") == "t"

# Quota slot MUST remain allocated during in-progress deletion claim (separated from completion!)
assert sql(f"select database_count('{user_claim}');") == "1"

# Idempotent retry by the same user succeeds
assert sql(f"select allowed from public.database_claim_delete('{user_claim}','del-db-1');") == "t"
assert sql(f"select reason from public.database_claim_delete('{user_claim}','del-db-1');") == "ok"

# Foreign user cannot claim or resume deletion of this database
assert sql(f"select allowed from public.database_claim_delete('{user_foreign}','del-db-1');") == "f"
assert sql(f"select reason from public.database_claim_delete('{user_foreign}','del-db-1');") == "not_found"

# Completion: database_deallocate releases the quota slot and marks deletion completed
assert sql(f"select public.database_deallocate('{user_claim}','del-db-1');") == "0"
assert sql(f"select database_count('{user_claim}');") == "0"

# After completion, subsequent deletion claims return not_found
assert sql(f"select allowed from public.database_claim_delete('{user_claim}','del-db-1');") == "f"
assert sql(f"select reason from public.database_claim_delete('{user_claim}','del-db-1');") == "not_found"

# Direct deletion of a legacy unsynced KV database before first SQL sync
user_legacy = "00000000-0000-4000-8000-00000000000A"
sql(f"insert into auth.users values ('{user_legacy}');")
assert sql(f"select allowed from public.database_claim_delete('{user_legacy}','legacy-unsynced-db');") == "t"
# Idempotent retry
assert sql(f"select allowed from public.database_claim_delete('{user_legacy}','legacy-unsynced-db');") == "t"
# Foreign user blocked
assert sql(f"select allowed from public.database_claim_delete('{user_foreign}','legacy-unsynced-db');") == "f"
# Deallocate
sql(f"select public.database_deallocate('{user_legacy}','legacy-unsynced-db');")
# Subsequent batch sync must NOT resurrect it
assert sql(f"select database_sync_batch('{user_legacy}', array['legacy-unsynced-db']);") == "0"

# Race condition & mutual exclusion between bind_crawl_hold and database_claim_delete
user_race = "00000000-0000-4000-8000-000000000007"
sql(f"insert into auth.users values ('{user_race}');")
sql(f"select allowed from public.database_allocate('{user_race}','race-db-1');")
sql(f"select allowed from public.database_allocate('{user_race}','race-db-2');")

# Case A: Deletion claimed first -> bind_crawl_hold must fail with exception
sql(f"select credit_hold('{user_race}',10,'race-hold-1');")
assert sql(f"select allowed from public.database_claim_delete('{user_race}','race-db-1');") == "t"
try:
    sql(f"select public.bind_crawl_hold('race-hold-1','race-db-1');")
    assert False, "Expected bind_crawl_hold to raise exception for deleted database"
except RuntimeError as exc:
    assert "Database not found or deletion in progress" in str(exc), str(exc)

# Release the unused hold and complete deallocation
sql("select credit_release('race-hold-1');")
sql(f"select public.database_deallocate('{user_race}','race-db-1');")

# Case B: bind_crawl_hold claimed first -> database_claim_delete must be rejected with active_crawl
sql(f"select credit_hold('{user_race}',10,'race-hold-2');")
sql(f"select public.bind_crawl_hold('race-hold-2','race-db-2');")
assert sql(f"select allowed from public.database_claim_delete('{user_race}','race-db-2');") == "f"
assert sql(f"select reason from public.database_claim_delete('{user_race}','race-db-2');") == "active_crawl"

# Clean up Case B
sql("select credit_release('race-hold-2');")
assert sql(f"select allowed from public.database_claim_delete('{user_race}','race-db-2');") == "t"
sql(f"select public.database_deallocate('{user_race}','race-db-2');")
assert sql(f"select database_count('{user_race}');") == "0"

# True Multithreaded Concurrency Test: simultaneous bind_crawl_hold vs database_claim_delete
user_conc = "00000000-0000-4000-8000-00000000000B"
sql(f"insert into auth.users values ('{user_conc}');")
sql(f"select allowed from public.database_allocate('{user_conc}','conc-db');")
sql(f"select credit_hold('{user_conc}',10,'conc-hold');")

def try_bind():
    try:
        sql(f"select public.bind_crawl_hold('conc-hold','conc-db');")
        return ("bind", "ok")
    except RuntimeError as e:
        return ("bind", "err", str(e))

def try_claim_delete():
    try:
        res = sql(f"select allowed, reason from public.database_claim_delete('{user_conc}','conc-db');")
        return ("delete", res)
    except RuntimeError as e:
        return ("delete", "err", str(e))

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    f1 = executor.submit(try_bind)
    f2 = executor.submit(try_claim_delete)
    out_bind = f1.result()
    out_delete = f2.result()

# Exactly one operation must succeed, mutual exclusion must hold
if out_bind == ("bind", "ok"):
    # Bind won -> deletion claim must have been rejected with active_crawl
    assert "active_crawl" in str(out_delete), f"Expected delete to be rejected, got: {out_delete}"
    sql("select credit_release('conc-hold');")
    assert sql(f"select allowed from public.database_claim_delete('{user_conc}','conc-db');") == "t"
    sql(f"select public.database_deallocate('{user_conc}','conc-db');")
else:
    # Delete won -> bind must have failed with 'Database not found or deletion in progress'
    assert "Database not found or deletion in progress" in str(out_bind), f"Unexpected bind error: {out_bind}"
    assert "t|ok" in str(out_delete) or "t" in str(out_delete), f"Expected delete success, got: {out_delete}"
    sql("select credit_release('conc-hold');")
    sql(f"select public.database_deallocate('{user_conc}','conc-db');")

assert sql(f"select database_count('{user_conc}');") == "0"

# Deleted database in user_database_deletions must never be resurrected by batch sync or initial sync
assert sql(f"select database_sync_batch('{user_race}', array['race-db-1', 'race-db-2']);") == "0"
assert sql(f"select database_count('{user_race}');") == "0"

user_new_sync = "00000000-0000-4000-8000-000000000008"
sql(f"insert into auth.users values ('{user_new_sync}');")
# Pre-record a deletion claim
sql(f"insert into public.user_database_deletions values ('del-pre-1', '{user_new_sync}', now(), null);")
# Allocation with existing ID that was deleted: must skip 'del-pre-1'
assert sql(f"select allowed from public.database_allocate('{user_new_sync}', 'brand-new-db', 25, array['del-pre-1', 'valid-pre-1']);") == "t"
assert sql(f"select database_count('{user_new_sync}');") == "2"
assert sql(f"select exists(select 1 from public.user_databases where database_id = 'del-pre-1');") == "f"

# Preflight Diagnostic RPC Check (N1 Verification)
# 1. Capture table row counts before preflight check
users_before = int(sql("select count(*) from auth.users;"))
dbs_before = int(sql("select count(*) from public.user_databases;"))
syncs_before = int(sql("select count(*) from public.user_database_syncs;"))
dels_before = int(sql("select count(*) from public.user_database_deletions;"))

# 2. Execute database_preflight_check()
preflight_results = sql("select function_name, signature_valid, service_role_executable from public.database_preflight_check();")
rows = [line.split("|") for line in preflight_results.strip().split("\n") if line.strip()]
assert len(rows) == 6, f"Expected 6 checked functions, got: {rows}"
for fn_name, sig_valid, sr_exec in rows:
    assert sig_valid == "t", f"Function {fn_name} has invalid signature"
    assert sr_exec == "t", f"Function {fn_name} missing service_role execute permission"

# 3. Assert zero mutations occurred (no dummy users, no slots, no sync markers, no deletions)
assert int(sql("select count(*) from auth.users;")) == users_before
assert int(sql("select count(*) from public.user_databases;")) == dbs_before
assert int(sql("select count(*) from public.user_database_syncs;")) == syncs_before
assert int(sql("select count(*) from public.user_database_deletions;")) == dels_before

# 4. Assert failure detection: revoking privilege causes diagnostic check to report false
sql("revoke execute on function public.database_allocate(uuid,text,integer,text[]) from service_role;")
check_revoked = sql("select service_role_executable from public.database_preflight_check() where function_name = 'database_allocate';")
assert check_revoked == "f", f"Expected 'f' after revocation, got {check_revoked}"
# Re-grant privilege
sql("grant execute on function public.database_allocate(uuid,text,integer,text[]) to service_role;")
check_restored = sql("select service_role_executable from public.database_preflight_check() where function_name = 'database_allocate';")
assert check_restored == "t", f"Expected 't' after grant, got {check_restored}"

print("BILLING TRANSACTIONS AND CONCURRENCY PASSED")
