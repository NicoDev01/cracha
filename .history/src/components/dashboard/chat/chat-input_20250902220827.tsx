"use client"

import { useState, useEffect } from 'react';
import { Database } from 'lucide-react';

// AI Elements Imports
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from './prompt-input';
import { DatabaseSelector } from "./database-selector";

// Store Imports
import { useHydratedChatStore } from "@/hooks/use-chat-store";

export function ChatInput() {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, isLoading, selectedDatabase, error } = useHydratedChatStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading || !selectedDatabase) return
    
    const message = input.trim()
    setInput("")
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  useEffect(() => {
    // Focus input when database is selected
    if (selectedDatabase && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [selectedDatabase])

  const canSend = input.trim() && !isLoading && selectedDatabase

  return (
    <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
      <div className="py-4">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {!selectedDatabase && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Bitte wähle zuerst eine Datenbank aus, um zu chatten.</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedDatabase 
                  ? "Stelle eine Frage zu den Dokumenten..." 
                  : "Starte eine Unterhaltung eine Datenbank aus..."
              }
              disabled={!selectedDatabase || isLoading}
              className="min-h-[44px] max-h-[120px] resize-none bg-white/90 border-gray-200/50 focus:border-blue-300 focus:ring-blue-200/50 placeholder:text-gray-400 rounded-xl"
              rows={1}
            />
          </div>
          
          <Button
            type="submit"
            disabled={!canSend}
            className="h-11 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> zum Senden, 
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs ml-1">Shift + Enter</kbd> für neue Zeile
        </div>
      </div>
    </div>
  )
}