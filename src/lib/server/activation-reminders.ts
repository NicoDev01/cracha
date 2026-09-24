import { createClient } from "@supabase/supabase-js";

import { activationReminderEmail } from "../email/activation-reminder";

/**
 * Runs from the Worker's cron trigger (custom-worker.ts), outside Next — which
 * is why this file takes its env as an argument, imports relatively and does
 * not import 'server-only' or getWorkerEnv: both need a Next request.
 *
 * Who is due is decided in the database (claim_activation_reminders), which
 * also marks them taken, so an overlapping run cannot mail anyone twice. A
 * failed send gives the claim back and the next hourly run tries again.
 */

export interface ReminderEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
}

export interface ReminderRun {
  configured: boolean;
  sent: number;
  failed: number;
}

const from = "CraCha <hallo@cracha-app.com>";
const replyTo = "hallo@cracha-app.com";

export async function sendDueActivationReminders(
  env: ReminderEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<ReminderRun> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = env.RESEND_API_KEY;
  if (!url || !serviceKey || !resendKey) return { configured: false, sent: 0, failed: 0 };

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl },
  });
  const { data, error } = await supabase.rpc("claim_activation_reminders", { p_limit: 50 });
  if (error) throw new Error(`claim_activation_reminders fehlgeschlagen: ${error.message}`);

  const email = activationReminderEmail();
  let sent = 0;
  let failed = 0;
  for (const { user_id: userId, email: address } of (data ?? []) as { user_id: string; email: string }[]) {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "User-Agent": "cracha-activation-reminder",
        // Resend keeps this for 24 hours: a retry after a lost response does
        // not produce a second mail.
        "Idempotency-Key": `activation-reminder-${userId}`,
      },
      body: JSON.stringify({ from, to: [address], reply_to: replyTo, subject: email.subject, html: email.html, text: email.text }),
    }).catch(() => null);

    const ok = response?.ok === true;
    if (ok) sent++;
    else failed++;
    const { error: finishError } = await supabase.rpc("finish_activation_reminder", { p_user: userId, p_sent: ok });
    if (finishError) console.error(JSON.stringify({ event: "activation_reminder_finish_failed", sent: ok }));
    if (!ok) console.error(JSON.stringify({ event: "activation_reminder_send_failed", status: response?.status ?? null }));
  }
  return { configured: true, sent, failed };
}
