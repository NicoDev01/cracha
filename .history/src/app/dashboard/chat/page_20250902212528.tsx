"use client";

import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import dynamic from "next/dynamic";
import Head from "next/head";

// Dynamic import to reduce bundle size
const ChatInterface = dynamic(
  () => import("@/components/dashboard/chat/chat-interface").then(mod => ({ default: mod.ChatInterface })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    ),
    ssr: false // Chat doesn't need SSR
  }
);

export default function ChatPage() {
  return (
    <>
      <Head>
        <title>Chat - CraCha RAG-Agent Dashboard</title>
        <meta name="description" content="Intelligente Unterhaltungen mit Ihren gecrawlten Daten durch RAG-Technologie" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        {/* Minimaler Breadcrumb nur für Desktop */}
        <div className="hidden lg:block flex-shrink-0 px-4 py-2">
          <PageBreadcrumb pageTitle="Chat" />
        </div>
        
        {/* Chat Interface nimmt den gesamten verfügbaren Platz */}
        <div className="flex-1 min-h-0 lg:mx-4 lg:mb-4 lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:dark:border-gray-800 lg:dark:bg-white/[0.03] overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </>
  );
}
