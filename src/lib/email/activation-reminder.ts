import { siteConfig } from "../../config/site";
import { CREDITS } from "../credit-tariff";

/**
 * The one mail CraCha sends on its own: 24 hours after sign-up, to a confirmed
 * account that has not read in a website yet (see
 * supabase/migrations/20260924100000_activation_funnel_and_reminder.sql for
 * who is due, src/lib/server/activation-reminders.ts for the sending).
 *
 * Styled like docs/email-templates/confirm-signup.html — inline CSS and tables,
 * because Gmail strips <style> and Outlook ignores flexbox. Text and links are
 * the constants below, so a wording change is an edit in this file only.
 */

const starterPages = 20;
const starterQuestions = Math.floor((CREDITS.welcome - starterPages * CREDITS.perPage) / CREDITS.perChatMessage);

const crawlUrl = `${siteConfig.url}/dashboard/crawl`;
const guideUrl = `${siteConfig.url}/website-mit-ki-durchsuchen`;
const privacyUrl = `${siteConfig.url}/datenschutz`;

const subject = `Deine ${CREDITS.welcome} Start-Credits warten noch`;
const preheader = "So liest du deine erste Website ein – mit Quellenlink zu jeder Antwort.";

const features = [
  {
    title: "Alle Unterseiten automatisch",
    text: "Du gibst eine Start-Adresse ein, CraCha findet die verlinkten Unterseiten und liest sie ein.",
  },
  {
    title: "Jede Antwort mit Quellenlink",
    text: "Du siehst, von welcher Seite eine Antwort stammt, und prüfst sie mit einem Klick im Original.",
  },
  {
    title: "Fragen auf Deutsch",
    text: "Auch wenn die Website englisch ist. Die Wissensbasis bleibt in deinem Konto.",
  },
];

const tip = `Tipp für den Start: Nimm eine Website oder einen Bereich mit etwa ${starterPages} Seiten. Dann bleiben dir noch ${starterQuestions} Fragen.`;

const footer = [
  "Du bekommst diese Erinnerung nur einmal. Möchtest du keine Hinweise dieser Art, antworte kurz auf diese E-Mail.",
  "CraCha · Nicolas Guerrero Tello · Meyerstraße 216 · 28201 Bremen",
];

export interface ReminderEmail {
  subject: string;
  html: string;
  text: string;
}

const featureRows = features
  .map(
    (feature) => `
        <tr>
          <td style="padding:0 40px 14px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" style="width:28px;padding-top:2px;">
                  <div style="width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);color:#ffffff;font-size:12px;font-weight:bold;line-height:20px;text-align:center;">&#10003;</div>
                </td>
                <td style="color:#111827;font-size:15px;line-height:1.55;">
                  <strong>${feature.title}</strong><br>
                  <span style="color:#4b5563;">${feature.text}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5fb;margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e3e8f0;border-radius:16px;">
        <tr>
          <td style="padding:40px 40px 8px 40px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);border-radius:12px;color:#ffffff;font-size:20px;font-weight:bold;text-align:center;line-height:44px;">C</td>
                <td style="padding-left:12px;color:#111827;font-size:22px;font-weight:bold;letter-spacing:-0.3px;">CraCha</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0 40px;" align="center">
            <h1 style="margin:0;color:#111827;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1.3;">Deine erste Website wartet</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 24px 40px;" align="center">
            <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.65;">
              Dein Konto ist startklar, eingelesen hast du aber noch nichts.
              Deine ${CREDITS.welcome} Start-Credits sind noch da.
            </p>
          </td>
        </tr>${featureRows}
        <tr>
          <td style="padding:10px 40px 0 40px;">
            <p style="margin:0;padding:14px 16px;background-color:#f5f3ff;border-radius:10px;color:#4c1d95;font-size:14px;line-height:1.6;">${tip}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0 40px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);border-radius:10px;">
                  <a href="${crawlUrl}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">Erste Website einlesen</a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:13px;">
              <a href="${guideUrl}" style="color:#4f46e5;text-decoration:underline;">Anleitung mit Beispielfragen</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 40px 40px;">
            <div style="height:1px;background-color:#e5e7eb;font-size:0;line-height:0;">&nbsp;</div>
            <p style="margin:20px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">${footer[0]}</p>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
        ${footer[1]}<br>
        <a href="${siteConfig.url}" style="color:#6b7280;text-decoration:none;">cracha-app.com</a> ·
        <a href="${privacyUrl}" style="color:#6b7280;text-decoration:none;">Datenschutz</a>
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;

const text = [
  "Deine erste Website wartet",
  "",
  `Dein Konto ist startklar, eingelesen hast du aber noch nichts. Deine ${CREDITS.welcome} Start-Credits sind noch da.`,
  "",
  ...features.map((feature) => `- ${feature.title}: ${feature.text}`),
  "",
  tip,
  "",
  `Erste Website einlesen: ${crawlUrl}`,
  `Anleitung mit Beispielfragen: ${guideUrl}`,
  "",
  "--",
  footer[0],
  footer[1],
  `Datenschutz: ${privacyUrl}`,
].join("\n");

export function activationReminderEmail(): ReminderEmail {
  return { subject, html, text };
}
