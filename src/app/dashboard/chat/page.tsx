import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import { ClientOnly } from "@/components/client-only";
import { Metadata } from "next";
import { ChatInterface } from "@/components/dashboard/chat/chat-interface";

export const metadata: Metadata = {
  title: "Chat - CraCha RAG-Agent Dashboard",
  description: "Intelligente Unterhaltungen mit Ihren gecrawlten Daten durch RAG-Technologie",
};

export default function ChatPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Chat" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex flex-col">
        <ClientOnly fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        }>
          <ChatInterface />
        </ClientOnly>
      </div>
    </div>
  );
}