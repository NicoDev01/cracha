'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { ComponentProps, HTMLAttributes } from 'react';
import { isValidElement, memo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import hardenReactMarkdown from 'harden-react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { CitationLink } from './citation';
import { CodeBlock, CodeBlockCopyButton } from './code-block';

const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

export type ResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options;
  children: Options['children'];
  allowedImagePrefixes?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['allowedImagePrefixes'];
  allowedLinkPrefixes?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['allowedLinkPrefixes'];
  defaultOrigin?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['defaultOrigin'];
};

/*
 * Modelled on the Astryx Markdown: neutral prose with a clear heading scale,
 * tables as ruled rows rather than a boxed grid, code in a titled card, and
 * task lists with real check marks. The brand colour is kept for what can be
 * clicked — links and source chips — so it keeps meaning something.
 */
const components: Options['components'] = {
  p: ({ node: _node, children, className, ...props }) => (
    <p className={cn('my-3 first:mt-0 last:mb-0', className)} {...props}>
      {children}
    </p>
  ),
  // An outside marker is drawn to the left of the list, so the list must reserve
  // room for it as padding. As a margin it fell outside the message box, and the
  // bubble's `overflow-hidden` sliced the leading digit off every item past nine.
  ol: ({ node: _node, children, className, ...props }) => (
    <ol className={cn('my-3 list-outside list-decimal space-y-1.5 ps-7 marker:text-gray-500 dark:marker:text-gray-400', className)} {...props}>
      {children}
    </ol>
  ),
  ul: ({ node: _node, children, className, ...props }) => (
    <ul
      className={cn(
        'my-3 list-outside list-disc space-y-1.5 ps-6 marker:text-gray-400 dark:marker:text-gray-500',
        // A task list draws its own boxes instead of bullets.
        className?.includes('contains-task-list') && 'list-none ps-1',
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  ),
  li: ({ node: _node, children, className, ...props }) => (
    <li className={cn('ps-1', className?.includes('task-list-item') && 'flex items-start gap-2.5 ps-0', className)} {...props}>{children}</li>
  ),
  input: ({ node: _node, checked, type }) => type === 'checkbox' ? (
    <span
      role="img"
      aria-label={checked ? 'Erledigt' : 'Offen'}
      className={cn(
        'mt-[0.3em] inline-flex size-4 shrink-0 items-center justify-center rounded border',
        checked
          ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-gray-950'
          : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-transparent',
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
    </span>
  ) : null,
  h1: ({ node: _node, children, className, ...props }) => (
    <h1 className={cn('mb-3 mt-7 text-xl font-semibold leading-snug tracking-tight text-gray-950 first:mt-0 dark:text-white', className)} {...props}>{children}</h1>
  ),
  h2: ({ node: _node, children, className, ...props }) => (
    <h2 className={cn('mb-2.5 mt-6 text-lg font-semibold leading-snug tracking-tight text-gray-950 first:mt-0 dark:text-white', className)} {...props}>{children}</h2>
  ),
  h3: ({ node: _node, children, className, ...props }) => (
    <h3 className={cn('mb-2 mt-5 text-base font-semibold leading-snug text-gray-950 first:mt-0 dark:text-white', className)} {...props}>{children}</h3>
  ),
  h4: ({ node: _node, children, className, ...props }) => (
    <h4 className={cn('mb-1.5 mt-4 font-semibold text-gray-900 first:mt-0 dark:text-gray-50', className)} {...props}>{children}</h4>
  ),
  h5: ({ node: _node, children, className, ...props }) => (
    <h5 className={cn('mb-1.5 mt-4 text-sm font-semibold text-gray-900 first:mt-0 dark:text-gray-50', className)} {...props}>{children}</h5>
  ),
  h6: ({ node: _node, children, className, ...props }) => (
    <h6 className={cn('mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 first:mt-0 dark:text-gray-400', className)} {...props}>{children}</h6>
  ),
  strong: ({ node: _node, children, className, ...props }) => (
    <strong className={cn('font-semibold text-gray-950 dark:text-white', className)} {...props}>{children}</strong>
  ),
  del: ({ node: _node, children, className, ...props }) => (
    <del className={cn('text-gray-500 dark:text-gray-400', className)} {...props}>{children}</del>
  ),
  a: ({ node: _node, children, className, ...props }) => {
    const label = Array.isArray(children) ? children.join('') : String(children)
    const citation = /^\[(\d+)\]$/.exec(label)
    if (citation) {
      return <CitationLink index={Number(citation[1])} href={props.href} anchorKey={props.title} className={className}>{children}</CitationLink>
    }
    return (
      <a
        className={cn(
          'font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 transition-colors hover:text-brand-700 hover:decoration-brand-500 dark:text-brand-400 dark:decoration-brand-500/50 dark:hover:text-brand-300',
          className,
        )}
        rel="noreferrer"
        target="_blank"
        {...props}
      >
        {children}
      </a>
    )
  },
  blockquote: ({ node: _node, children, className, ...props }) => (
    <blockquote className={cn('my-4 border-l-2 border-gray-300 ps-4 text-gray-600 dark:border-gray-600 dark:text-gray-300', className)} {...props}>
      {children}
    </blockquote>
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr className={cn('my-6 border-gray-200 dark:border-gray-800', className)} {...props} />
  ),
  // Scrolls sideways on its own when wider than the answer, so the page does not.
  table: ({ node: _node, children, className, ...props }) => (
    <div className="my-4 max-w-full overflow-x-auto overscroll-x-contain">
      <table className={cn('w-full border-collapse text-left text-sm tabular-nums', className)} {...props}>{children}</table>
    </div>
  ),
  thead: ({ node: _node, children, className, ...props }) => (
    <thead className={className} {...props}>{children}</thead>
  ),
  tbody: ({ node: _node, children, className, ...props }) => (
    <tbody className={cn('[&>tr:last-child>td]:border-b-0', className)} {...props}>{children}</tbody>
  ),
  tr: ({ node: _node, children, className, ...props }) => (
    <tr className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]', className)} {...props}>{children}</tr>
  ),
  // Alignment from `:---:` arrives as an inline style and is kept.
  th: ({ node: _node, children, className, ...props }) => (
    <th className={cn('whitespace-nowrap border-b border-gray-300 px-3 py-2 font-semibold text-gray-900 first:ps-0 last:pe-0 dark:border-gray-600 dark:text-gray-50', className)} {...props}>{children}</th>
  ),
  td: ({ node: _node, children, className, ...props }) => (
    <td className={cn('border-b border-gray-200 px-3 py-2 align-top first:ps-0 last:pe-0 dark:border-gray-800', className)} {...props}>{children}</td>
  ),
  code: ({ node, className, ...props }) => {
    const inline = node?.position?.start.line === node?.position?.end.line;
    return inline ? (
      <code className={cn('rounded-md border border-gray-200 bg-gray-50 px-1.5 py-px font-mono text-[0.85em] text-gray-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100', className)} {...props} />
    ) : (
      <code className={className} {...props} />
    );
  },
  pre: ({ node, className, children }) => {
    // The fence language sits on the inner <code> as `language-*`.
    const inner = isValidElement(children) ? (children.props as { className?: unknown }).className : undefined;
    const classes = [node?.properties?.className, inner].flat().filter(Boolean).flatMap((name) => String(name).split(' '));
    const language = classes.find((name) => name.startsWith('language-'))?.slice('language-'.length) ?? 'text';

    let code = '';
    if (isValidElement(children) && children.props && typeof (children.props as { children: unknown }).children === 'string') {
      code = (children.props as { children: string }).children;
    } else if (typeof children === 'string') {
      code = children;
    }

    return (
      <CodeBlock className={cn('my-4', className)} code={code} language={language}>
        <CodeBlockCopyButton />
      </CodeBlock>
    );
  },
};

export const Response = memo(({
  className,
  options,
  children,
  allowedImagePrefixes,
  allowedLinkPrefixes,
  defaultOrigin,
  ...props
}: ResponseProps) => (
  <div className={cn('w-full text-pretty break-words leading-[1.7] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)} {...props}>
    <HardenedMarkdown
      allowedImagePrefixes={allowedImagePrefixes ?? ['*']}
      allowedLinkPrefixes={allowedLinkPrefixes ?? ['*']}
      components={components}
      defaultOrigin={defaultOrigin}
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
      {...options}
    >
      {children}
    </HardenedMarkdown>
  </div>
), (previous, next) => previous.children === next.children);

Response.displayName = 'Response';
