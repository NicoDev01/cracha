import Link from "next/link";
import ReactDOM from "react-dom";
import { HeroStartButton } from "@/components/landing/hero-start-button";

/**
 * The first screen has to say what happens, not hint at it: CraCha crawls
 * every subpage itself, turns them into a knowledge base, and you chat with it.
 * Only that core. Start URL and source links are details the video and the
 * sections below show; in the first lines they confused more than they told.
 */
export default function HeroLanding() {
  ReactDOM.preload("/images/landing-eclipse.jpg", { as: "image" });

  return (
    <section
      style={{ backgroundImage: "url('/images/landing-eclipse.jpg')" }}
      className="relative isolate flex min-h-[630px] items-center overflow-hidden bg-black bg-cover bg-center text-white sm:min-h-[640px]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/35 to-black" />
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 pb-12 pt-44 text-center sm:px-6 sm:pb-14 sm:pt-36 lg:px-8">
        <h1 className="text-balance font-urban text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-[70px]">
          Verwandle jede Website<br />
          in eine <span className="text-orange-400">Wissensbasis</span>
        </h1>
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
          CraCha crawlt jede Website bis in die letzte Unterseite und macht daraus deine
          Wissensbasis. Dann fragst du einfach im Chat und bekommst Antworten aus dem gesamten
          Inhalt.
        </p>
        <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <HeroStartButton />
          <Link href="#how-to-use" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            So funktioniert’s
            <span aria-hidden="true">▷</span>
          </Link>
        </div>
        <p className="text-sm text-white/60">
          100 Start-Credits gratis
        </p>
      </div>
    </section>
  );
}
