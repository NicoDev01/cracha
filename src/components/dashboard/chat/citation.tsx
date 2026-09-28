'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { ExternalLink } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';
import { isOutlineSource } from '@/lib/chat/citations';
import { cleanSnippet, cleanSourceTitle, sourceLocation } from '@/lib/chat/source-display';
import { cn } from '@/lib/utils';
import type { Source } from '@/types/chat';

/** The sources of the answer being rendered, so a marker can name its page. */
export const CitationSources = createContext<Source[]>([]);

const CHIP = 'mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md bg-brand-50 px-1.5 py-0.5 align-baseline text-[0.75em] font-semibold leading-none text-brand-700 no-underline transition-colors hover:bg-brand-100 data-[state=open]:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25';

/**
 * A marker said nothing until it was clicked, and then opened the page at the
 * top. On hover it now shows which page it is and the passage the answer was
 * written from, so a claim can be checked without leaving the chat; the link
 * itself opens the page scrolled to that passage.
 */
export function CitationLink({ index, href, quote, children, className }: {
  index: number;
  href?: string;
  /** The sentence of the page that supports this marker's line, once known. */
  quote?: string;
  children: ReactNode;
  className?: string;
}) {
  const sources = useContext(CitationSources);
  const source = sources[index - 1];
  const link = (
    <a
      aria-label={source ? `Quelle ${index}: ${cleanSourceTitle(source.title, source.url)}` : `Quelle ${index} öffnen`}
      className={cn(CHIP, className)}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
  if (!source) return link;

  const outline = isOutlineSource(source);
  // The supporting sentence for this very line when the answer is finished;
  // until then, the start of the passage retrieved from the page.
  const passage = outline ? '' : quote || cleanSnippet(source.snippet, 260);
  const marksPassage = !outline && Boolean(href?.includes(':~:text='));
  return (
    <HoverCard.Root openDelay={120} closeDelay={80}>
      <HoverCard.Trigger asChild>{link}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white p-3 text-left shadow-theme-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-start gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-semibold tabular-nums text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {index}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-gray-900 dark:text-white">
                {cleanSourceTitle(source.title, source.url)}
              </p>
              <p className="truncate text-[11px] leading-4 text-gray-400 dark:text-gray-500">{sourceLocation(source.url)}</p>
            </div>
          </div>
          {passage ? (
            <>
            {quote && <p className="mt-2.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Belegstelle</p>}
            <blockquote className={`${quote ? 'mt-1' : 'mt-2.5'} border-l-2 border-brand-200 pl-2.5 text-[12px] leading-5 text-gray-600 dark:border-brand-700 dark:text-gray-300`}>
              {passage}
            </blockquote>
            </>
          ) : outline ? (
            <p className="mt-2.5 text-[12px] leading-5 text-gray-600 dark:text-gray-300">
              Liste aller indexierten Seiten der Wissensbasis, nach Bereichen gruppiert.
            </p>
          ) : null}
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            {marksPassage ? 'Seite an dieser Stelle öffnen' : 'Seite öffnen'}
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
