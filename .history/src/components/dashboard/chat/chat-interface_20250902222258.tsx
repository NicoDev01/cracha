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
  // Map local UI status to PromptInputSubmit prop while keeping TS satisfied
  const submitStatus = status === 'idle' ? undefined : status;

  // Clear any errors when component mounts
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
    <>
      {/* Header Controls */}
      <div className="hidden lg:block flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white/90">Chat Assistant</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedDatabase ? 'Bereit für Fragen' : 'Datenbank auswählen'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DatabaseSelector />

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                className="rounded-xl border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 max-h-[75dvh] overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent className="p-2 pb-24 sm:p-4 sm:pb-6">
            {messages.length === 0 ? (
              <div className="hidden lg:flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white/90 mb-2">
                  Starte eine Unterhaltung
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
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

                    {/* Sources for assistant messages */}
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

            {/* Loading indicator */}
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

        {/* Input Area */}
        <div className="sticky bottom-0 z-50 p-3 lg:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-[0_-6px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedDatabase ? "Stelle eine Frage zu deinen Daten..." : "Wähle zuerst eine Datenbank aus"}
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
      </div>
    </>
  );
}