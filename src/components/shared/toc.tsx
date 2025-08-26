"use client";

import * as React from "react";

import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

// Define types locally to avoid import issues
interface TocItem {
  title: string;
  url: string;
  items?: TocItem[];
}

interface TableOfContents {
  items?: TocItem[];
}

interface TocProps {
  toc: TableOfContents;
}

export function DashboardTableOfContents({ toc }: TocProps) {
  const itemIds = React.useMemo(
    () =>
      toc.items
        ? toc.items
          .flatMap((item: TocItem) => [item.url, item?.items?.map((subItem: TocItem) => subItem.url)])
          .flat()
          .filter((id): id is string => Boolean(id))
          .map((id: string) => id.split("#")[1])
          .filter((id): id is string => Boolean(id))
        : [],
    [toc],
  );
  const activeHeading = useActiveItem(itemIds);
  const mounted = useMounted();

  if (!toc?.items) {
    return null;
  }

  return mounted ? (
    <div className="space-y-2">
      <p className="text-[15px] font-medium">On This Page</p>
      <Tree tree={toc} activeItem={activeHeading} />
    </div>
  ) : null;
}

function useActiveItem(itemIds: string[]) {
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: `0% 0% -80% 0%` },
    );

    itemIds.forEach((id: string) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      itemIds.forEach((id: string) => {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [itemIds]);

  return activeId;
}

interface TreeProps {
  tree: TableOfContents;
  level?: number;
  activeItem?: string | null;
}

function Tree({ tree, level = 1, activeItem }: TreeProps) {
  return tree?.items?.length && level < 3 ? (
    <ul className={cn("m-0 list-none", { "pl-4": level !== 1 })}>
      {tree.items.map((item: TocItem, index: number) => {
        return (
          <li key={index} className={cn("mt-0 pt-1")}>
            <a
              href={item.url}
              className={cn(
                "inline-block text-sm no-underline",
                item.url === `#${activeItem}`
                  ? "font-medium text-primary"
                  : "text-muted-foreground",
              )}
            >
              {item.title}
            </a>
            {item.items?.length ? (
              <Tree tree={item} level={level + 1} activeItem={activeItem} />
            ) : null}
          </li>
        );
      })}
    </ul>
  ) : null;
}
