import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn("border-t bg-background", className)}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-14 sm:px-6 md:grid-cols-5 lg:px-8">
        <div className="col-span-full flex flex-col items-start gap-6 md:col-span-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo/logo.svg"
              alt="CraCha Logo"
              width={150}
              height={150}
              className="dark:hidden"
            />
            <Image
              src="/images/logo/logo-dark.svg"
              alt="CraCha Logo"
              width={150}
              height={150}
              className="hidden dark:block"
            />
          </Link>
        </div>
        <div>
          <Link href="/home" className="text-sm font-medium text-foreground transition-colors hover:text-foreground">Home</Link>
          <ul className="mt-4 list-none space-y-3">
            <li>
              <Link href="#how-to-use" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Nutzung
              </Link>
            </li>
            <li>
              <Link href="#why-cracha" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Warum CraCha?
              </Link>
            </li>
            <li>
              <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="#canvas-section" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Jetzt loslegen
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-foreground transition-colors hover:text-foreground">Dashboard</Link>
          <ul className="mt-4 list-none space-y-3">
            <li>
              <Link href="/dashboard/chat" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Chat
              </Link>
            </li>
            <li>
              <Link href="/dashboard/crawl" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Crawl
              </Link>
            </li>
            <li>
              <Link href="/dashboard/data" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Datenbanken
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">Rechtliches</span>
          <ul className="mt-4 list-none space-y-3">
            <li>
              <Link href="/impressum" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Impressum
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Datenschutz
              </Link>
            </li>
            <li>
              <Link href="/nutzungsbedingungen" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Nutzungsbedingungen
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}