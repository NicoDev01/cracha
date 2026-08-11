import type { ReactNode } from "react";

/** Shared frame so the three legal pages read as one document set. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <h1 className="font-urban text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Stand: {updated}</p>
      {intro ? <div className="mt-6 text-base leading-relaxed text-muted-foreground">{intro}</div> : null}
      <div className="mt-10 space-y-10">{children}</div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{heading}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

