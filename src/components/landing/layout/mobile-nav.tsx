"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ThemeToggleButton } from "@/components/dashboard/common/ThemeToggleButton";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { marketingNavLinks } from "@/config/site";

export function NavMobile({ home = false }: { home?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "top-0 z-50 flex w-full items-center justify-between px-5 py-5 text-white xl:hidden",
          home
            ? scrolled
              ? "fixed border-b border-white/10 bg-black/85 backdrop-blur-xl"
              : "absolute"
            : "sticky border-b border-white/10 bg-black/85 backdrop-blur-xl"
        )}
      >
        <Link href="/" aria-label="CraCha Startseite">
          <Image src="/images/logo/logo-dark.svg" alt="CraCha" width={132} height={32} priority />
        </Link>
        <SheetTrigger asChild>
          <Button variant="ghost" className="h-11 w-11 rounded-full border border-white/15 bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
            <Icons.menu className="h-5 w-5" />
            <span className="sr-only">Menü öffnen</span>
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent side="left" className="overflow-y-auto border-white/15 bg-black text-white">
        <SheetHeader className="sr-only">
          <SheetTitle>Mobile Navigation</SheetTitle>
          <SheetDescription>Navigation für Mobilgeräte</SheetDescription>
        </SheetHeader>
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Image src="/images/logo/logo-dark.svg" alt="CraCha" width={148} height={36} priority />
        </Link>
        <nav aria-label="Hauptnavigation" className="mt-6 flex flex-col gap-2">
          {marketingNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-3 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white",
                pathname === item.href && "bg-white/10 text-white"
              )}
              onClick={() => setOpen(false)}
            >
              {item.title}
            </Link>
          ))}
          <AppEntryLink className="rounded-full px-4 py-3 font-semibold text-white/80" onClick={() => setOpen(false)}>
            Login
          </AppEntryLink>
          <AppEntryLink
            signedOutHref="/register"
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-black"
            onClick={() => setOpen(false)}
          >
            Kostenlos starten <span aria-hidden="true">↗</span>
          </AppEntryLink>
          <ThemeToggleButton className="mt-2 text-white hover:bg-white/10 hover:text-white" />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
