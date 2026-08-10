import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fades a section in as it scrolls into view.
 *
 * This used to be a client component that rendered its children at opacity 0
 * and waited for an IntersectionObserver to turn them on. The observer only
 * exists once React has hydrated, so every section below the hero stayed blank
 * until the whole JavaScript bundle had arrived and run — on a cold cache that
 * was the several seconds of empty page under the navigation. The animation is
 * now the browser's job, which means the content is visible whether or not the
 * bundle ever shows up.
 */
export function SectionWrapper({ children, className }: SectionWrapperProps) {
  return (
    <div className={cn("reveal-on-scroll overflow-x-hidden", className)}>
      {children}
    </div>
  );
}
