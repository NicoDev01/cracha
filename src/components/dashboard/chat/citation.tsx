'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { ArrowUpRight } from 'lucide-react';
import { createContext, useContext, useState, type MouseEvent, type ReactNode } from 'react';
import { isOutlineSource } from '@/lib/chat/citations';
import { cleanSnippet, cleanSourceTitle } from '@/lib/chat/source-display';
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

/*
 * Just the number, small and raised a little, as a footnote reads: the source
 * list under the answer names the pages, so the text stays text.
 */
const CHIP = 'mx-px inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-100 px-1 align-[0.2em] text-[10px] font-semibold leading-none tabular-nums text-gray-600 no-underline transition-colors hover:bg-brand-500 hover:text-white data-[state=open]:bg-brand-500 data-[state=open]:text-white dark:bg-white/10 dark:text-gray-300 dark:hover:bg-brand-400 dark:hover:text-gray-950 dark:data-[state=open]:bg-brand-400 dark:data-[state=open]:text-gray-950';

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
  const isHit = (part: string) => {
    const word = normalize(part);
    const glued = /^\p{N}+(?=\p{L})/u.exec(part)?.[0];
    return Boolean(word) && (claim.has(word) || (glued !== undefined && claim.has(glued)));
  };
  // Neighbouring matches are one mark, so a phrase reads as a phrase instead
  // of a row of separate boxes.
  const runs: Array<{ text: string; hit: boolean }> = [];
  const parts = quote.split(/(\s+)/);
  parts.forEach((part, index) => {
    const space = /^\s+$/.test(part);
    const hit = space
      ? Boolean(runs.at(-1)?.hit) && index + 1 < parts.length && isHit(parts[index + 1])
      : isHit(part);
    const last = runs.at(-1);
    if (last && last.hit === hit) last.text += part;
    else runs.push({ text: part, hit });
  });
  return (
    <>
      {runs.map((run, index) => run.hit
        ? <mark key={index} className="rounded-[3px] bg-brand-100/80 px-0.5 font-medium text-inherit [box-decoration-break:clone] dark:bg-brand-400/20">{run.text}</mark>
        : <span key={index}>{run.text}</span>)}
    </>
  );
}

/**
 * A marker is a number; hovering it shows where the line comes from — the
 * section, which links to the page with the passage highlighted, and the
 * passage itself with the words it shares with the line marked. Title and
 * address are in the source list under the answer, so the card leaves them
 * out. On a touch screen, which has no hover, the first tap opens the card and
 * the section link inside it opens the page.
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
      {source ? index : children}
    </a>
  );
  if (!source) return link;

  const outline = isOutlineSource(source);
  const quote = outline ? '' : anchor?.quote ?? cleanSnippet(source.snippet, 260);
  const label = outline ? 'Seitenübersicht' : anchor?.section ? `Abschnitt: ${anchor.section}` : 'Zur Textstelle';
  return (
    <HoverCard.Root open={open} onOpenChange={setOpen} openDelay={120} closeDelay={150}>
      <HoverCard.Trigger asChild>{link}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[21rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-gray-200/80 bg-white/95 p-4 text-left shadow-[0_8px_30px_rgba(16,24,40,0.12)] outline-none backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-gray-900/95 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        >
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group/section flex min-w-0 items-center gap-1 text-[11.5px] font-medium text-gray-500 underline-offset-2 transition-colors hover:text-brand-600 hover:underline dark:text-gray-400 dark:hover:text-brand-400"
          >
            <span className="truncate">{label}</span>
            <ArrowUpRight className="size-3.5 shrink-0 opacity-50 transition-opacity group-hover/section:opacity-100" aria-hidden="true" />
          </a>
          {quote ? (
            <p className="mt-2 text-[13px] leading-[1.6] text-gray-800 dark:text-gray-100">
              {anchor ? <MarkedQuote quote={quote} line={line} /> : quote}
            </p>
          ) : outline ? (
            <p className="mt-2 text-[13px] leading-[1.6] text-gray-600 dark:text-gray-300">
              Liste aller indexierten Seiten der Wissensbasis, nach Bereichen gruppiert.
            </p>
          ) : null}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
