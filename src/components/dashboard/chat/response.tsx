'use client';

import { cn } from '@/lib/utils';
import type { ComponentProps, HTMLAttributes } from 'react';
import { isValidElement, memo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import hardenReactMarkdown from 'harden-react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
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

const components: Options['components'] = {
  p: ({ node: _node, children, className, ...props }) => (
    <p className={cn('my-3 leading-7 first:mt-0 last:mb-0', className)} {...props}>
      {children}
    </p>
  ),
  // An outside marker is drawn to the left of the list, so the list must reserve
  // room for it as padding. As a margin it fell outside the message box, and the
  // bubble's `overflow-hidden` sliced the leading digit off every item past nine.
  ol: ({ node: _node, children, className, ...props }) => (
    <ol className={cn('my-3 ps-8 list-outside list-decimal space-y-2 leading-7', className)} {...props}>
      {children}
    </ol>
  ),
  ul: ({ node: _node, children, className, ...props }) => (
    <ul className={cn('my-3 ps-6 list-outside list-disc space-y-2 leading-7 marker:text-brand-500', className)} {...props}>
      {children}
    </ul>
  ),
  li: ({ node: _node, children, className, ...props }) => (
    <li className={className} {...props}>{children}</li>
  ),
  h1: ({ node: _node, children, className, ...props }) => (
    <h1 className={cn('mb-3 mt-6 text-xl font-semibold tracking-tight first:mt-0', className)} {...props}>{children}</h1>
  ),
  h2: ({ node: _node, children, className, ...props }) => (
    <h2 className={cn('mb-2 mt-6 text-lg font-semibold tracking-tight first:mt-0', className)} {...props}>{children}</h2>
  ),
  h3: ({ node: _node, children, className, ...props }) => (
    <h3 className={cn('mb-2 mt-5 text-base font-semibold first:mt-0', className)} {...props}>{children}</h3>
  ),
  h4: ({ node: _node, children, className, ...props }) => (
    <h4 className={cn('mb-2 mt-4 font-semibold first:mt-0', className)} {...props}>{children}</h4>
  ),
  h5: ({ node: _node, children, className, ...props }) => (
    <h5 className={cn('mb-2 mt-4 text-sm font-semibold first:mt-0', className)} {...props}>{children}</h5>
  ),
  h6: ({ node: _node, children, className, ...props }) => (
    <h6 className={cn('mb-2 mt-4 text-xs font-semibold uppercase tracking-wide first:mt-0', className)} {...props}>{children}</h6>
  ),
  strong: ({ node: _node, children, className, ...props }) => (
    <strong className={cn('font-semibold text-gray-950 dark:text-white', className)} {...props}>{children}</strong>
  ),
  a: ({ node: _node, children, className, ...props }) => {
    const label = Array.isArray(children) ? children.join('') : String(children)
    const isCitation = /^\[\d+\]$/.test(label)
    return (
      <a
        aria-label={isCitation ? `Quelle ${label.slice(1, -1)} öffnen` : undefined}
        className={cn(
          isCitation
            ? 'mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md bg-brand-50 px-1.5 py-0.5 align-baseline text-[0.75em] font-semibold leading-none text-brand-700 no-underline transition-colors hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25'
            : 'font-medium text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700 dark:text-brand-400',
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
    <blockquote className={cn('my-4 rounded-r-lg border-l-4 border-brand-300 bg-brand-25 px-4 py-2 text-gray-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-gray-300', className)} {...props}>
      {children}
    </blockquote>
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr className={cn('my-6 border-gray-200 dark:border-gray-700', className)} {...props} />
  ),
  table: ({ node: _node, children, className, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props}>{children}</table>
    </div>
  ),
  thead: ({ node: _node, children, className, ...props }) => (
    <thead className={cn('bg-gray-50 dark:bg-gray-800', className)} {...props}>{children}</thead>
  ),
  tbody: ({ node: _node, children, className, ...props }) => (
    <tbody className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)} {...props}>{children}</tbody>
  ),
  tr: ({ node: _node, children, className, ...props }) => (
    <tr className={className} {...props}>{children}</tr>
  ),
  th: ({ node: _node, children, className, ...props }) => (
    <th className={cn('px-4 py-3 font-semibold', className)} {...props}>{children}</th>
  ),
  td: ({ node: _node, children, className, ...props }) => (
    <td className={cn('px-4 py-3 align-top', className)} {...props}>{children}</td>
  ),
  code: ({ node, className, ...props }) => {
    const inline = node?.position?.start.line === node?.position?.end.line;
    return inline ? (
      <code className={cn('rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-800 dark:bg-gray-800 dark:text-gray-100', className)} {...props} />
    ) : (
      <code className={className} {...props} />
    );
  },
  pre: ({ node, className, children }) => {
    let language = 'text';
    if (typeof node?.properties?.className === 'string') {
      language = node.properties.className.replace('language-', '');
    }

    let code = '';
    if (isValidElement(children) && children.props && typeof (children.props as { children: unknown }).children === 'string') {
      code = (children.props as { children: string }).children;
    } else if (typeof children === 'string') {
      code = children;
    }

    return (
      <CodeBlock className={cn('my-4 h-auto rounded-xl', className)} code={code} language={language}>
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
  <div className={cn('w-full text-pretty break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)} {...props}>
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
