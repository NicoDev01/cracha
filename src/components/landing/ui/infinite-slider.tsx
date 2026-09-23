'use client';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
};

/**
 * An endless strip: the children twice in a row, moved by exactly one copy and
 * started over.
 *
 * This used to drive the offset through motion's `animate` and measure the
 * strip with react-use-measure, which made it the reason the landing page
 * shipped framer-motion — some 60 KB compressed for one linear loop. The Web
 * Animations API does the same on the compositor, and `playbackRate` changes
 * speed on hover without a jump.
 */
export function InfiniteSlider({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof track.animate !== 'function') return;

    const start = () => {
      const size = direction === 'horizontal' ? track.offsetWidth : track.offsetHeight;
      // Two copies with `gap` between every item, the seam included: one copy
      // plus its trailing gap is half of (size + gap).
      const distance = (size + gap) / 2;
      if (distance <= 0) return;

      const axis = direction === 'horizontal' ? 'X' : 'Y';
      const from = reverse ? -distance : 0;
      const to = reverse ? 0 : -distance;
      const playbackRate = animationRef.current?.playbackRate ?? 1;
      animationRef.current?.cancel();
      animationRef.current = track.animate(
        [
          { transform: `translate${axis}(${from}px)` },
          { transform: `translate${axis}(${to}px)` },
        ],
        { duration: (distance / speed) * 1000, iterations: Infinity, easing: 'linear' },
      );
      animationRef.current.playbackRate = playbackRate;
    };

    // The observer also reports the first size, which starts the loop; after
    // that it restarts it when a font swap or a resize changes the distance.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(start);
    if (observer) observer.observe(track);
    else start();
    return () => {
      observer?.disconnect();
      animationRef.current?.cancel();
      animationRef.current = null;
    };
  }, [gap, speed, direction, reverse]);

  const hoverProps = speedOnHover
    ? {
        onPointerEnter: () => animationRef.current?.updatePlaybackRate(speedOnHover / speed),
        onPointerLeave: () => animationRef.current?.updatePlaybackRate(1),
      }
    : {};

  return (
    <div className={cn('overflow-hidden', className)}>
      <div
        ref={trackRef}
        className='flex w-max'
        style={{
          gap: `${gap}px`,
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
        }}
        {...hoverProps}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
