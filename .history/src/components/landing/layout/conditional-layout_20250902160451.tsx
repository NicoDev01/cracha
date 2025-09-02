"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/landing/layout/navbar";
import { SiteFooter } from "@/components/landing/layout/site-footer";
import { NavMobile } from "@/components/landing/layout/mobile-nav";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  if (isDashboard) {
    // Dashboard layout - no navbar/footer
    return <main className="flex-1">{children}</main>;
  }

  // Landing page layout - with navbar/footer
  return (
    <div className="flex min-h-screen flex-col">
      <NavMobile />
      <NavBar scroll={true} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}