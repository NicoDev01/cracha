/**
 * CraCha Preflight Release Check
 *
 * Verifies required database migrations, RPC functions, environment configuration,
 * and service readiness before a release is deployed to production.
 *
 * Usage:
 *   npx tsx scripts/preflight-release.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface CheckResult {
  name: string
  passed: boolean
  message: string
  critical: boolean
}

export const FATAL_RPC_ERROR_CODES = new Set([
  'PGRST202', // Function not found in schema cache
  '42883',    // undefined_function (PostgreSQL)
  'PGRST203', // Function overload / argument mismatch
  'PGRST100', // Missing required arguments
  '42501',    // insufficient_privilege (service_role denied)
  '42P01',    // undefined_table (called table inside function does not exist)
])

export const EXPECTED_DIAGNOSTIC_FUNCTIONS = [
  'database_allocate',
  'database_deallocate',
  'database_sync_batch',
  'database_count',
  'database_claim_delete',
  'bind_crawl_hold',
]

export async function verifyPreflight(
  supabase: SupabaseClient,
  env: Record<string, string | undefined> = process.env,
): Promise<{ passed: boolean; results: CheckResult[] }> {
  const results: CheckResult[] = []

  // 1. Umgebungsvariablen prüfen
  const checkEnv = (key: string, critical = true) => {
    const val = env[key]?.trim()
    if (!val) {
      results.push({
        name: `Env: ${key}`,
        passed: false,
        message: `Umgebungsvariable ${key} fehlt oder ist leer.`,
        critical,
      })
      return null
    }
    results.push({
      name: `Env: ${key}`,
      passed: true,
      message: 'Gesetzt',
      critical,
    })
    return val
  }

  checkEnv('NEXT_PUBLIC_SUPABASE_URL', true)
  checkEnv('SUPABASE_SERVICE_ROLE_KEY', true)
  checkEnv('NEXT_PUBLIC_CRACHA_WORKER_URL', false)
  const token = checkEnv('CRACHA_SERVICE_TOKEN', false) || checkEnv('RAG_QUERY_SECRET', false)
  if (!token) {
    // Already tracked by individual checkEnv calls
  }

  // 2. Erforderliche RPC-Funktionen prüfen
  const requiredRpcs: Array<{
    rpc: string
    args: Record<string, unknown>
    expectedErrorSubstring?: string
  }> = [
    {
      rpc: 'credit_spend',
      args: { p_user: '00000000-0000-0000-0000-000000000000', p_amount: 0, p_kind: 'preflight', p_reference: 'preflight-check', p_detail: null },
      expectedErrorSubstring: 'Invalid debit',
    },
    {
      rpc: 'credit_hold',
      args: { p_user: '00000000-0000-0000-0000-000000000000', p_amount: 0, p_reference: 'preflight-hold' },
      expectedErrorSubstring: 'Invalid amount',
    },
    {
      rpc: 'credit_settle',
      args: { p_reference: 'preflight-hold', p_actual: 0 },
      expectedErrorSubstring: 'Unknown hold',
    },
    {
      rpc: 'credit_release',
      args: { p_reference: 'preflight-hold' },
    },
    {
      rpc: 'credit_state',
      args: { p_user: '00000000-0000-0000-0000-000000000000' },
    },
    {
      rpc: 'bind_crawl_hold',
      args: { p_reference: 'preflight-hold', p_database: 'preflight-dummy-slot' },
      expectedErrorSubstring: 'Missing crawl reservation',
    },
    {
      rpc: 'database_count',
      args: { p_user: '00000000-0000-0000-0000-000000000000' },
    },
    {
      rpc: 'database_preflight_check',
      args: {},
    },
  ]

  for (const { rpc, args, expectedErrorSubstring } of requiredRpcs) {
    try {
      const { data, error } = await supabase.rpc(rpc, args)
      if (error) {
        if (FATAL_RPC_ERROR_CODES.has(error.code)) {
          results.push({
            name: `RPC: ${rpc}`,
            passed: false,
            message: `RPC ${rpc} nicht verfügbar oder Argumente falsch (Code: ${error.code}, ${error.message}). Migration unvollständig.`,
            critical: true,
          })
        } else if (expectedErrorSubstring && (error.message?.includes(expectedErrorSubstring) || error.details?.includes(expectedErrorSubstring))) {
          // Expected domain validation error with dummy arguments proves function is installed and active
          results.push({
            name: `RPC: ${rpc}`,
            passed: true,
            message: `Vorhanden und aktiv (Erwartete Validierung: ${expectedErrorSubstring})`,
            critical: true,
          })
        } else {
          // Unexpected error: do not silently accept!
          results.push({
            name: `RPC: ${rpc}`,
            passed: false,
            message: `Unerwarteter Fehler bei RPC ${rpc} (Code: ${error.code}, ${error.message}).`,
            critical: true,
          })
        }
      } else if (rpc === 'database_preflight_check') {
        const checks = Array.isArray(data) ? (data as Array<{ function_name: string; signature_valid: boolean; service_role_executable: boolean }>) : []
        if (checks.length === 0) {
          results.push({
            name: `RPC: ${rpc}`,
            passed: false,
            message: 'Diagnose-RPC lieferte keine Funktionsergebnisse.',
            critical: true,
          })
        } else {
          let allOk = true
          for (const expectedFn of EXPECTED_DIAGNOSTIC_FUNCTIONS) {
            const item = checks.find((c) => c.function_name === expectedFn)
            if (!item) {
              allOk = false
              results.push({
                name: `RPC Diagnostic: ${expectedFn}`,
                passed: false,
                message: `Erforderliche Funktion ${expectedFn} nicht im Diagnose-Ergebnis vorhanden.`,
                critical: true,
              })
            } else if (!item.signature_valid || !item.service_role_executable) {
              allOk = false
              results.push({
                name: `RPC Diagnostic: ${item.function_name}`,
                passed: false,
                message: `Signatur gültig=${item.signature_valid}, service_role ausführbar=${item.service_role_executable}`,
                critical: true,
              })
            }
          }
          if (allOk) {
            results.push({
              name: `RPC: ${rpc}`,
              passed: true,
              message: `Alle ${EXPECTED_DIAGNOSTIC_FUNCTIONS.length} Quota- und Lock-Funktionen mit gültiger Signatur und service_role-Rechten bestätigt`,
              critical: true,
            })
          }
        }
      } else {
        results.push({
          name: `RPC: ${rpc}`,
          passed: true,
          message: 'Erfolgreich ansprechbar',
          critical: true,
        })
      }
    } catch (err) {
      results.push({
        name: `RPC: ${rpc}`,
        passed: false,
        message: `Unerwarteter Fehler beim Aufruf: ${err instanceof Error ? err.message : String(err)}`,
        critical: true,
      })
    }
  }

  // 3. Tabellenprüfung
  const tables = [
    'credit_accounts',
    'credit_entries',
    'credit_holds',
    'crawl_access',
    'billing_payments',
    'request_limits',
    'user_databases',
    'user_database_syncs',
    'user_database_deletions',
  ]
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) {
        results.push({
          name: `Table: ${table}`,
          passed: false,
          message: `Tabelle nicht abfragbar: ${error.message}`,
          critical: true,
        })
      } else {
        results.push({
          name: `Table: ${table}`,
          passed: true,
          message: 'Tabelle existiert und ist zugreifbar',
          critical: true,
        })
      }
    } catch (err) {
      results.push({
        name: `Table: ${table}`,
        passed: false,
        message: `Fehler bei Tabellenprüfung: ${err instanceof Error ? err.message : String(err)}`,
        critical: true,
      })
    }
  }

  // 4. Crawler-Service & Settlement-Protokoll prüfen
  // The deploy workflow runs this check after the crawler deploy instead,
  // because the new billing protocol only exists once that deploy is done.
  const crawlerUrl = env.MODAL_CRAWLER_URL?.trim()
  if (env.PREFLIGHT_SKIP_CRAWLER === 'true') {
    results.push({
      name: 'Crawler: Health & Billing Protocol',
      passed: true,
      message: 'Übersprungen; wird nach dem Crawler-Deploy geprüft.',
      critical: false,
    })
  } else if (!crawlerUrl) {
    results.push({
      name: 'Crawler: Health & Billing Protocol',
      passed: false,
      message: 'MODAL_CRAWLER_URL ist nicht konfiguriert.',
      critical: true,
    })
  } else {
    try {
      const resp = await fetch(`${crawlerUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(5000) })
      const data = (await resp.json().catch(() => ({}))) as { billing_protocol?: number; settlement_configured?: boolean }
      if (resp.ok && data.billing_protocol === 1 && data.settlement_configured === true) {
        results.push({
          name: 'Crawler: Health & Billing Protocol',
          passed: true,
          message: 'Crawler erreichbar, billing_protocol: 1, settlement_configured: true',
          critical: true,
        })
      } else {
        results.push({
          name: 'Crawler: Health & Billing Protocol',
          passed: false,
          message: `Crawler meldet inkompatibles Protokoll (Status: ${resp.status}, protocol: ${data.billing_protocol}, settlement: ${data.settlement_configured})`,
          critical: true,
        })
      }
    } catch (err) {
      results.push({
        name: 'Crawler: Health & Billing Protocol',
        passed: false,
        message: `Crawler nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`,
        critical: true,
      })
    }
  }

  // 5. Supabase Auth Hook: Before User Created (Manuelles Release-Gate)
  const hookConfirmed = env.CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED === 'true' || env.AUTH_HOOK_VERIFIED === 'true'
  results.push({
    name: 'Gate: Supabase Auth Hook (Before User Created)',
    passed: hookConfirmed,
    message: hookConfirmed
      ? 'Auth Hook "Before User Created" für public.before_user_created wurde manuell verifiziert.'
      : 'OFFEN / BLOCKER: SQL-Funktion `public.before_user_created` muss im Supabase Dashboard unter Authentication -> Hooks als "Before User Created" Hook aktiviert sein. Bestätige mit CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED=true.',
    critical: true,
  })

  const passed = !results.some((r) => r.critical && !r.passed)
  return { passed, results }
}

export function printSummary(results: CheckResult[]) {
  console.log('Ergebnisse:')
  for (const r of results) {
    const mark = r.passed ? '✓' : (r.critical ? '✗ [BLOCKER]' : '! [WARN]')
    console.log(`  ${mark} ${r.name}: ${r.message}`)
  }
}

async function main() {
  console.log('=== CraCha Preflight Release Verification ===\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL oder Service Role Key fehlen. Datenbank-Prüfungen können nicht ausgeführt werden.\n')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { passed, results } = await verifyPreflight(supabase, process.env)
  printSummary(results)

  if (!passed) {
    console.error('\nPreflight fehlgeschlagen: Mindestens eine kritische Anforderung ist nicht erfüllt. Release abgebrochen.')
    process.exit(1)
  } else {
    console.log('\nPreflight erfolgreich: Alle geprüften Release-Voraussetzungen sind erfüllt.')
  }
}

// Execute when invoked directly
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/preflight-release.ts')) {
  void main()
}
