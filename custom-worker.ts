// The Worker entry point: OpenNext's generated fetch handler plus the hourly
// cron trigger in wrangler.jsonc, which sends the activation reminder.
// https://opennext.js.org/cloudflare/howtos/custom-worker
//
// .open-next/worker.js only exists after `opennextjs-cloudflare build`, and
// this file is outside tsconfig's include for that reason; Wrangler bundles it.

// @ts-ignore -- generated at build time
import { default as handler } from "./.open-next/worker.js";
import { sendDueActivationReminders } from "./src/lib/server/activation-reminders";

export default {
  fetch: handler.fetch,

  async scheduled(_controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      sendDueActivationReminders(env).then(
        (run) => console.log(JSON.stringify({ event: "activation_reminders", ...run })),
        (error: unknown) => console.error(JSON.stringify({ event: "activation_reminders_failed", message: String(error) })),
      ),
    );
  },
};

// @ts-ignore -- generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
