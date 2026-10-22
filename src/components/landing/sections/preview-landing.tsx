"use client";

import { useEffect, useRef, useState } from "react";

import { useAppLocale } from "@/i18n/navigation";

/**
 * The promo film from `video/` under the hero: crawl, knowledge base, chat in
 * 33 seconds, which says more than the dashboard screenshot that sat here.
 *
 * The files in public/videos are web encodes (H.264, CRF 26, faststart, no
 * audio track): German `video/out/cracha-promo.mp4`, ~4 MB instead of 11 MB;
 * English the 20-second spot `CraCha-spot-20s.mp4`, ~2.3 MB instead of 8 MB.
 * Each poster is its film's first frame, so nothing jumps when playback starts.
 *
 * It plays muted and in a loop like an animated image. Visitors who asked for
 * reduced motion get the paused film with controls instead.
 *
 * The film is attached only once the page itself has loaded. As a plain
 * `src` it started 4 MB of download next to the page's scripts and fonts —
 * on a phone connection it took most of the bandwidth of the first seconds,
 * while the poster already shows the same first frame.
 */
const film = {
  de: {
    src: "/videos/cracha-promo.mp4?v=20260928-fire-v3",
    poster: "/videos/cracha-promo-poster.webp?v=20260928-fire-v2",
    label: "CraCha in 33 Sekunden: eine Website wird Seite für Seite gelesen und im Chat mit Quellen befragt",
  },
  en: {
    src: "/videos/cracha-promo-en.mp4?v=20261022-spot-20s",
    poster: "/videos/cracha-promo-en-poster.webp?v=20261022-spot-20s",
    label: "CraCha in 20 seconds: a website is read page by page and questioned in the chat with sources",
  },
} as const;

export default function PreviewLanding() {
  const { src: filmSrc, poster, label } = film[useAppLocale()];
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    const attach = () => setSrc(filmSrc);
    if (document.readyState === "complete") {
      attach();
      return;
    }
    window.addEventListener("load", attach, { once: true });
    return () => window.removeEventListener("load", attach);
  }, [filmSrc]);

  useEffect(() => {
    const video = ref.current;
    if (src && video && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.controls = true;
    }
  }, [src]);

  return (
    <div className="mx-auto mb-3 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl shadow-black/40 sm:rounded-3xl">
        <video
          ref={ref}
          className="block aspect-video w-full"
          src={src}
          poster={poster}
          width={1920}
          height={1080}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={label}
        />
      </div>
    </div>
  );
}
