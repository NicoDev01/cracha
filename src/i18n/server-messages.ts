import type { Locale } from "./routing";

/**
 * English versions of the messages API routes send to the browser.
 *
 * The routes and the server libraries behind them write their messages in
 * German, and many of them are thrown deep inside a helper that knows nothing
 * about the request. Rather than threading a locale through every helper, the
 * route translates whatever it is about to send, once, at the boundary:
 * `error: tr(locale, message)`. A message without an entry here stays German,
 * which is the safe failure — it is still a correct message.
 */
const exact: Record<string, string> = {
  // Routes
  "Authentifizierung erforderlich.": "Please sign in.",
  "Bitte bestätige die Löschung mit dem Wort LÖSCHEN.": "Please confirm the deletion with the word DELETE.",
  "Kontolöschung ist gerade nicht möglich. Bitte versuche es später erneut.": "Account deletion isn’t possible right now. Please try again later.",
  "Zu viele Versuche. Bitte warte eine Weile und versuche es dann erneut.": "Too many attempts. Please wait a while and then try again.",
  "Kontolöschung konnte nicht abgeschlossen werden. Dein Konto wurde nicht gelöscht. Bitte versuche es erneut.": "Account deletion could not be completed. Your account was not deleted. Please try again.",
  "url ist erforderlich.": "A URL is required.",
  "Bitte warte eine Minute vor der nächsten Analyse.": "Please wait a minute before the next analysis.",
  "Die Website konnte nicht analysiert werden.": "The website could not be analyzed.",
  "Crawl-Auftrag nicht gefunden.": "Crawl job not found.",
  "Crawl konnte nicht abgebrochen werden.": "The crawl could not be cancelled.",
  "Abbruch oder Guthabenfreigabe unvollständig; bitte erneut abbrechen.": "Cancellation or credit release incomplete; please cancel again.",
  "Crawl konnte nicht gestartet werden.": "The crawl could not be started.",
  "Zu viele Statusabfragen. Bitte schließe doppelte Tabs.": "Too many status requests. Please close duplicate tabs.",
  "Status vorübergehend nicht erreichbar.": "Status temporarily unavailable.",
  "Statusabfrage fehlgeschlagen.": "Status request failed.",
  "Wissensbasis nicht gefunden.": "Knowledge base not found.",
  "Re-Crawl fehlgeschlagen.": "Reading again failed.",
  "Diese Unterhaltung gibt es nicht mehr. Bitte starte einen neuen Chat.": "This conversation no longer exists. Please start a new chat.",
  "Diese Unterhaltung gehört zu einer anderen Wissensbasis. Bitte starte einen neuen Chat.": "This conversation belongs to another knowledge base. Please start a new chat.",
  "Diese Unterhaltung ist lang. Bitte starte einen neuen Chat.": "This conversation is long. Please start a new chat.",
  "Frage oder Wissensbasis-ID ist ungültig.": "Question or knowledge base ID is invalid.",
  "Diese Wissensbasis ist nicht aktiv oder wurde abgebrochen.": "This knowledge base isn’t active or was cancelled.",
  "Diese Wissensbasis enthält noch keine indexierten Seiten. Bitte starte zuerst einen Crawl.": "This knowledge base has no indexed pages yet. Please start a crawl first.",
  "Diese Wissensbasis ist noch nicht freigegeben. Warte auf den Crawl-Abschluss oder starte einen abgebrochenen Crawl erneut.": "This knowledge base isn’t released yet. Wait for the crawl to finish or restart a cancelled crawl.",
  "Zu viele Fragen in kurzer Zeit. Bitte warte einen Moment.": "Too many questions in a short time. Please wait a moment.",
  "Diese Anfrage wurde bereits verarbeitet. Prüfe deinen Chatverlauf.": "This request has already been processed. Check your chat history.",
  "Guthaben konnte nicht geprüft werden.": "Your balance could not be checked.",
  "Suche vorübergehend nicht verfügbar.": "Search temporarily unavailable.",
  "Die Antwort konnte nicht erzeugt werden.": "The answer could not be generated.",
  "Suche in der Wissensbasis fehlgeschlagen.": "Searching the knowledge base failed.",
  "Chat ist ungültig.": "Invalid chat.",
  "Zu viele Anfragen.": "Too many requests.",
  "Chat nicht gefunden.": "Chat not found.",
  "Der Chatverlauf ist gerade nicht erreichbar.": "The chat history is unavailable right now.",
  "Der Chatverlauf ist gerade nicht erreichbar. Bitte versuche es erneut.": "The chat history is unavailable right now. Please try again.",
  "Chats konnten nicht geladen werden.": "Chats could not be loaded.",
  "Bitte gib einen Namen ein.": "Please enter a name.",
  "Guthaben konnte nicht geladen werden.": "Your balance could not be loaded.",
  "Wissensbasen konnten nicht geladen werden.": "Knowledge bases could not be loaded.",
  "Name und öffentliche HTTP(S)-URL sind erforderlich.": "A name and a public HTTP(S) URL are required.",
  "Wissensbasis konnte nicht erstellt werden.": "The knowledge base could not be created.",
  "Wissensbasis wird derzeit gelöscht.": "The knowledge base is being deleted.",
  // Server libraries
  "Dein Konto wurde nicht gelöscht.": "Your account was not deleted.",
  "Zu einer deiner Zahlungen läuft noch eine Prüfung. Bitte wende dich an den Support, um dein Konto zu löschen.": "One of your payments is still under review. Please contact support to delete your account.",
  "Dein Konto konnte nicht gelöscht werden. Bitte versuche es erneut.": "Your account could not be deleted. Please try again.",
  "Tageslimit für Crawls erreicht. Bitte versuche es morgen erneut.": "Daily crawl limit reached. Please try again tomorrow.",
  "Ungültige URL.": "Invalid URL.",
  "Ungültige Crawl-URL.": "Invalid crawl URL.",
  "Wissensbasis nicht gefunden oder Zugriff verweigert.": "Knowledge base not found or access denied.",
  "Der Crawler ist gerade nicht erreichbar. Bitte versuche es in einer Minute erneut.": "The crawler is unreachable right now. Please try again in a minute.",
  "Ein Name für die Wissensbasis ist erforderlich.": "A name for the knowledge base is required.",
  "Ein Crawl läuft noch oder wartet auf seine Abrechnung. Bitte versuche es später erneut.": "A crawl is still running or waiting to be settled. Please try again later.",
  "Bitte kläre die offene Zahlung mit dem Support, bevor du einen neuen Crawl startest.": "Please resolve the open payment with support before starting a new crawl.",
  "Dein Guthaben ist wegen einer offenen Zahlungsprüfung gesperrt. Bitte kontaktiere den Support.": "Your balance is locked because of an open payment review. Please contact support.",
  "Diese Anfrage wurde bereits verarbeitet.": "This request has already been processed.",
  "Die Wissensbasis kann während eines laufenden oder noch nicht abgerechneten Crawls nicht gelöscht werden.": "The knowledge base can’t be deleted while a crawl is running or not yet settled.",
  "Löschen fehlgeschlagen.": "Deletion failed.",
  "Wissensbasis wurde gelöscht, aber die Bereinigung ist fehlgeschlagen.": "The knowledge base was deleted, but the cleanup failed.",
  "Die Antwort wurde vom Modell nicht vollständig erzeugt. Bitte grenze die Frage ein und versuche es erneut.": "The model didn’t finish the answer. Please narrow the question and try again.",
  "Das Antwortmodell hat keine gültige vollständige Antwort geliefert.": "The answer model didn’t deliver a valid complete answer.",
  "Die erzeugte Liste ließ sich nicht mit den Quellen belegen. Bitte grenze die Frage ein.": "The generated list couldn’t be backed by the sources. Please narrow the question.",
  "Die Antwort wurde abgebrochen.": "The answer was cancelled.",
  "Ich konnte in dieser Wissensbasis keine ausreichend relevanten Informationen finden.": "I couldn’t find sufficiently relevant information in this knowledge base.",
  // RAG worker, passed through by the chat and crawl routes
  "Die Wissensbasis wird derzeit gelöscht.": "The knowledge base is being deleted.",
  "Die Wissensbasis wird noch indexiert.": "The knowledge base is still being indexed.",
  "Wissensbasis wird noch indexiert.": "The knowledge base is still being indexed.",
  "Ein Crawl läuft bereits.": "A crawl is already running.",
  "Kein Zugriff auf diese Wissensbasis.": "No access to this knowledge base.",
  "Wissensbasis existiert bereits.": "The knowledge base already exists.",
  "Interner Serverfehler.": "Internal server error.",
  "Ein Indexvorgang ist unvollständig. Den ursprünglichen Vorgang erneut ausführen.": "An indexing run is incomplete. Run the original operation again.",
  // Crawler (Modal), shown in the crawl monitor
  "Seite nicht gefunden": "Page not found",
  "Zugriff verweigert": "Access denied",
  "Zu viele Anfragen, von der Website gebremst": "Too many requests, throttled by the website",
  "Fehler auf der Website": "Error on the website",
  "Durch robots.txt gesperrt": "Blocked by robots.txt",
  "Nicht erreichbar": "Unreachable",
  "Deine Wissensbasis konnte nicht fertiggestellt werden. Bitte versuche es erneut.": "Your knowledge base could not be completed. Please try again.",
  "Der Aufbau der Wissensbasis ist fehlgeschlagen. Bitte versuche es erneut.": "Building the knowledge base failed. Please try again.",
  "Der Crawler konnte nicht starten. Bitte versuche es erneut.": "The crawler could not start. Please try again.",
  "Der Crawl hat das Zeitlimit überschritten. Bitte starte ihn erneut.": "The crawl exceeded the time limit. Please start it again.",
};

