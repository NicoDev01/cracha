import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Globe, Database, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard - CraCha RAG-Agent",
  description: "Intelligente Wissensspeicher durch RAG-Technologie - Dashboard Übersicht",
};

export default function DashboardPage() {
  const quickActions = [
    {
      title: "Chat starten",
      description: "Stelle Fragen zu deinen Dokumenten",
      icon: MessageSquare,
      href: "/dashboard/chat",
      color: "blue",
      available: true,
      badge: "Aktiv"
    },
    {
      title: "Website crawlen",
      description: "Neue Inhalte zur Wissensbasis hinzufügen",
      icon: Globe,
      href: "/dashboard/crawl",
      color: "green",
      available: true,
      badge: " Aktiv"
    },
    {
      title: "Datenbanken verwalten",
      description: "Wissensdatenbanken organisieren",
      icon: Database,
      href: "/dashboard/data",
      color: "purple",
      available: true,
      badge: "Aktiv"
    }
  ]


  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "from-blue-500 to-blue-600",
        shadow: "shadow-blue-500/25 group-hover:shadow-blue-500/40",
        border: "hover:border-blue-200",
        shadowHover: "hover:shadow-blue-500/10",
        text: "group-hover:text-blue-600"
      },
      green: {
        bg: "from-green-500 to-green-600",
        shadow: "shadow-green-500/25 group-hover:shadow-green-500/40",
        border: "hover:border-green-200",
        shadowHover: "hover:shadow-green-500/10",
        text: "group-hover:text-green-600"
      },
      purple: {
        bg: "from-purple-500 to-purple-600",
        shadow: "shadow-purple-500/25 group-hover:shadow-purple-500/40",
        border: "hover:border-purple-200",
        shadowHover: "hover:shadow-purple-500/10",
        text: "group-hover:text-purple-600"
      }
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Dashboard" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Welcome Section - Full width */}
        <div className="col-span-12">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 rounded-3xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-white/90 bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Willkommen bei CraCha
                  </h1>
                  <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">
                    Deine intelligente RAG-as-a-Service Plattform für dokumentenbasierte KI-Antworten
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    System Online
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    Free Plan
                  </div>
                </div>
              </div>

              <div className="hidden md:block flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-700 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/10"></div>
                  <Zap className="w-8 h-8 text-white relative z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => {
              const colors = getColorClasses(action.color)
              const ActionIcon = action.icon

              return (
                <Link
                  key={action.title}
                  href={action.available ? action.href : "#"}
                  className={`group bg-white dark:bg-white/[0.03] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 ${colors.border} hover:shadow-lg ${colors.shadowHover} transition-all duration-300 ${action.available ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                    }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-11 h-11 bg-gradient-to-br ${colors.bg} rounded-xl flex items-center justify-center text-white shadow-lg ${colors.shadow} transition-all duration-300`}>
                      <ActionIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-gray-800 dark:text-white/90 ${colors.text} transition-colors text-base`}>
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full inline-block ${action.available
                    ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-700/50"
                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-700/50"
                    }`}>
                    {action.badge}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>


      </div>
    </div>
  );
}