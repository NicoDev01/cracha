import Avatar from '@/components/dashboard/ui/avatar/Avatar';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant';
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full items-start gap-3 py-3 sm:gap-4 sm:py-4',
      from === 'user' ? 'is-user justify-end' : 'is-assistant justify-start',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex max-w-full flex-col gap-2 overflow-hidden text-sm sm:text-[15px]',
      'group-[.is-user]:ml-auto group-[.is-user]:max-w-[85%] group-[.is-user]:rounded-3xl group-[.is-user]:bg-brand-500 group-[.is-user]:px-5 group-[.is-user]:py-2.5 group-[.is-user]:text-white sm:group-[.is-user]:max-w-[72%]',
      'group-[.is-assistant]:w-full group-[.is-assistant]:max-w-3xl group-[.is-assistant]:text-gray-800 dark:group-[.is-assistant]:text-gray-100',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = {
  src?: string;
  name?: string;
  className?: string;
};

export const MessageAvatar = ({
  src = '/images/default-avatar.png',
  name,
  className,
}: MessageAvatarProps) => (
  <div className={cn('flex-shrink-0', className)}>
    <Avatar src={src} alt={name || 'User'} size="small" />
  </div>
);
