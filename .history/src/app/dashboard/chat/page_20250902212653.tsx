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
      </Head>
      <div>
        <PageBreadcrumb pageTitle="Chat" />
        <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex flex-col">
          <ChatInterface />
        </div>
      </div>
    </>
  );
}