"use client"

import { useEffect, useRef } from "react"
import { MessageSquare, Sparkles } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import { useHydratedChatStore } from "@/hooks/use-chat-store"

export function MessageList() {
  const { messages, selectedDatabase } = useHydratedChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!selectedDatabase) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Bereit zum Chatten
          </h3>
          
          <p className="text-gray-600 mb-4">
            Wähle eine Datenbank aus dem Dropdown oben rechts aus, um mit deinen Dokumenten zu chatten.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Beispiel-Fragen:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• &ldquo;Wie installiere ich Python?&rdquo;</li>
              <li>• &ldquo;Was sind die wichtigsten Features?&rdquo;</li>
              <li>• &ldquo;Zeige mir ein Beispiel für...&rdquo;</li>
              <li>• &ldquo;Erkläre mir den Unterschied zwischen...&rdquo;</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-green-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Starte eine Unterhaltung
          </h3>
          
          <p className="text-gray-600 mb-4">
            Stelle deine erste Frage zu den Dokumenten in der ausgewählten Datenbank.
          </p>
          
          <div className="bg-green-50 rounded-lg p-4 text-left">
            <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Tipps für bessere Antworten:
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Stelle spezifische Fragen</li>
              <li>• Verwende Schlüsselwörter aus den Dokumenten</li>
              <li>• Frage nach Beispielen oder Erklärungen</li>
              <li>• Nutze Kontext aus vorherigen Antworten</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto py-4"
    >
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}