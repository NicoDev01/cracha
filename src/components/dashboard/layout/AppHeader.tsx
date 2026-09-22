"use client";
import { ThemeToggleButton } from "@/components/dashboard/common/ThemeToggleButton";
import UserDropdown from "@/components/dashboard/header/UserDropdown";
import { useSidebar } from "@/components/dashboard/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Menu, X } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";

const AppHeader: React.FC = () => {
  const { credits, error } = useCredits();

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };



  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-center px-3 h-18 lg:h-auto lg:justify-normal lg:px-0 lg:py-4">
          {/* Desktop: Sidebar Toggle links (nur lg), Mobile: Button unten in Reihe 2 */}
          <button
            className="hidden lg:flex items-center justify-center w-11 h-11 text-gray-500 rounded-lg border border-gray-200 dark:border-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
            onClick={handleToggle}
            aria-label="Seitenleiste umschalten"
            title="Seitenleiste umschalten"
          >
            {isMobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>

          {/* Mobile: Logo (nur lg:hidden) */}
          <Link href="/" className="lg:hidden">
            <Image
              width={154}
              height={32}
              className="dark:hidden"
              src="/images/logo/logo.svg"
              alt="Logo"
            />
            <Image
              width={154}
              height={32}
              className="hidden dark:block"
              src="/images/logo/logo-dark.svg"
              alt="Logo"
            />
          </Link>
        </div>
        <div className="flex w-full items-center justify-between px-3 py-2 lg:justify-end lg:px-0 lg:py-4">
          {/* Sidebar Toggle (links) */}
          <button
            className="flex items-center justify-center w-10 h-10 text-gray-500 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
            onClick={handleToggle}
            aria-label="Seitenleiste umschalten"
            title="Seitenleiste umschalten"
          >
            {isMobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>

          {/* Rechts: Theme, User; Notification nur auf Desktop sichtbar */}
          <div className="flex items-center gap-2 2xsm:gap-3">
            <Link href="/dashboard#guthaben" className="whitespace-nowrap rounded-full border border-gray-200 px-3 py-2 text-xs font-medium dark:border-gray-700" title="Guthaben ansehen und aufladen">
              {credits ? `${credits.balance.toLocaleString('de-DE')} Credits` : error ? 'Guthaben prüfen' : 'Guthaben'}
            </Link>
            <ThemeToggleButton className="h-10 w-10" />

            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
