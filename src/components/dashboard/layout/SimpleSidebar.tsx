"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Globe, 
  Database, 
  Settings, 
  FileText,
  Users,
  BarChart3
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: "/dashboard",
  },
  {
    name: "Chat",
    icon: <MessageSquare className="w-5 h-5" />,
    path: "/dashboard/chat",
  },
  {
    name: "Crawl",
    icon: <Globe className="w-5 h-5" />,
    path: "/dashboard/crawl",
  },
  {
    name: "Data",
    icon: <Database className="w-5 h-5" />,
    path: "/dashboard/data",
  },
  {
    name: "Analytics",
    icon: <BarChart3 className="w-5 h-5" />,
    path: "/dashboard/analytics",
  },
  {
    name: "Users",
    icon: <Users className="w-5 h-5" />,
    path: "/dashboard/users",
  },
  {
    name: "Documents",
    icon: <FileText className="w-5 h-5" />,
    path: "/dashboard/documents",
  },
  {
    name: "Settings",
    icon: <Settings className="w-5 h-5" />,
    path: "/dashboard/settings",
  },
];

const SimpleSidebar: React.FC = () => {
  const { isExpanded, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const sidebarWidth = isExpanded || isHovered ? "w-[290px]" : "w-[90px]";

  return (
    <aside
      className={`fixed left-0 top-0 z-9999 flex h-screen flex-col overflow-y-hidden bg-white border-r border-gray-200 duration-300 ease-linear dark:bg-gray-900 dark:border-gray-800 lg:static lg:translate-x-0 ${sidebarWidth}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <Link href="/dashboard">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            {(isExpanded || isHovered) && (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                CraCha
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
          <div>
            <ul className="mb-6 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.path}
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        isActive
                          ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className={`${isActive ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {item.icon}
                      </div>
                      
                      {(isExpanded || isHovered) && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default SimpleSidebar;