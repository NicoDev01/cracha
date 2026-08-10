"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A video that fetches nothing until it is about to be seen.
 *
 * An autoplaying `<video src>` starts downloading with the page. This one is
 * far below the fold and weighs 292 KB — on a phone it was still arriving after
 * twelve seconds, competing for bandwidth with the screenshot at the top that
 * the visitor is actually looking at. The source is attached once the element
 * comes within a screen's distance of the viewport.
 */
export function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Whatever happens, the video appears. Deferring it is a bandwidth
    // decision; a permanently empty frame would be a broken page. So there is
    // a timer as well as an observer, and the first one to fire wins: the
    // observer when the visitor scrolls down, the timer when they do not — or
    // when the observer never fires at all, which is exactly what a browser
    // that is not painting does.
    let done = false
    const load = () => {
      if (done) return;
      done = true;
      setVisible(true);
    };

    const timer = window.setTimeout(load, 4000);

    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src={visible ? src : undefined}
      preload="none"
      autoPlay
      loop
      muted
      playsInline
    />
  );
}
