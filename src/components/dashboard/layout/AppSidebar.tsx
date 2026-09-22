"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Ellipsis, Globe, LayoutDashboard, Library, MessagesSquare, type LucideIcon } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: LucideIcon;
  path: string;
};

// One lucide set for the whole shell: the old TailAdmin glyphs mixed filled and
// outlined styles, and a folder or a table said nothing about crawling a
// website or holding knowledge bases.
const navItems: NavItem[] = [
  { icon: LayoutDashboard, name: "Übersicht", path: "/dashboard" },
  { icon: MessagesSquare, name: "Chat", path: "/dashboard/chat" },
  { icon: Globe, name: "Website einlesen", path: "/dashboard/crawl" },
  { icon: Library, name: "Wissensbasen", path: "/dashboard/data" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const showLabels = isExpanded || isHovered || isMobileOpen;

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => {
        const active = nav.path === pathname;
        const Icon = nav.icon;
        return (
          <li key={nav.name}>
            <Link
              href={nav.path}
              // Every dashboard route renders dynamically behind auth, and
              // Next does not cache prefetches of dynamic routes. Prefetching
              // them re-ran a full server render per link on every re-render,
              // which is what exhausted the Worker CPU budget during a crawl.
              prefetch={false}
              aria-current={active ? "page" : undefined}
              title={showLabels ? undefined : nav.name}
              className={`menu-item group ${active ? "menu-item-active" : "menu-item-inactive"}`}
            >
              <span className={active ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
              </span>
              {showLabels && <span className="menu-item-text">{nav.name}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-29 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`hidden lg:flex py-8 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {showLabels ? "Navigation" : <Ellipsis className="size-6" aria-hidden="true" />}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>

      </div>
    </aside>
  );
};

export default AppSidebar;
