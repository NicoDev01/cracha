'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { BookOpenIcon, ChevronDownIcon, ExternalLinkIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

export type SourcesProps = ComponentProps<'div'>;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn('not-prose mt-5 border-t border-gray-100 pt-4 text-sm dark:border-gray-800', className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
  /** The sites the cited sources come from, shown while the list is closed. */
  hosts?: { shown: string[]; more: number };
};

export const SourcesTrigger = ({
  className,
  count,
  hosts,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      'group/source flex w-full min-w-0 items-center gap-2 rounded-lg px-1 py-1.5 text-left font-medium text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400',
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-4 shrink-0 text-gray-400" />
        <span className="shrink-0">{count > 0 ? 'Verwendete Quellen' : 'Durchsuchte Quellen'}</span>
        {count > 0 && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">{count}</span>
        )}
        {hosts && hosts.shown.length > 0 && (
          <span className="hidden min-w-0 truncate text-xs font-normal text-gray-400 sm:inline dark:text-gray-500">
            {hosts.shown.join(', ')}{hosts.more > 0 ? ` +${hosts.more}` : ''}
          </span>
        )}
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-gray-400 transition-transform group-data-[state=open]/source:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-1 grid w-full gap-1',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<'a'>;

export const Source = ({ href, title, children, className, ...props }: SourceProps) => (
  <a
    className={cn(
      'group/link flex min-w-0 items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-gray-700 shadow-theme-xs transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-sm dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:border-brand-700',
      className
    )}
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-brand-500" />
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-gray-400 group-hover/link:text-brand-500" />
      </>
    )}
  </a>
);
