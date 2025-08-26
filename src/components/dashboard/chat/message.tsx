import Avatar from '@/components/dashboard/ui/avatar/Avatar';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant';
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full items-end gap-3 py-4',
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
      'flex flex-col gap-2 overflow-hidden rounded-2xl px-4 py-3 text-sm max-w-[80%]',
      'group-[.is-user]:bg-blue-600 group-[.is-user]:text-white group-[.is-user]:ml-auto',
      'group-[.is-assistant]:bg-gray-100 group-[.is-assistant]:text-gray-900 dark:group-[.is-assistant]:bg-gray-800 dark:group-[.is-assistant]:text-gray-100',
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
