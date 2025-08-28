"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare,
  Globe,
  Database,
  Settings,
  Zap,
  Home,
  BarChart3, // May be used for analytics dashboard
  Sparkles,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

// Navigation items
const navItems = [
  {
    title: "Chat",
    url: "/dashboard/chat",
    icon: MessageSquare,
    description: "Ask questions about your documents",
    badge: "Test",
    available: true,
  },
  {
    title: "Crawl",
    url: "/dashboard/crawl", 
    icon: Globe,
    description: "Add new content to your knowledge base",
    badge: null,
    available: true,
  },
  {
    title: "Datenbanken",
    url: "/dashboard/data",
    icon: Database,
    description: "Manage your knowledge databases",
    badge: null,
    available: true,
  },
  {
    title: "Einstellungen",
    url: "/dashboard/settings",
    icon: Settings,
    description: "Configure RAG parameters and account",
    badge: null,
    available: false,
  },
]

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-white/20 bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-xl shadow-black/5"
      {...props}
    >
      <SidebarHeader className="border-b border-white/20 p-4 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-white/20 hover:backdrop-blur-md rounded-2xl transition-all duration-300 group">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                  <Zap className="h-6 w-6 relative z-10" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles className="w-2 h-2 text-white" />
                  </div>
                </div>
                <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-base font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">CraCha</span>
                  <span className="text-xs text-gray-600/80">RAG-as-a-Service</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="p-4 bg-gradient-to-b from-white/5 to-white/10">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {/* Dashboard Home */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/dashboard"}
                  className="h-14 rounded-2xl hover:bg-white/20 hover:backdrop-blur-md transition-all duration-300 group border border-transparent hover:border-white/30"
                  tooltip="Dashboard"
                >
                  <Link href="/dashboard" className="flex items-center gap-4 px-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                      pathname === "/dashboard" 
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30" 
                        : "bg-white/20 backdrop-blur-sm text-gray-600 group-hover:bg-white/30 group-hover:text-gray-800 border border-white/20"
                    }`}>
                      <Home className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                      <span className={`text-sm font-semibold transition-colors ${
                        pathname === "/dashboard" ? "text-gray-900" : "text-gray-700 group-hover:text-gray-900"
                      }`}>Dashboard</span>
                      <span className="text-xs text-gray-500 group-hover:text-gray-600">Overview and welcome</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Navigation Items */}
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    className="h-14 rounded-2xl hover:bg-white/20 hover:backdrop-blur-md transition-all duration-300 group border border-transparent hover:border-white/30"
                    tooltip={item.title}
                  >
                    <Link href={item.available ? item.url : "#"} className={`flex items-center gap-4 px-4 ${!item.available ? 'cursor-not-allowed' : ''}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                        pathname === item.url 
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30" 
                          : item.available 
                            ? "bg-white/20 backdrop-blur-sm text-gray-600 group-hover:bg-white/30 group-hover:text-gray-800 border border-white/20"
                            : "bg-white/10 backdrop-blur-sm text-gray-400 border border-white/10"
                      }`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-1 flex-col group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold transition-colors ${
                            item.available ? "text-gray-700 group-hover:text-gray-900" : "text-gray-400"
                          }`}>
                            {item.title}
                          </span>
                          {!item.available && (
                            <Badge className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200/50 backdrop-blur-sm">
                              Soon
                            </Badge>
                          )}
                          {item.badge && (
                            <Badge className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50 backdrop-blur-sm">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <span className={`text-xs transition-colors ${
                          item.available ? "text-gray-500 group-hover:text-gray-600" : "text-gray-400"
                        }`}>
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>



        {/* Collapsed Status Indicator */}
        <div className="mt-8 hidden group-data-[collapsible=icon]:flex justify-center">
          <div className="h-3 w-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
        </div>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  )
}