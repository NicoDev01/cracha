import { cn } from '@/lib/utils';
import type { GeneratedImage } from '@/types/ai';

export type ImageProps = GeneratedImage & {
  className?: string;
  alt?: string;
};

export const Image = ({
  base64,
  uint8Array: _uint8Array, // Intentionally unused
  mediaType,
  ...props
}: ImageProps) => (
  <img
    {...props}
    alt={props.alt || 'Generated image'}
    className={cn(
      'h-auto max-w-full overflow-hidden rounded-md',
      props.className
    )}
    src={`data:${mediaType};base64,${base64}`}
  />
);
