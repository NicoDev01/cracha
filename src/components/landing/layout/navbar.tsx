"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { marketingNavLinks } from "@/config/site";

interface NavBarProps {
  scroll?: boolean;
  home?: boolean;
}

export function NavBar({ scroll = false, home = false }: NavBarProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (!scroll) return;
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scroll]);

  return (
    <header
      className={cn(
        "top-0 z-50 hidden w-full justify-center py-4 text-white xl:flex",
        home
          ? scrolled
            ? "fixed border-b border-white/10 bg-black/85 backdrop-blur-xl"
            : "absolute"
          : "sticky border-b border-white/10 bg-black/85 backdrop-blur-xl"
      )}
    >
      <MaxWidthWrapper large className="flex items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="CraCha Startseite">
          <Image src="/images/logo/logo-dark.svg" alt="CraCha" width={148} height={36} priority />
        </Link>
        <nav aria-label="Hauptnavigation" className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-xl">
          {marketingNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white",
                pathname === item.href && "bg-white/10 text-white"
              )}
            >
              {item.title}
            </Link>
          ))}
          <AppEntryLink
            signedOutHref="/register"
            className="ml-1 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Kostenlos starten <span aria-hidden="true">↗</span>
          </AppEntryLink>
        </nav>
        <AppEntryLink className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white">
          Login
        </AppEntryLink>
      </MaxWidthWrapper>
    </header>
  );
}