"use client"

import { useState, useEffect } from 'react';
import { MessageSquare, Database, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

// AI Elements Imports
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './conversation';
import { Message, MessageContent } from './message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from './prompt-input';
import { Response } from './response';
import { DatabaseSelector } from "./database-selector";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from './source';
import { Loader } from './loader';

// Store Imports
import { useHydratedChatStore } from "@/hooks/use-chat-store";

export function ChatInterface() {
  const {
    messages,
    clearChat,
    selectedDatabase,
    setError,
    sendMessage,
    isLoading
  } = useHydratedChatStore();

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const submitStatus = status === 'idle' ? undefined : status;

  useEffect(() => {
    setError(null);
  }, [setError]);

  const handleClearChat = () => {
    if (window.confirm('Möchtest du wirklich alle Nachrichten löschen?')) {
      clearChat();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedDatabase || isLoading) return;

    setStatus('submitted');
    try {
      await sendMessage(input.trim());
      setInput('');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[100vh] lg:max-h-[100dvh] overflow-hidden">
      {/* Mobile-optimized Header */}
      <div className="flex-shrink-0 p-3 lg:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h4 className="font-semibold text-gray-800 dark:text-white/90 text-sm lg:text-base">Chat Assistant</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedDatabase ? 'Bereit für Fragen' : 'Datenbank auswählen'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Database Selector */}
            <div className="lg:hidden">
              <DatabaseSelector />
            </div>
            
            {/* Desktop Database Selector */}
            <div className="hidden lg:block">
              <DatabaseSelector />
            </div>

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                className="rounded-xl border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 p-2 lg:px-3"
              >
                <Trash2 className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Löschen</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages Area - Mobile optimized */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="p-2 lg:p-4 pb-2 lg:pb-6 h-full overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 lg:py-12 text-center px-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
                </div>
                <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-white/90 mb-2">
                  Starte eine Unterhaltung
                </h3>
                <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 max-w-md">
                  {selectedDatabase
                    ? 'Stelle eine Frage zu deinen gecrawlten Daten und erhalte präzise Antworten.'
                    : 'Wähle zuerst eine Datenbank aus, um mit dem Chat zu beginnen.'
                  }
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <Message key={message.id} from={message.type === 'user' ? 'user' : 'assistant'}>
                  <MessageContent>
                    <Response>{message.content}</Response>

                    {message.type === 'assistant' && message.sources && message.sources.length > 0 && (
                      <Sources>
                        <SourcesTrigger count={message.sources.length} />
                        <SourcesContent>
                          {message.sources.map((source) => (
                            <Source
                              key={source.id}
                              href={source.url}
                              title={source.title}
                            >
                              {source.snippet}
                            </Source>
                          ))}
                        </SourcesContent>
                      </Sources>
                    )}
                  </MessageContent>
                </Message>
              ))
            )}

            {isLoading && (
              <Message from="assistant">
                <MessageContent>
                  <Loader />
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Mobile-optimized Input Area */}
        <div className="flex-shrink-0 sticky bottom-0 z-50 p-3 lg:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedDatabase ? "Stelle eine Frage..." : "Wähle zuerst eine Datenbank aus"}
              disabled={!selectedDatabase}
              className="p-3 text-base lg:text-sm min-h-[44px] lg:min-h-[40px]"
            />
            <PromptInputToolbar className="p-2 lg:p-1">
              <PromptInputTools>
                {/* Mobile: Show database info */}
                <div className="lg:hidden">
                  {selectedDatabase && (
                    <PromptInputButton variant="ghost" className="text-xs">
                      <Database className="w-3 h-3 mr-1" />
                      {selectedDatabase.slice(0, 10)}...
                    </PromptInputButton>
                  )}
                </div>
                {/* Desktop: Show full database name */}
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
                className="h-10 w-10 lg:h-8 lg:w-8"
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
