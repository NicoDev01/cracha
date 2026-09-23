"use client";

import { useSidebar } from "@/components/dashboard/context/SidebarContext";
import { SidebarProvider } from '@/components/dashboard/context/SidebarContext';
import { ThemeProvider, useTheme } from '@/components/dashboard/context/ThemeContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthProvider } from '@/components/providers/auth-provider';
import AppHeader from "@/components/dashboard/layout/AppHeader";
import AppSidebar from "@/components/dashboard/layout/AppSidebar";
import Backdrop from "@/components/dashboard/layout/Backdrop";
import React from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
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

// The same sonner Toaster the public site mounts, following the dashboard's own
// theme. Without it every toast the dashboard fires was silently dropped.
function DashboardToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors theme={theme} />;
}

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
        {/*
          The chat runs without the page padding on a phone. Measured at 375px,
          this padding plus the card border plus the conversation's own padding
          left the answer 266px to be read in. The other pages are lists and
          forms that want the breathing room; the chat wants the width.
        */}
        <div className={`mx-auto min-h-0 w-full max-w-7xl flex-1 md:p-6 ${isChatPage ? "overflow-hidden p-0 sm:p-4" : "overflow-y-auto p-4"}`}>
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
              <DashboardToaster />
            </SidebarProvider>
          </ThemeProvider>
        </AuthGuard>
      </AuthProvider>
    </div>
  );
}
