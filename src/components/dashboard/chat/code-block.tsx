'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

/** Fence names a reader recognises; anything else is shown as written. */
const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX',
  py: 'Python', python: 'Python', sh: 'Shell', bash: 'Bash', shell: 'Shell', zsh: 'Shell', ps1: 'PowerShell', powershell: 'PowerShell',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', html: 'HTML', css: 'CSS', sql: 'SQL', md: 'Markdown', markdown: 'Markdown',
  php: 'PHP', java: 'Java', go: 'Go', rust: 'Rust', rs: 'Rust', c: 'C', cpp: 'C++', cs: 'C#', csharp: 'C#', rb: 'Ruby', ruby: 'Ruby',
};

const codeStyle = {
  margin: 0,
  padding: '0.875rem 1rem',
  fontSize: '0.8125rem',
  lineHeight: 1.6,
  background: 'transparent',
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => (
  <CodeBlockContext.Provider value={{ code }}>
    <div
      className={cn(
        'not-prose w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-100',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 py-1 pe-1 ps-4 dark:border-white/10">
        <span className="truncate font-mono text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {language && language !== 'text' ? LANGUAGE_LABELS[language.toLowerCase()] ?? language : 'Code'}
        </span>
        {children && <div className="flex items-center gap-1">{children}</div>}
      </div>
      <SyntaxHighlighter
        className="overflow-x-auto dark:hidden"
        codeTagProps={{ className: 'font-mono' }}
        customStyle={codeStyle}
        language={language}
        showLineNumbers={showLineNumbers}
        style={oneLight}
      >
        {code}
      </SyntaxHighlighter>
      <SyntaxHighlighter
        className="hidden overflow-x-auto dark:block"
        codeTagProps={{ className: 'font-mono' }}
        customStyle={codeStyle}
        language={language}
        showLineNumbers={showLineNumbers}
        style={oneDark}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  </CodeBlockContext.Provider>
);

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('size-7 shrink-0 rounded-md text-gray-500 hover:bg-gray-200/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      aria-label={isCopied ? 'Kopiert' : 'Code kopieren'}
      title={isCopied ? 'Kopiert' : 'Code kopieren'}
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
