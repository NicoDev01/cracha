'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { ExternalLink, MousePointerClick } from 'lucide-react';
import { createContext, useContext, useState, type MouseEvent, type ReactNode } from 'react';
import { isOutlineSource } from '@/lib/chat/citations';
import { cleanSnippet, cleanSourceTitle, sourceLocation } from '@/lib/chat/source-display';
import { cn } from '@/lib/utils';
import type { CitationAnchor, Source } from '@/types/chat';

/** What a marker in the answer being rendered can say about itself. */
export interface CitationContextValue {
  sources: Source[];
  /** Per `line:n`, where on page n the line is supported. */
  anchors?: Record<string, CitationAnchor>;
  /** The answer's lines, so a card can mark what its line shares with the page. */
  lines?: string[];
}

export const CitationSources = createContext<CitationContextValue>({ sources: [] });

const CHIP = 'mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md bg-brand-50 px-1.5 py-0.5 align-baseline text-[0.75em] font-semibold leading-none text-brand-700 no-underline transition-colors hover:bg-brand-100 data-[state=open]:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25';

function normalize(word: string): string {
  return word.toLocaleLowerCase('de')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/^\p{N}+(?=\p{L})/u, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

/**
 * The quote with the words it shares with the answer's line marked, so the eye
 * finds the part that carries the claim — a name, a number, a product.
 */
function MarkedQuote({ quote, line }: { quote: string; line?: string }) {
  const claim = new Set((line ?? '').replace(/\[[\d,\s]+\]\([^)]*\)|\[\d+\]/g, ' ').split(/\s+/).map(normalize)
    .filter((word) => word.length >= 4 || /^\d+$/.test(word)));
  if (!claim.size) return <>{quote}</>;
  return (
    <>
      {quote.split(/(\s+)/).map((part, index) => {
        const word = normalize(part);
        const glued = /^\p{N}+(?=\p{L})/u.exec(part)?.[0];
        const hit = word && (claim.has(word) || (glued !== undefined && claim.has(glued)));
        return hit
          ? <mark key={index} className="rounded-sm bg-brand-100 px-0.5 text-inherit dark:bg-brand-500/25">{part}</mark>
          : <span key={index}>{part}</span>;
      })}
    </>
  );
}

/**
 * A marker said nothing until it was clicked, and then opened the page at the
 * top. Its card now names the page, the section and the sentence the line was
 * taken from, with the shared words marked, so a claim can be checked without
 * leaving the chat. "An der Stelle öffnen" opens the page with that sentence
 * highlighted. On a touch screen, which has no hover, the first tap opens the
 * card and the link inside it opens the page.
 */
export function CitationLink({ index, href, anchorKey, children, className }: {
  index: number;
  href?: string;
  /** `line:n` of this marker's anchor, once the answer is complete. */
  anchorKey?: string;
  children: ReactNode;
  className?: string;
}) {
  const { sources, anchors, lines } = useContext(CitationSources);
  const [open, setOpen] = useState(false);
  const source = sources[index - 1];
  const anchor = anchorKey ? anchors?.[anchorKey] : undefined;
  const line = anchorKey ? lines?.[Number(anchorKey.split(':')[0])] : undefined;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (open || typeof window === 'undefined' || !window.matchMedia?.('(hover: none)').matches) return;
    event.preventDefault();
    setOpen(true);
  };

  const link = (
    <a
      aria-label={source ? `Quelle ${index}: ${cleanSourceTitle(source.title, source.url)}` : `Quelle ${index} öffnen`}
      className={cn(CHIP, className)}
      href={href}
      rel="noreferrer"
      target="_blank"
      onClick={source ? onClick : undefined}
    >
      {children}
    </a>
  );
  if (!source) return link;

  const outline = isOutlineSource(source);
  const quote = outline ? '' : anchor?.quote ?? cleanSnippet(source.snippet, 260);
  const marksPassage = !outline && Boolean(href?.includes(':~:text='));
  return (
    <HoverCard.Root open={open} onOpenChange={setOpen} openDelay={120} closeDelay={120}>
      <HoverCard.Trigger asChild>{link}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-theme-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-start gap-2.5 px-3.5 pt-3">
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-semibold tabular-nums text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {index}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-gray-900 dark:text-white">
                {cleanSourceTitle(source.title, source.url)}
              </p>
              <p className="truncate text-[11px] leading-4 text-gray-400 dark:text-gray-500">{sourceLocation(source.url)}</p>
            </div>
          </div>

          <div className="px-3.5 pb-3 pt-2.5">
            {quote ? (
              <>
                <p className="mb-1 flex min-w-0 items-baseline gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  <span className="shrink-0">{anchor ? 'Belegstelle' : 'Gefundene Passage'}</span>
                  {anchor?.section && (
                    <span className="truncate normal-case tracking-normal">· im Abschnitt „{anchor.section}“</span>
                  )}
                </p>
                <blockquote className="border-l-2 border-brand-300 pl-2.5 text-[12.5px] leading-5 text-gray-700 dark:border-brand-600 dark:text-gray-200">
                  {anchor ? <MarkedQuote quote={quote} line={line} /> : quote}
                </blockquote>
              </>
            ) : outline ? (
              <p className="text-[12px] leading-5 text-gray-600 dark:text-gray-300">
                Liste aller indexierten Seiten der Wissensbasis, nach Bereichen gruppiert.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/70 px-3.5 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-2.5 py-1 text-[11.5px] font-medium text-white transition-colors hover:bg-brand-600"
            >
              {marksPassage ? <MousePointerClick className="size-3.5" aria-hidden="true" /> : <ExternalLink className="size-3.5" aria-hidden="true" />}
              {marksPassage ? 'An der Stelle öffnen' : 'Seite öffnen'}
            </a>
            {marksPassage && (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Nur Seite öffnen
              </a>
            )}
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
