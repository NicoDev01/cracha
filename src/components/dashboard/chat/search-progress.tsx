'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { RetrievalProgress } from '@/types/chat';

/**
 * Counts up to each new value instead of jumping to it. The search reports in
 * two or three steps, and a number that climbs between them reads as work being
 * done; every value it passes through lies between two real counts.
 */
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    // Reduced motion still updates on the next frame, just without the climb.
    const length = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = length === 0 ? 1 : Math.min(1, (now - started) / length);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (target - from) * eased);
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function stageLabel(progress: RetrievalProgress | null): string {
  if (progress?.stage === 'collection') return progress.title ? `Lese „${progress.title}“ vollständig …` : 'Lese die Übersichtsseite vollständig …';
  if (progress?.stage === 'selected') return 'Wähle die passendsten Quellen …';
  return 'Durchsuche die Wissensbasis …';
}

export function SearchProgress({ progress }: { progress: RetrievalProgress | null }) {
  const pages = useCountUp(progress?.pages ?? 0);
  const passages = useCountUp(progress?.passages ?? 0);
  const selected = progress?.stage === 'selected' ? progress.sources : undefined;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/20 motion-reduce:hidden" aria-hidden="true" />
        <Search className="relative size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{stageLabel(progress)}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Geprüfte Quellen:{' '}
            <span className="font-semibold tabular-nums text-brand-600 dark:text-brand-300">{pages}</span>
          </span>
          {passages > 0 && (
            <span className="tabular-nums">· {passages} Textstellen</span>
          )}
          {selected !== undefined && (
            <span className="tabular-nums">· {selected} ausgewählt</span>
          )}
        </p>
        {progress?.search_query && (
          <p className="mt-1.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
            Suchbegriffe: <span className="text-gray-500 dark:text-gray-400">„{progress.search_query}“</span>
          </p>
        )}
      </div>
    </div>
  );
}
