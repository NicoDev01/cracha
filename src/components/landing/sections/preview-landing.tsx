"use client";

import { useEffect, useRef } from "react";

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
 */
export default function PreviewLanding() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (video && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.controls = true;
    }
  }, []);

  return (
    <div className="mx-auto mb-3 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border bg-muted shadow-2xl shadow-indigo-500/10 sm:rounded-3xl">
        <video
          ref={ref}
          className="block aspect-video w-full"
          src="/videos/cracha-promo.mp4"
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
