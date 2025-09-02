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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Mobile Header - ultra kompakt */}
      <div className="flex-shrink-0 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium">Chat</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="lg:hidden">
              <DatabaseSelector />
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearChat} className="h-7 w-7 p-0">
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800 dark:text-white/90">Chat Assistant</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedDatabase ? 'Bereit für Fragen' : 'Datenbank auswählen'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DatabaseSelector />
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearChat}>
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area - maximaler verfügbarer Platz */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Conversation className="flex-1 min-h-0 overflow-hidden">
          <ConversationContent className="p-2 lg:p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2 lg:mb-4">
                  <MessageSquare className="w-4 h-4 lg:w-6 lg:h-6 text-gray-400" />
                </div>
                <h3 className="text-sm lg:text-base font-medium text-gray-900 dark:text-white/90 mb-1 lg:mb-2">
                  Starte eine Unterhaltung
                </h3>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                  {selectedDatabase ? 'Stelle eine Frage.' : 'Datenbank wählen.'}
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
                            <Source key={source.id} href={source.url} title={source.title}>
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

        {/* Input Area - fest am Boden */}
        <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-inset-bottom">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedDatabase ? "Frage..." : "DB wählen"}
              disabled={!selectedDatabase}
              className="p-2 text-sm min-h-[36px] max-h-[72px] resize-none"
            />
            <PromptInputToolbar className="p-1">
              <PromptInputTools>
                {selectedDatabase && (
                  <PromptInputButton variant="ghost" className="text-xs h-6 px-2">
                    <Database className="w-3 h-3 mr-1" />
                    <span className="truncate max-w-[60px]">{selectedDatabase}</span>
                  </PromptInputButton>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!input.trim() || !selectedDatabase}
                status={submitStatus}
                className="h-7 w-7"
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
