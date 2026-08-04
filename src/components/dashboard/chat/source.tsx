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
    className={cn('not-prose mt-4 text-sm', className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      'group/source flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-25 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-800 dark:hover:bg-brand-500/10',
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-4" />
        <span>{count} {count === 1 ? 'Quelle' : 'Quellen'}</span>
        <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]/source:rotate-180" />
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
      'mt-3 grid w-full gap-2 sm:grid-cols-2',
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
