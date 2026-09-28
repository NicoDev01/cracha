import { siteConfig } from "../../config/site";
import { CREDITS } from "../credit-tariff";

/**
 * The one mail CraCha sends on its own: 24 hours after sign-up, to a confirmed
 * account that has not crawled a website yet (see
 * supabase/migrations/20260924100000_activation_funnel_and_reminder.sql for
 * who is due, src/lib/server/activation-reminders.ts for the sending).
 *
 * Same look as docs/email-templates/confirm-signup.html — light, the wordmark
 * as PNG (mail clients do not show SVG), one brand-blue button, inline CSS and
 * tables, because Gmail strips <style> and Outlook ignores flexbox. Text and
 * links are the constants below, so a wording change is an edit in this file only.
 */

const starterPages = 20;
const starterQuestions = Math.floor((CREDITS.welcome - starterPages * CREDITS.perPage) / CREDITS.perChatMessage);

const crawlUrl = `${siteConfig.url}/dashboard/crawl`;
const guideUrl = `${siteConfig.url}/website-mit-ki-durchsuchen`;
const privacyUrl = `${siteConfig.url}/datenschutz`;
const logoUrl = `${siteConfig.url}/images/logo/logo-email.png?v=2`;

const subject = `Deine ${CREDITS.welcome} Start-Credits warten noch`;
const heading = "Deine erste Website wartet";
const body = `Deine ${CREDITS.welcome} Start-Credits sind noch da. Starte mit etwa ${starterPages} Seiten, dann bleiben dir ${starterQuestions} Fragen.`;
const button = "Erste Website crawlen";
const guide = "Anleitung mit Beispielfragen";

const footer = [
  "Diese Erinnerung kommt nur einmal. Keine Hinweise mehr? Antworte kurz auf diese E-Mail.",
  "CraCha · Nicolas Guerrero Tello · Meyerstraße 216 · 28201 Bremen",
];

export interface ReminderEmail {
  subject: string;
  html: string;
  text: string;
}

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f7ff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${body}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f7ff;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td align="center" style="padding:0 0 24px 0;">
            <a href="${siteConfig.url}" style="text-decoration:none;"><img src="${logoUrl}" width="144" height="35" alt="CraCha" style="display:block;border:0;width:144px;height:35px;"></a>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border:1px solid #e4e7ec;border-radius:16px;padding:40px 36px;" align="center">
            <h1 style="margin:0;color:#101828;font-size:22px;font-weight:600;line-height:1.35;">${heading}</h1>
            <p style="margin:12px 0 0 0;color:#667085;font-size:15px;line-height:1.6;">${body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0 auto;">
              <tr>
                <td style="background-color:#465fff;border-radius:10px;">
                  <a href="${crawlUrl}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${button}</a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:13px;">
              <a href="${guideUrl}" style="color:#465fff;text-decoration:underline;">${guide}</a>
            </p>
            <p style="margin:28px 0 0 0;color:#98a2b3;font-size:13px;line-height:1.6;">${footer[0]}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 0 0 0;color:#98a2b3;font-size:12px;line-height:1.6;">
            ${footer[1]}<br>
            <a href="${siteConfig.url}" style="color:#98a2b3;text-decoration:underline;">cracha-app.com</a> ·
            <a href="${privacyUrl}" style="color:#98a2b3;text-decoration:underline;">Datenschutz</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const text = [
  heading,
  "",
  body,
  "",
  `${button}: ${crawlUrl}`,
  `${guide}: ${guideUrl}`,
  "",
  "--",
  footer[0],
  footer[1],
  `Datenschutz: ${privacyUrl}`,
].join("\n");

export function activationReminderEmail(): ReminderEmail {
  return { subject, html, text };
}
