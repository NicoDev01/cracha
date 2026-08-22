"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useHydratedChatStore } from '@/hooks/use-chat-store';
import {
  getCitedSources,
  getUncitedSources,
  linkifyCitations,
  type IndexedSource,
} from '@/lib/chat/citations';
import { answerMetaParts, FALLBACK_NOTICE } from '@/lib/chat/metadata';
import type { Message as ChatMessage } from '@/types/chat';
import { Conversation, ConversationContent, ConversationScrollButton } from './conversation';
import { DatabasePicker } from './database-picker';
import { DatabaseSelector } from './database-selector';
import { Loader } from './loader';
import { Message, MessageContent } from './message';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from './prompt-input';
import { Response } from './response';
import { Source, Sources, SourcesContent, SourcesTrigger } from './source';

// Answers are written in the language of the question, so the starter questions
// decide which language a new user lands in. The chrome stays German.
const exampleQuestions = {
  de: [
    'Fasse die wichtigsten Inhalte zusammen.',
    'Welche zentralen Funktionen werden beschrieben?',
    'Erkläre das Thema in einfachen Worten.',
  ],
  en: [
    'Summarise the most important content.',
    'Which core capabilities are described?',
    'Explain the topic in simple terms.',
  ],
};

// The browser language cannot change while the page is open, so there is
// nothing to subscribe to — but the snapshots must stay referentially stable,
// or the store would report a change on every render.
const subscribeToNothing = () => () => {};
const readServerStarters = () => exampleQuestions.de;
const readBrowserStarters = () => (navigator.language.toLowerCase().startsWith('de')
  ? exampleQuestions.de
  : exampleQuestions.en);

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

const getSourcePath = (url: string) => {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    return path === '/' ? 'Startseite' : path;
  } catch {
    return url;
  }
};

const groupSourcesByDomain = (sources: IndexedSource[]) => {
  const groups = new Map<string, IndexedSource[]>();
  sources.forEach((entry) => {
    const hostname = getHostname(entry.source.url);
    groups.set(hostname, [...(groups.get(hostname) ?? []), entry]);
  });
  return Array.from(groups, ([hostname, items]) => ({ hostname, items }));
};

const SourceRow = ({ index, source, muted = false }: IndexedSource & { muted?: boolean }) => (
  <Source
    href={source.url}
    title={source.title}
    className="rounded-none border-0 bg-transparent px-3 py-2.5 shadow-none hover:translate-y-0 hover:bg-brand-25 hover:shadow-none dark:bg-transparent dark:hover:bg-brand-500/10"
  >
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${muted
        ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
        : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}
    >
      {index}
    </span>
    <span className="min-w-0 flex-1">
      <span className={`block truncate font-medium ${muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
        {source.title}
      </span>
      <span className="mt-0.5 block truncate font-mono text-[11px] text-gray-400">{getSourcePath(source.url)}</span>
    </span>
    <ExternalLink className="mt-1 size-3.5 shrink-0 text-gray-400" />
  </Source>
);

const SourceGroup = ({ label, items, muted = false }: {
  label: string;
  items: IndexedSource[];
  muted?: boolean;
}) => (
  <div className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-800/60 ${muted
    ? 'border-dashed border-gray-200 dark:border-gray-700'
    : 'border-gray-200 dark:border-gray-700'}`}
  >
    <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      {label}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map((entry) => (
        <SourceRow key={entry.source.id} index={entry.index} source={entry.source} muted={muted} />
      ))}
    </div>
  </div>
);

