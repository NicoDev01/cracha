"use client";

import dynamic from "next/dynamic";

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
    <div className="h-full min-h-0 overflow-hidden bg-white shadow-theme-xs sm:rounded-2xl sm:border sm:border-gray-200 dark:bg-gray-900 dark:sm:border-gray-800">
      <ChatInterface />
    </div>
  );
}
