'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatStatus } from '@/types/ai';
import { ArrowUpIcon, Loader2Icon, SquareIcon, XIcon } from 'lucide-react';
import type {
  ComponentProps,
  HTMLAttributes,
  KeyboardEventHandler,
} from 'react';
import { Children } from 'react';

export type PromptInputProps = HTMLAttributes<HTMLFormElement>;

/*
 * Modelled on the Astryx ChatComposer: a raised 28px shell with the text on
 * top and the actions in a row below, lifted a little further on hover and
 * while typing. In the dark theme the shell is a step lighter than the chat
 * and carries a hairline, because a shadow alone disappears on a dark page.
 */
export const PromptInput = ({ className, onClick, ...props }: PromptInputProps) => (
  <form
    className={cn(
      'flex w-full cursor-text flex-col gap-2 rounded-[28px] border border-transparent bg-white p-3 transition-[box-shadow,border-color] duration-150',
      'shadow-[0_1px_1px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.1)] focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_12px_rgba(0,0,0,0.12)] [@media(hover:hover)]:hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_12px_rgba(0,0,0,0.12)]',
      'dark:border-white/[0.08] dark:bg-gray-800 dark:shadow-[0_1px_1px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.2)] dark:focus-within:border-white/[0.14]',
      className
    )}
    // A click anywhere on the shell, not only on the text line, starts typing.
    onClick={(event) => {
      onClick?.(event);
      if (!(event.target as HTMLElement).closest('button, a, textarea, input, select')) {
        event.currentTarget.querySelector('textarea')?.focus();
      }
    }}
    {...props}
  />
);

export type PromptInputTextareaProps = ComponentProps<typeof Textarea> & {
  minHeight?: number;
  maxHeight?: number;
};

export const PromptInputTextarea = ({
  onChange,
  className,
  placeholder = 'What would you like to know?',
  minHeight: _minHeight = 48, // Intentionally unused
  maxHeight: _maxHeight = 164, // Intentionally unused,
  ...props
}: PromptInputTextareaProps) => {
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline
        return;
      }

      // Submit on Enter (without Shift)
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <Textarea
      className={cn(
        'w-full resize-none rounded-none border-none px-2 pt-1 pb-0 shadow-none outline-none ring-0',
        'field-sizing-content min-h-6 max-h-44 overflow-y-auto bg-transparent text-[15px] leading-6 md:text-[15px] dark:bg-transparent',
        // Ensure readable text and placeholder in both themes
        'text-gray-800 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/40',
        'caret-brand-500 dark:caret-brand-400',
        // Ensure readability when disabled (override base disabled:opacity-50)
        'disabled:opacity-100 disabled:text-gray-700 dark:disabled:text-white/80 disabled:placeholder:text-gray-500 dark:disabled:placeholder:text-white/40',
        'focus-visible:ring-0',
        className
      )}
      name="message"
      onChange={(e) => {
        onChange?.(e);
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      // Keep the input readable when disabled (no 50% opacity washout)
      disabled={props.disabled}
      {...props}
    />
  );
};

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputToolbar = ({
  className,
  ...props
}: PromptInputToolbarProps) => (
  <div
    className={cn('flex items-center justify-between border-t border-gray-100 px-2 py-1.5 dark:border-gray-800', className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div
    className={cn(
      'flex items-center gap-1',
      '[&_button:first-child]:rounded-bl-xl',
      className
    )}
    {...props}
  />
);

export type PromptInputButtonProps = ComponentProps<typeof Button>;

export const PromptInputButton = ({
  variant = 'ghost',
  className,
  size,
  ...props
}: PromptInputButtonProps) => {
  const newSize =
    (size ?? Children.count(props.children) > 1) ? 'default' : 'icon';

  return (
    <Button
      className={cn(
        'shrink-0 gap-1.5 rounded-lg',
        variant === 'ghost' && 'text-muted-foreground',
        newSize === 'default' && 'px-3',
        className
      )}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
};

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: ChatStatus;
};

export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon',
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let Icon = <ArrowUpIcon className="size-4" strokeWidth={2.25} />;

  if (status === 'submitted') {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    Icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    Icon = <XIcon className="size-4" />;
  }

  return (
    <Button
      className={cn(
        'size-8 shrink-0 rounded-full bg-brand-500 text-white hover:bg-brand-600',
        'disabled:bg-gray-200 disabled:text-gray-400 disabled:opacity-100 dark:disabled:bg-white/10 dark:disabled:text-white/35',
        className
      )}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};

export type PromptInputStopProps = ComponentProps<typeof Button>;

/** Takes the place of the send button while an answer is on its way. */
export const PromptInputStop = ({ className, ...props }: PromptInputStopProps) => (
  <Button
    type="button"
    size="icon"
    variant="ghost"
    className={cn(
      'size-8 shrink-0 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900',
      'dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:hover:text-white',
      className
    )}
    aria-label="Antwort stoppen"
    title="Antwort stoppen"
    {...props}
  >
    <SquareIcon className="size-3 fill-current" />
  </Button>
);

export type PromptInputModelSelectProps = ComponentProps<typeof Select>;

export const PromptInputModelSelect = (props: PromptInputModelSelectProps) => (
  <Select {...props} />
);

export type PromptInputModelSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: PromptInputModelSelectTriggerProps) => (
  <SelectTrigger
    className={cn(
      'border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors',
      'hover:bg-accent hover:text-foreground [&[aria-expanded="true"]]:bg-accent [&[aria-expanded="true"]]:text-foreground',
      className
    )}
    {...props}
  />
);

export type PromptInputModelSelectContentProps = ComponentProps<
  typeof SelectContent
>;

export const PromptInputModelSelectContent = ({
  className,
  ...props
}: PromptInputModelSelectContentProps) => (
  <SelectContent className={cn(className)} {...props} />
);

export type PromptInputModelSelectItemProps = ComponentProps<typeof SelectItem>;

export const PromptInputModelSelectItem = ({
  className,
  ...props
}: PromptInputModelSelectItemProps) => (
  <SelectItem className={cn(className)} {...props} />
);

export type PromptInputModelSelectValueProps = ComponentProps<
  typeof SelectValue
>;

export const PromptInputModelSelectValue = ({
  className,
  ...props
}: PromptInputModelSelectValueProps) => (
  <SelectValue className={cn(className)} {...props} />
);
