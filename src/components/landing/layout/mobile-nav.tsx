"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import { Button, buttonVariants } from "@/components/ui/button";
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

export function NavMobile() {
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);


    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {/* Mobile Top Bar */}
            <div className={`sticky top-0 z-50 lg:hidden px-4 pt-8 backdrop-blur-xl transition-all ${
                scrolled ? "bg-background/60" : "bg-transparent"
            }`}>
                {/* Logo above */}
                <div className="flex h-10 items-center justify-start">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/logo/logo.svg"
                            alt="CraCha"
                            width={132}
                            height={32}
                            priority
                            className="dark:hidden"
                        />
                        <Image
                            src="/images/logo/logo-dark.svg"
                            alt="CraCha"
                            width={132}
                            height={32}
                            priority
                            className="hidden dark:block"
                        />
                    </Link>
                </div>

                {/* Below the logo: left burger, right theme + login */}
                <div className="mt-1 flex h-10 items-center justify-between">
                    {/* Burger menu trigger (left) */}
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-10 w-10 p-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            <Icons.menu className="h-6 w-6" />
                            <span className="sr-only">Menü öffnen</span>
                        </Button>
                    </SheetTrigger>

                    {/* Right side: Theme toggle, Login, primary CTA */}
                    <div className="flex items-center gap-1.5">
                        <ThemeToggleButton className="h-10 w-10" />
                        <AppEntryLink
                            className={buttonVariants({ variant: "ghost", size: "sm", rounded: "full", className: "h-10 whitespace-nowrap px-3" })}
                        >
                            Login
                        </AppEntryLink>
                        <AppEntryLink
                            signedOutHref="/register"
                            className={buttonVariants({ variant: "default", size: "sm", rounded: "full", className: "h-10 whitespace-nowrap px-4" })}
                        >
                            Kostenlos starten
                        </AppEntryLink>
                    </div>
                </div>
            </div>

            <SheetContent side="left" className="pr-0">
                <SheetHeader className="sr-only">
                    <SheetTitle>Mobile Navigation</SheetTitle>
                </SheetHeader>
                <SheetDescription className="sr-only">
                    Navigation für Mobilgeräte
                </SheetDescription>
                <Link
                    href="/"
                    className="flex items-center"
                    onClick={() => setOpen(false)}
                >
                    <Image
                        src="/images/logo/logo.svg"
                        alt="CraCha"
                        width={148}
                        height={36}
                        priority
                        className="dark:hidden"
                    />
                    <Image
                        src="/images/logo/logo-dark.svg"
                        alt="CraCha"
                        width={148}
                        height={36}
                        priority
                        className="hidden dark:block"
                    />
                </Link>
                <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                    <div className="flex flex-col space-y-4">
                        <Link
                            href="/#how-to-use"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#how-to-use" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={() => setOpen(false)}
                        >
                            Nutzung
                        </Link>
                        <Link
                            href="/#why-cracha"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#why-cracha" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={() => setOpen(false)}
                        >
                            Warum CraCha?
                        </Link>
                        <Link
                            href="/#kosten"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#kosten" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={() => setOpen(false)}
                        >
                            Kosten & Fragen
                        </Link>
                        <Link
                            href="/website-mit-ki-durchsuchen"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/website-mit-ki-durchsuchen" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={() => setOpen(false)}
                        >
                            Anleitung
                        </Link>
                        {[
                            { href: "/kundenwebsite-durchsuchen", title: "Für Agenturen" },
                            { href: "/dokumentation-durchsuchen", title: "Für Entwickler" },
                        ].map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "py-2 font-semibold transition-colors hover:text-foreground/80",
                                    pathname === item.href ? "text-foreground" : "text-foreground/60"
                                )}
                                onClick={() => setOpen(false)}
                            >
                                {item.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}