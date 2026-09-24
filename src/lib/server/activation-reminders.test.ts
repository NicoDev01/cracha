import { describe, expect, it } from "vitest";

import { activationReminderEmail } from "../email/activation-reminder";
import { sendDueActivationReminders } from "./activation-reminders";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  RESEND_API_KEY: "re_test",
};

function fakeFetch(resendStatus: (to: string) => number) {
  const finished: { p_user: string; p_sent: boolean }[] = [];
  const mails: { to: string[]; idempotencyKey: string | null }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (url.endsWith("/rpc/claim_activation_reminders")) {
      return Response.json([
        { user_id: "u1", email: "one@example.test" },
        { user_id: "u2", email: "two@example.test" },
      ]);
    }
    if (url.endsWith("/rpc/finish_activation_reminder")) {
      finished.push(body);
      return new Response(null, { status: 204 });
    }
    if (url === "https://api.resend.com/emails") {
      const headers = new Headers(init?.headers);
      mails.push({ to: body.to, idempotencyKey: headers.get("Idempotency-Key") });
      return Response.json({ id: "mail" }, { status: resendStatus(body.to[0]) });
    }
    throw new Error(`unexpected request ${url}`);
  }) as typeof fetch;
  return { impl, finished, mails };
}

describe("sendDueActivationReminders", () => {
  it("does nothing without a Resend key", async () => {
    const { impl, mails } = fakeFetch(() => 200);
    const run = await sendDueActivationReminders({ ...env, RESEND_API_KEY: undefined }, impl);
    expect(run).toEqual({ configured: false, sent: 0, failed: 0 });
    expect(mails).toHaveLength(0);
  });

  it("sends each claimed account one mail and gives failed claims back", async () => {
    const { impl, finished, mails } = fakeFetch((to) => (to === "two@example.test" ? 500 : 200));
    const run = await sendDueActivationReminders(env, impl);
    expect(run).toEqual({ configured: true, sent: 1, failed: 1 });
    expect(mails.map((mail) => mail.to)).toEqual([["one@example.test"], ["two@example.test"]]);
    expect(mails[0].idempotencyKey).toBe("activation-reminder-u1");
    expect(finished).toEqual([
      { p_user: "u1", p_sent: true },
      { p_user: "u2", p_sent: false },
    ]);
  });
});

describe("activationReminderEmail", () => {
  it("links to the crawl page and says it is sent once", () => {
    const email = activationReminderEmail();
    expect(email.subject).toBe("Deine 100 Start-Credits warten noch");
    expect(email.html).toContain("https://cracha-app.com/dashboard/crawl");
    expect(email.text).toContain("nur einmal");
    // 20 pages at 1 credit leave 80 credits, 16 answers at 5.
    expect(email.text).toContain("16 Fragen");
  });
});