export function ChatInterface() {
  const {
    messages,
    clearChat,
    selectedDatabase,
    setError,
    sendMessage,
    isLoading,
    isStreaming,
  } = useHydratedChatStore();
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // `navigator` is a browser API, not React state. Reading it through an effect
  // meant a second render on every mount; reading it during render would desync
  // the server markup. useSyncExternalStore is the one that does neither.
  const starters = useSyncExternalStore(
    subscribeToNothing,
    readBrowserStarters,
    readServerStarters,
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setError(null);
  }, [setError]);

  useEffect(() => {
    if (!isLoading && !isStreaming && selectedDatabase) inputRef.current?.focus();
  }, [isLoading, isStreaming, selectedDatabase]);

  // Announcing every streamed token would flood a screen reader, so only the
  // state transitions are spoken. The answer itself is read on demand.
  const lastMessage = messages[messages.length - 1];
  const liveStatus = isLoading
    ? 'Die Wissensbasis wird durchsucht.'
    : isStreaming
      ? 'Die Antwort wird erstellt.'
      : lastMessage?.type === 'assistant' && !lastMessage.isStreaming
        ? `Antwort fertig, ${lastMessage.sources?.length ?? 0} Quellen.`
        : '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || !selectedDatabase || isLoading || isStreaming) return;

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
      {/*
        Icon and title are hidden on a phone. Measured at 375px they left the
        knowledge base selector and the delete button so little room that the
        heading rendered 30px wide -- a truncated word saying nothing, in front
        of the one control the header exists for. The page is already named in
        the app header above it.
      */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-3 py-3 sm:px-5 dark:border-gray-800">
        <div className="hidden min-w-0 items-center gap-3 sm:flex">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-sm">
            <MessageSquare className="size-5" />
          </div>
          <h1 className="truncate font-semibold text-gray-900 dark:text-white">CraCha Chat</h1>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
          <DatabaseSelector />
          {messages.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10"
                  aria-label="Unterhaltung löschen"
                  title="Unterhaltung löschen"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unterhaltung löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {`Alle ${messages.length} Nachrichten dieser Unterhaltung werden entfernt. Das lässt sich nicht rückgängig machen.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearChat}
                    className="rounded-full bg-error-600 text-white hover:bg-error-700"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {liveStatus}
      </p>

      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-gray-25 to-white dark:from-gray-950 dark:to-gray-900">
        <Conversation className="min-h-0 flex-1 custom-scrollbar">
          <ConversationContent className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-6">
            {messages.length === 0 ? (
              selectedDatabase ? (
                /*
                 * A base is picked: no icon, no headline, no explanation — the
                 * starter chips are the message. Tapping one fills the input,
                 * so the first answer is two taps away.
                 */
                <div className="m-auto grid w-full max-w-xl gap-2 py-8 sm:grid-cols-3">
                  {starters.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => {
                        setInput(question);
                        inputRef.current?.focus();
                      }}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left text-xs leading-5 text-gray-600 shadow-theme-xs transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600 hover:shadow-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:text-brand-400"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="m-auto flex w-full max-w-md flex-col px-1 py-8">
                  <DatabasePicker />
                </div>
              )
            ) : (
              <div className="mt-auto">
                {messages.map((message) => {
                  const isUser = message.type === 'user';
                  const messageSources = message.sources ?? [];
                  const citedSources = isUser
                    ? []
                    : getCitedSources(message.content, messageSources, !message.isStreaming);
                  const uncitedSources = isUser
                    ? []
                    : getUncitedSources(messageSources, citedSources);
                  const renderedContent = isUser
                    ? message.content
                    : linkifyCitations(message.content, messageSources);
                  const metadata = !isUser && !message.isStreaming ? message.metadata : undefined;
                  const metaParts = answerMetaParts(metadata, messageSources.length);
                  return (
                    <Message
                      key={message.id}
                      from={isUser ? 'user' : 'assistant'}
                      data-model={!isUser ? message.metadata?.model_used : undefined}
                    >
                      {/*
                        The avatar costs 44px of a 375px screen and says what
                        the "CraCha" label directly under it already says, so on
                        a phone the answer gets the width instead.
                      */}
                      {!isUser && (
                        <div className={`mt-6 hidden size-8 shrink-0 items-center justify-center rounded-xl sm:flex ${message.isError ? 'bg-error-50 text-error-600 dark:bg-error-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}>
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
                          ) : message.isStreaming && !message.content ? (
                            <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Loader className="text-brand-500" />
                              Formuliere Antwort …
                            </span>
                          ) : (
                            <div>
                              <Response>{renderedContent}</Response>
                              {message.isStreaming && (
                                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse rounded-full bg-brand-500 align-middle" aria-hidden="true" />
                              )}
                            </div>
                          )}

                          {!isUser && citedSources.length > 0 && (
                            <Sources>
                              <SourcesTrigger count={citedSources.length} />
                              <SourcesContent>
                                {groupSourcesByDomain(citedSources).map((group) => (
                                  <SourceGroup key={group.hostname} label={group.hostname} items={group.items} />
                                ))}
                                {uncitedSources.length > 0 && (
                                  <SourceGroup
                                    label={`Ebenfalls durchsucht, nicht zitiert (${uncitedSources.length})`}
                                    items={uncitedSources}
                                    muted
                                  />
                                )}
                              </SourcesContent>
                            </Sources>
                          )}
                        </MessageContent>

                        {!isUser && message.content && !message.isStreaming && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(message)}
                              className="h-8 rounded-full px-3 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              aria-label="Antwort kopieren"
                            >
                              {copiedId === message.id ? <Check className="mr-1 size-3.5 text-success-600" /> : <Copy className="mr-1 size-3.5" />}
                              {copiedId === message.id ? 'Kopiert' : 'Kopieren'}
                            </Button>
                            {metadata?.fallback && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-warning-50 px-1.5 py-0.5 text-[11px] font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
                                <AlertTriangle className="size-3" aria-hidden="true" />
                                {FALLBACK_NOTICE}
                              </span>
                            )}
                            {metaParts.length > 0 && (
                              <span
                                className="text-[11px] leading-5 text-gray-400 dark:text-gray-500"
                                title={metadata?.model_used}
                              >
                                {metaParts.join(' · ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Message>
                  );
                })}

                {isLoading && (
                  <Message from="assistant">
                    <div className="mt-6 hidden size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:flex dark:bg-brand-500/10 dark:text-brand-400">
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

        <div className="shrink-0 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-5 dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto w-full max-w-5xl">
            <PromptInput onSubmit={handleSubmit} className="relative flex items-end px-4 py-3 pr-14">
              <PromptInputTextarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={selectedDatabase ? 'Frage etwas zu deiner Wissensbasis …' : 'Erst eine Wissensbasis wählen'}
                disabled={!selectedDatabase}
                className="min-h-7 px-0 py-0 pr-2"
                aria-label="Nachricht"
              />
              <PromptInputSubmit
                className="absolute bottom-2 right-2"
                disabled={!input.trim() || !selectedDatabase || isLoading || isStreaming}
                status={isLoading || isStreaming ? 'submitted' : undefined}
                aria-label="Nachricht senden"
                title="Nachricht senden"
              />
            </PromptInput>
          </div>
        </div>
      </div>
    </section>
  );
}
