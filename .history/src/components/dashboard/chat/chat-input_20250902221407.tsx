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
  const {
    selectedDatabase,
    setError,
    sendMessage
  } = useHydratedChatStore();

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  // Map local UI status to PromptInputSubmit prop while keeping TS satisfied
  const submitStatus = status === 'idle' ? undefined : status;

  // Clear any errors when component mounts
  useEffect(() => {
    setError(null);
  }, [setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !selectedDatabase) return;

    try {
      setStatus('submitted');
      await sendMessage(input.trim());
      setInput('');
      setStatus('idle');
    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('error');
    }
  };

  return (
    <div className="h-full flex items-center p-2 lg:p-3 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_-6px_12px_rgba(0,0,0,0.04)]">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedDatabase ? "Stelle eine Frage zu den Daten..." : "Wähle zuerst eine Datenbank aus"}
          disabled={!selectedDatabase}
          className="p-2 sm:p-3"
        />
        <PromptInputToolbar>
          <PromptInputTools>
            {/* Mobile: echter Dropdown-Selector links im Toolbar */}
            <div className="lg:hidden">
              <DatabaseSelector />
            </div>
            {/* Desktop: alter Info-Button beibehalten */}
            <div className="hidden lg:block">
              <PromptInputButton variant="ghost">
                <Database className="w-4 h-4" />
                {selectedDatabase || 'Keine DB'}
              </PromptInputButton>
            </div>
          </PromptInputTools>

          <PromptInputSubmit
            disabled={!input.trim() || !selectedDatabase}
            status={submitStatus}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}