const TRY_AGAIN_DE = "Bitte versuche es erneut.";
const TRY_AGAIN_EN = "Please try again.";

const patterns: Array<[RegExp, (...groups: string[]) => string]> = [
  [/^Von der Website abgelehnt \(HTTP (\d+)\)$/, (status) => `Refused by the website (HTTP ${status})`],
  [/^(\S+) hat die Seite mit HTTP (\d+) abgelehnt\. Die Website lässt sich nicht automatisiert einlesen\.$/, (host, status) => `${host} refused the page with HTTP ${status}. The website can’t be read automatically.`],
  [/^(\S+) war nicht erreichbar\. Prüfe die Adresse und versuche es erneut\.$/, (host) => `${host} was unreachable. Check the address and try again.`],
  [/^Dein Konto darf (\d+) Wissensbasen halten, und die sind angelegt\. Lösche eine, um Platz zu schaffen\.$/, (max) => `Your account can hold ${max} knowledge bases, and they all exist. Delete one to make room.`],
  [/^Dein Guthaben reicht nicht: ([\d.]+) Credits verfügbar\.(?: Benötigt werden ([\d.]+)\.)? Lade Guthaben auf, um weiterzumachen\.$/, (balance, need) => `Your balance isn’t enough: ${balance.replace(/\./g, ",")} credits available.${need ? ` ${need.replace(/\./g, ",")} needed.` : ""} Top up to continue.`],
  [/^(.*) Credits wurden erstattet\.$/, (message) => `${tr("en", message)} Credits were refunded.`],
  [/^(.*) Guthaben bitte mit Referenz (\S+) prüfen lassen\.$/, (message, reference) => `${tr("en", message)} Please have your balance checked with reference ${reference}.`],
  [new RegExp(`^(.*) ${TRY_AGAIN_DE.replace(/\./g, "\\.")}$`), (message) => `${tr("en", message)} ${TRY_AGAIN_EN}`],
  [/^Zahlungsstatus konnte nicht geprüft werden\.$/, () => "Payment status could not be checked."],
  [/^Laufende Crawls konnten nicht geprüft werden\.$/, () => "Running crawls could not be checked."],
  [/^Wissensbasen konnten nicht vollständig ermittelt werden\.$/, () => "Knowledge bases could not all be determined."],
  [/^Eine Wissensbasis konnte nicht gelöscht werden \((.*)\)$/, (detail) => `A knowledge base could not be deleted (${detail})`],
  [/^Während der Löschung wurde eine Wissensbasis oder ein Crawl gestartet\.$/, () => "A knowledge base or crawl was started during the deletion."],
];

/** The message in the request's language; German stays as it is. */
export function tr(locale: Locale, message: string): string;
export function tr(locale: Locale, message: string | undefined): string | undefined;
export function tr(locale: Locale, message: string | undefined): string | undefined {
  if (message === undefined || locale !== "en") return message;
  const direct = exact[message];
  if (direct) return direct;
  for (const [pattern, render] of patterns) {
    const match = pattern.exec(message);
    if (match) return render(...match.slice(1));
  }
  return message;
}
