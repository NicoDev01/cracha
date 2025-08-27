"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
// import { useScroll } from "@/hooks/use-scroll";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { ThemeToggleButton } from "@/components/dashboard/common/ThemeToggleButton";
import { Button } from "@/components/ui/button";

interface NavBarProps {
  scroll?: boolean;
  large?: boolean;
}

export function NavBar({ scroll = false }: NavBarProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    if (scroll) {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [scroll]);

  // Navigation links für CraCha
  const mainNavLinks = [
    {
      title: "Nutzung",
      href: "#how-to-use",
    },
    {
      title: "Warum CraCha?",
      href: "#why-cracha",
    },
    {
      title: "Features",
      href: "#features",
    },
    {
      title: "Jetzt loslegen",
      href: "#canvas-section",
    },
  ];

  return (
    <>
      {/* SVG Filters */}
      <svg className="absolute w-0 h-0 pointer-events-none hidden md:block">
        <defs>
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      <header
        className={`sticky top-0 z-50 w-full hidden md:flex justify-center backdrop-blur-xl transition-all ${
          scrolled ? "bg-background/60" : "bg-transparent"
        }`}
      >
        <MaxWidthWrapper className="flex h-12 md:h-14 items-center justify-between py-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo/logo.svg"
                alt="CraCha Logo"
                width={154}
                height={32}
                priority
                className="dark:hidden"
              />
              <Image
                src="/images/logo/logo-dark.svg"
                alt="CraCha Logo Dark"
                width={154}
                height={32}
                priority
                className="hidden dark:block"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-3">
              {mainNavLinks.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "inline-flex items-center h-9 px-5 rounded-full text-sm leading-none font-medium transition-colors duration-200 hover:text-foreground/80 hover:bg-foreground/10 whitespace-nowrap",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>

          {/* Hide right controls on mobile; they are provided by NavMobile */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Dark/Light Toggle */}
            <ThemeToggleButton />
            {/* Login CTA */}
            <div
            id="gooey-btn"
            className="relative flex items-center group gooey-filter"
          >
            <Link href="/dashboard" className="hidden md:block">
              <Button
                className="gap-2 px-5 z-20 relative"
                  variant="default"
                  size="sm"
                  rounded="full"
                >
                  <span>Login</span>
                </Button>
              </Link>
              {/* Decorative arrow bubble appears to the RIGHT, behind the Login button */}
              <span
                aria-hidden="true"
                role="img"
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-full ml-0 -translate-x-15 px-2.5 py-2 rounded-full bg-primary text-primary-foreground font-normal text-xs transition-transform duration-300 h-8 flex items-center justify-center z-0 group-hover:translate-x-0"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 17L17 7M17 7H7M17 7V17"
                  />
                </svg>
              </span>
            </div>
          </div>
        </MaxWidthWrapper>
      </header>
    </>
  );
}