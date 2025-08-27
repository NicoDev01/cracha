"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
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

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        setOpen(false);
        
        if (href.startsWith("#")) {
            const element = document.getElementById(href.substring(1));
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
        } else {
            window.location.href = href;
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {/* Mobile Top Bar */}
            <div className={`sticky top-0 z-50 md:hidden px-4 pt-8 backdrop-blur-xl transition-all ${
                scrolled ? "bg-background/60" : "bg-transparent"
            }`}>
                {/* Logo above */}
                <div className="flex h-10 items-center justify-start">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/logo/logo.svg"
                            alt="CraCha Logo"
                            width={150}
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
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>

                    {/* Right side: Theme toggle + Login */}
                    <div className="flex items-center gap-2">
                        <ThemeToggleButton className="h-10 w-10" />
                        <Link href="/dashboard">
                            <Button
                                className="h-10 gap-2 px-4"
                                variant="default"
                                size="sm"
                                rounded="full"
                            >
                                <span>Login</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <SheetContent side="left" className="pr-0">
                <SheetHeader className="sr-only">
                    <SheetTitle>Mobile Navigation</SheetTitle>
                </SheetHeader>
                <SheetDescription className="sr-only">
                    Mobile Navigation Drawer
                </SheetDescription>
                <Link
                    href="/"
                    className="flex items-center"
                    onClick={() => setOpen(false)}
                >
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
                <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                    <div className="flex flex-col space-y-4">
                        <Link
                            href="#how-to-use"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#how-to-use" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={(e) => handleNavClick(e, "#how-to-use")}
                        >
                            Nutzung
                        </Link>
                        <Link
                            href="#why-cracha"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#why-cracha" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={(e) => handleNavClick(e, "#why-cracha")}
                        >
                            Warum CraCha?
                        </Link>
                        <Link
                            href="#features"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#features" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={(e) => handleNavClick(e, "#features")}
                        >
                            Features
                        </Link>
                        <Link
                            href="#canvas-section"
                            className={cn(
                                "py-2 font-semibold transition-colors hover:text-foreground/80",
                                pathname === "/#canvas-section" ? "text-foreground" : "text-foreground/60"
                            )}
                            onClick={(e) => handleNavClick(e, "#canvas-section")}
                        >
                            Jetzt loslegen
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}