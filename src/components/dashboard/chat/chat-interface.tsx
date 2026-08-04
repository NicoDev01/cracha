"use client"

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Database,
  ExternalLink,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHydratedChatStore } from '@/hooks/use-chat-store';
import type { Message as ChatMessage } from '@/types/chat';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './conversation';
import { DatabaseSelector } from './database-selector';
import { Loader } from './loader';
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
import { Source, Sources, SourcesContent, SourcesTrigger } from './source';

const exampleQuestions = [
  'Fasse die wichtigsten Inhalte zusammen.',
  'Welche zentralen Funktionen werden beschrieben?',
  'Erkläre das Thema in einfachen Worten.',
];

const formatTime = (date: Date) => new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
}).format(date);

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export function ChatInterface() {
  const {
    messages,
    clearChat,
    selectedDatabase,
    setError,
    sendMessage,
    isLoading,
  } = useHydratedChatStore();
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setError(null);
  }, [setError]);

  useEffect(() => {
    if (!isLoading && selectedDatabase) inputRef.current?.focus();
  }, [isLoading, selectedDatabase]);

  const handleClearChat = () => {
    if (window.confirm('Möchtest du wirklich alle Nachrichten löschen?')) clearChat();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || !selectedDatabase || isLoading) return;

    setInput('');
    await sendMessage(question);
  };

  const handleCopy = async (message: ChatMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="CraCha Chat">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-sm">
            <MessageSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-semibold text-gray-900 dark:text-white">CraCha Chat</h1>
              <span className="hidden items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700 sm:inline-flex dark:bg-success-500/10 dark:text-success-400">
                <ShieldCheck className="size-3" />
                quellenbasiert
              </span>
            </div>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {selectedDatabase ? 'Bereit für Fragen an deine Wissensbasis' : 'Wähle eine Wissensbasis aus'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DatabaseSelector />
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              className="rounded-xl text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10"
              aria-label="Unterhaltung löschen"
              title="Unterhaltung löschen"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-gray-25 to-white dark:from-gray-950 dark:to-gray-900">
        <Conversation className="min-h-0 flex-1 custom-scrollbar">
          <ConversationContent className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
            {messages.length === 0 ? (
              <div className="m-auto flex w-full max-w-xl flex-col items-center py-8 text-center">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600 shadow-theme-xs dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400">
                  <Sparkles className="size-6" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Was möchtest du wissen?
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {selectedDatabase
                    ? 'Ich beantworte Fragen ausschließlich anhand der Inhalte deiner ausgewählten Wissensbasis.'
                    : 'Wähle oben eine Wissensbasis aus, um quellenbasierte Antworten zu erhalten.'}
                </p>
                {selectedDatabase && (
                  <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
                    {exampleQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => {
                          setInput(question);
                          inputRef.current?.focus();
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-xs leading-5 text-gray-600 shadow-theme-xs transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600 hover:shadow-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:text-brand-400"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-auto">
                {messages.map((message) => {
                  const isUser = message.type === 'user';
                  return (
                    <Message key={message.id} from={isUser ? 'user' : 'assistant'}>
                      {!isUser && (
                        <div className={`mt-6 flex size-8 shrink-0 items-center justify-center rounded-xl ${message.isError ? 'bg-error-50 text-error-600 dark:bg-error-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}>
                          <Bot className="size-4" />
                        </div>
                      )}
                      <div className="w-full max-w-3xl">
                        <div className={`mb-1.5 flex items-center gap-2 text-xs text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-medium text-gray-600 dark:text-gray-300">{isUser ? 'Du' : 'CraCha'}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={message.timestamp.toISOString()}>{formatTime(message.timestamp)}</time>
                        </div>
                        <MessageContent className={message.isError ? 'rounded-xl border border-error-200 bg-error-50 p-4 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300' : undefined}>
                          {isUser ? (
                            <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                          ) : (
                            <Response>{message.content}</Response>
                          )}

                          {!isUser && message.sources && message.sources.length > 0 && (
                            <Sources>
                              <SourcesTrigger count={message.sources.length} />
                              <SourcesContent>
                                {message.sources.map((source, index) => (
                                  <Source key={source.id} href={source.url} title={source.title}>
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                      {index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="flex items-center gap-1.5">
                                        <span className="truncate font-medium text-gray-800 dark:text-gray-100">{source.title}</span>
                                        <ExternalLink className="size-3 shrink-0 text-gray-400" />
                                      </span>
                                      <span className="mt-0.5 block truncate text-xs text-gray-400">{getHostname(source.url)}</span>
                                      {source.snippet && (
                                        <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-gray-500 dark:text-gray-400">{source.snippet}</span>
                                      )}
                                    </span>
                                  </Source>
                                ))}
                              </SourcesContent>
                            </Sources>
                          )}
                        </MessageContent>

                        {!isUser && message.content && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(message)}
                              className="h-8 rounded-lg px-2 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              aria-label="Antwort kopieren"
                            >
                              {copiedId === message.id ? <Check className="mr-1 size-3.5 text-success-600" /> : <Copy className="mr-1 size-3.5" />}
                              {copiedId === message.id ? 'Kopiert' : 'Kopieren'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Message>
                  );
                })}

                {isLoading && (
                  <Message from="assistant" aria-live="polite">
                    <div className="mt-6 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <Bot className="size-4" />
                    </div>
                    <div className="w-full max-w-3xl">
                      <div className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">CraCha</div>
                      <MessageContent className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-500 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                        <Loader className="text-brand-500" />
                        <span>Durchsuche die Wissensbasis und prüfe Quellen …</span>
                      </MessageContent>
                    </div>
                  </Message>
                )}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-3 border-gray-200 bg-white shadow-theme-md dark:border-gray-700 dark:bg-gray-800" />
        </Conversation>

        <div className="shrink-0 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-5 sm:py-4 dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto w-full max-w-5xl">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={selectedDatabase ? (isLoading ? 'Du kannst bereits die nächste Frage vorbereiten …' : 'Frage etwas zu deiner Wissensbasis …') : 'Wähle zuerst eine Wissensbasis aus'}
                disabled={!selectedDatabase}
                aria-label="Nachricht"
              />
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputButton variant="ghost" className="max-w-[13rem] text-xs" aria-label="Ausgewählte Wissensbasis">
                    <Database className="size-4" />
                    <span className="truncate">{selectedDatabase ? 'Wissensbasis ausgewählt' : 'Keine Wissensbasis'}</span>
                  </PromptInputButton>
                  <span className="hidden items-center gap-1 text-xs text-gray-400 md:flex">
                    <Search className="size-3.5" />
                    Hybrid Search
                  </span>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!input.trim() || !selectedDatabase || isLoading}
                  status={isLoading ? 'submitted' : undefined}
                  aria-label="Nachricht senden"
                  title="Nachricht senden"
                />
              </PromptInputToolbar>
            </PromptInput>
            <p className="mt-2 hidden text-center text-[11px] text-gray-400 sm:block">
              Enter zum Senden · Shift + Enter für eine neue Zeile · Antworten können Fehler enthalten
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
