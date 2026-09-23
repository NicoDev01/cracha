"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The promo film from `video/` under the hero: crawl, knowledge base, chat in
 * 33 seconds, which says more than the dashboard screenshot that sat here.
 *
 * The file in public/videos is a web encode of `video/out/cracha-promo.mp4`
 * (H.264, CRF 26, faststart, no audio track), ~4 MB instead of 11 MB. The
 * poster is its first frame, so nothing jumps when playback starts.
 *
 * It plays muted and in a loop like an animated image. Visitors who asked for
 * reduced motion get the paused film with controls instead.
 *
 * The film is attached only once the page itself has loaded. As a plain
 * `src` it started 4 MB of download next to the page's scripts and fonts —
 * on a phone connection it took most of the bandwidth of the first seconds,
 * while the poster already shows the same first frame.
 */
export default function PreviewLanding() {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    const attach = () => setSrc("/videos/cracha-promo.mp4");
    if (document.readyState === "complete") {
      attach();
      return;
    }
    window.addEventListener("load", attach, { once: true });
    return () => window.removeEventListener("load", attach);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (src && video && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.controls = true;
    }
  }, [src]);

  return (
    <div className="mx-auto mb-3 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border bg-muted shadow-2xl shadow-indigo-500/10 sm:rounded-3xl">
        <video
          ref={ref}
          className="block aspect-video w-full"
          src={src}
          poster="/videos/cracha-promo-poster.webp"
          width={1920}
          height={1080}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="CraCha in 33 Sekunden: eine Website wird gecrawlt, zur Wissensbasis und im Chat mit Quellen befragt"
        />
      </div>
    </div>
  );
}
