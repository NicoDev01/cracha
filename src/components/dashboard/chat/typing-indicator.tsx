"use client"

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
      <span className="text-xs text-gray-500 ml-2">AI tippt...</span>
    </div>
  )
}