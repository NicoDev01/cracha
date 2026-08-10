"use client";

import { useSidebar } from "@/components/dashboard/context/SidebarContext";
import { SidebarProvider } from '@/components/dashboard/context/SidebarContext';
import { ThemeProvider } from '@/components/dashboard/context/ThemeContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthProvider } from '@/components/providers/auth-provider';
import AppHeader from "@/components/dashboard/layout/AppHeader";
import AppSidebar from "@/components/dashboard/layout/AppSidebar";
import Backdrop from "@/components/dashboard/layout/Backdrop";
import React from "react";
import { usePathname } from "next/navigation";
import { Inter, Urbanist } from "next/font/google";
import localFont from "next/font/local";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urban"
});

const calSans = localFont({
  src: "../../assets/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
  display: "swap",
});

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat";

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="h-dvh overflow-hidden xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />

      {/* Main Content Area */}
      <div className={`flex h-dvh min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        <div className={`mx-auto min-h-0 w-full max-w-7xl flex-1 p-4 md:p-6 ${isChatPage ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${inter.variable} ${urbanist.variable} ${calSans.variable} font-sans antialiased`}>
      <AuthProvider>
        <AuthGuard>
          <ThemeProvider>
            <SidebarProvider>
              <DashboardContent>{children}</DashboardContent>
            </SidebarProvider>
          </ThemeProvider>
        </AuthGuard>
      </AuthProvider>
    </div>
  );
}
