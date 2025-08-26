"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Settings, LogOut, Building2, BarChart3 } from "lucide-react"

export function DashboardHeader() {
  // Temporarily disable auth store for debugging
  const user = { name: "Test User", email: "test@example.com" }
  const logout = () => {}

  // Mock data - will be replaced with real data later
  const currentUsage = 1247
  const totalQueries = 10000
  const usagePercentage = Math.round((currentUsage / totalQueries) * 100)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-lg shadow-black/5">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Sidebar trigger */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-white/20 hover:backdrop-blur-md transition-all duration-300 border border-transparent hover:border-white/30" />

          {/* Mobile: Show current page title */}
          <div className="block sm:hidden">
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Dashboard</h1>
          </div>
        </div>

        {/* Right side - Tenant, Usage, User */}
        <div className="flex items-center gap-4">
          {/* Tenant Selector - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all duration-300">
            <Building2 className="h-4 w-4 text-gray-600" />
            <Select defaultValue="example-company">
              <SelectTrigger className="w-[140px] h-8 rounded-lg border-none bg-transparent hover:bg-white/20 transition-all duration-300 text-sm font-medium">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl">
                <SelectItem value="example-company" className="rounded-xl">Example Company</SelectItem>
                <SelectItem value="personal" className="rounded-xl">Personal</SelectItem>
                <SelectItem value="test-org" className="rounded-xl">Test Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usage Display - Responsive */}
          <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all duration-300">
            <BarChart3 className="h-4 w-4 text-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {currentUsage.toLocaleString()} / {totalQueries.toLocaleString()}
              </span>
              <Badge
                className={`text-xs px-2 py-1 rounded-full backdrop-blur-sm border ${
                  usagePercentage > 80 
                    ? "bg-red-100/80 text-red-700 border-red-200/50" 
                    : usagePercentage > 60 
                      ? "bg-amber-100/80 text-amber-700 border-amber-200/50"
                      : "bg-green-100/80 text-green-700 border-green-200/50"
                }`}
              >
                {usagePercentage}%
              </Badge>
            </div>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 w-auto px-3 rounded-xl hover:bg-white/20 hover:backdrop-blur-md transition-all duration-300 border border-transparent hover:border-white/30 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <span className="relative z-10">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                      {user?.name || 'User'}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 rounded-2xl shadow-2xl border border-white/20 bg-white/95 backdrop-blur-xl backdrop-saturate-150"
              align="end"
              sideOffset={12}
            >
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Mobile: Show usage here */}
              <div className="block md:hidden px-4 py-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl mx-2 border border-blue-100/50">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span className="font-medium">Usage</span>
                  <Badge className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50">
                    {currentUsage.toLocaleString()} / {totalQueries.toLocaleString()}
                  </Badge>
                </div>
              </div>

              {/* Mobile: Show tenant selector */}
              <div className="block lg:hidden px-4 py-3 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl mx-2 border border-purple-100/50">
                <div className="text-sm text-gray-700 font-medium mb-2">Tenant</div>
                <Select defaultValue="example-company">
                  <SelectTrigger className="w-full h-9 text-sm rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 hover:bg-white/70 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/20">
                    <SelectItem value="example-company" className="rounded-xl text-sm">Example Company</SelectItem>
                    <SelectItem value="personal" className="rounded-xl text-sm">Personal</SelectItem>
                    <SelectItem value="test-org" className="rounded-xl text-sm">Test Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DropdownMenuSeparator className="block md:hidden" />

              <DropdownMenuItem className="rounded-xl mx-2 cursor-pointer hover:bg-white/50 hover:backdrop-blur-sm transition-all duration-200">
                <Settings className="mr-3 h-4 w-4" />
                <span className="font-medium">Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="mx-2 bg-white/30" />

              <DropdownMenuItem
                className="rounded-xl mx-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50/80 hover:backdrop-blur-sm focus:text-red-700 focus:bg-red-50/80 transition-all duration-200"
                onClick={() => logout()}
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}