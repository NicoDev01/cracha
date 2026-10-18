import { Link } from "@/i18n/navigation";
import ReactDOM from "react-dom";
import { ArrowDown } from "lucide-react";
import { HeroStartButton } from "@/components/landing/hero-start-button";
import { bilingual } from "@/i18n/copy";
import { getAppLocale } from "@/i18n/server";

const copy = bilingual(
  {
    line1: "Frag nicht das Internet.",
    line2Start: "Frag ",
    line2Accent: "die Website.",
    intro:
      "CraCha, dein Crawl-Chat-Agent, liest Websites bis in die letzte Unterseite und beantwortet deine Fragen aus dem gesamten Inhalt: präzise, mit Quelle und auch von Seiten, die keine Suchmaschine findet.",
    howItWorks: "So funktioniert’s",
    credits: "100 Start-Credits gratis",
  },
  {
    line1: "Don’t ask the internet.",
    line2Start: "Ask ",
    line2Accent: "the website.",
    intro:
      "CraCha, your crawl-and-chat agent, reads a website down to the last subpage and answers your questions from all of it: precisely, with sources, even from pages no search engine finds.",
    howItWorks: "How it works",
    credits: "100 free credits to start",
  },
);

/**
 * The first screen sets CraCha against AI search, not against a plain chat:
 * an AI search goes out to the web for every question, CraCha has already
 * read the one website, subpage by subpage, and answers from it with a source.
 * No numbers and no limits up here — those live in the FAQ and on /preise.
 */
export default async function HeroLanding() {
  ReactDOM.preload("/images/landing-eclipse.jpg", { as: "image" });
  const t = copy[await getAppLocale()];

  return (
    <section
      style={{ backgroundImage: "url('/images/landing-eclipse.jpg')" }}
      className="relative isolate flex min-h-[630px] items-center overflow-hidden bg-black bg-cover bg-center text-white sm:min-h-[640px]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/35 to-black" />
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 pb-12 pt-44 text-center sm:px-6 sm:pb-14 sm:pt-36 lg:px-8">
        <h1 className="text-balance font-urban text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-[70px]">
          {t.line1}<br />
          {t.line2Start}<span className="text-orange-400">{t.line2Accent}</span>
        </h1>
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
          {t.intro}
        </p>
        <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <HeroStartButton />
          <Link href="#how-to-use" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {t.howItWorks}
            <ArrowDown aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <p className="text-sm text-white/60">
          {t.credits}
        </p>
      </div>
    </section>
  );
}
