"use client";

import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import dynamic from "next/dynamic";
import Head from "next/head";

// Dynamic imports for separate components
const ChatConversation = dynamic(
  () => import("@/components/dashboard/chat/chat-conversation").then(mod => ({ default: mod.ChatConversation })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    ),
    ssr: false
  }
);

const ChatInput = dynamic(
  () => import("@/components/dashboard/chat/chat-input").then(mod => ({ default: mod.ChatInput })),
  {
    loading: () => <div className="h-20 bg-gray-50 dark:bg-gray-900"></div>,
    ssr: false
  }
);

export default function ChatPage() {
  return (
    <>
      <Head>
        <title>Chat - CraCha RAG-Agent Dashboard</title>
        <meta name="description" content="Intelligente Unterhaltungen mit Ihren gecrawlten Daten durch RAG-Technologie" />
      </Head>
      <div className="h-screen flex flex-col">
        <PageBreadcrumb pageTitle="Chat" />

        {/* Chat Conversation Area - Takes remaining space */}
        <div className="flex-1 rounded-t-2xl border border-b-0 border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex flex-col overflow-hidden">
          <ChatConversation />
        </div>

        {/* Chat Input Area - Fixed at bottom */}
        <div className="rounded-b-2xl border border-t-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <ChatInput />
        </div>
      </div>
    </>
  );
}