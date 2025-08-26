export interface TocItem {
  title: string;
  url: string;
  items?: TocItem[];
}

export interface TableOfContents {
  items?: TocItem[];
}

export function getTableOfContents(content: string): TableOfContents {
  const headings = content.match(/^#{1,3}\s+(.+)$/gm);
  
  if (!headings) {
    return { items: [] };
  }

  const items: TocItem[] = headings.map((heading) => {
    const level = heading.match(/^#+/)?.[0].length || 1;
    const title = heading.replace(/^#+\s+/, '');
    const url = `#${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;
    
    return {
      title,
      url,
      items: []
    };
  });

  return { items };
}