"use client";

import Image from "next/image";

import { useTheme } from "@/components/dashboard/context/ThemeContext";

/**
 * The screenshot of the product, in the theme the visitor is actually looking
 * at.
 *
 * This used to render both screenshots and hide one with `dark:hidden`. CSS
 * decides what is painted, not what is fetched, so every visitor downloaded
 * both — 324 KB of PNG to show one picture, and the visible one was the
 * largest contentful paint. One image, and as WebP at the width it is actually
 * displayed, it is 26 KB.
 */
export default function PreviewLanding() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="mx-auto max-w-7xl mb-3 [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
      <div className="[perspective:1200px] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
        <div className="[transform:rotateX(20deg);]">
          <div className="lg:h-[44rem] relative skew-x-[.36rad] overflow-hidden rounded-3xl [mask-image:linear-gradient(to_right,black_30%,transparent_100%)]">
            <Image
              className="z-[2] relative"
              src={dark ? "/images/hero/dashboard-dark.webp" : "/images/hero/dashboard-light.webp"}
              alt="Das CraCha-Dashboard mit einer Wissensbasis und dem Chat"
              width={1400}
              height={dark ? 807 : 814}
              priority
              // The browser picks the source before layout, and this element is
              // the LCP. Without it the fetch is queued behind the fonts.
              fetchPriority="high"
              sizes="(min-width: 1024px) 1400px, 100vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
