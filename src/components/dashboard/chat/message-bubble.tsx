"use client"

import { useState } from "react"
import { User, Bot, ChevronDown, ChevronUp, ExternalLink, Copy, Check, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from "@/types/chat"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          message.isError 
            ? 'bg-gradient-to-br from-red-500 to-red-600' 
            : 'bg-gradient-to-br from-blue-500 to-blue-600'
        }`}>
          {message.isError ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${isUser
            ? 'bg-blue-600 text-white ml-auto'
            : message.isError
            ? 'bg-red-50 border border-red-200/50 shadow-sm'
            : 'bg-white border border-gray-200/50 shadow-sm'
            }`}
        >
          <div className="prose prose-sm max-w-none">
            {isUser ? (
              <p className="m-0 leading-relaxed text-white">
                {message.content}
              </p>
            ) : (
              <div className={`leading-relaxed prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
                message.isError ? 'text-red-800' : 'text-gray-900'
              }`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code: (props) => {
                      const { className, children, ...otherProps } = props
                      const match = /language-(\w+)/.exec(className || '')
                      const inline = !match
                      return !inline && match ? (
                        <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto">
                          <code className={className} {...otherProps}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...otherProps}>
                          {children}
                        </code>
                      )
                    },
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {message.isStreaming && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <span className="text-xs text-gray-500 ml-2">Schreibt...</span>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-2 mt-2 text-xs text-gray-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(message.timestamp)}</span>

          {!isUser && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content, message.id)}
                className="h-6 px-2 hover:bg-gray-100"
                title="Nachricht kopieren"
              >
                {copiedId === message.id ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Implement regenerate functionality
                  console.log('Regenerate message:', message.id)
                }}
                className="h-6 px-2 hover:bg-gray-100"
                title="Antwort neu generieren"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSources(!showSources)}
              className="h-6 px-2 hover:bg-gray-100"
            >
              <span className="mr-1">{message.sources.length} Quellen</span>
              {showSources ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && showSources && (
          <div className="mt-3 space-y-2">
            {message.sources.map((source) => (
              <div
                key={source.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {source.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(source.relevance_score * 100)}%
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {source.snippet}
                    </p>

                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span className="truncate max-w-[200px]">{source.url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  )
}