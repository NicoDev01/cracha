import type { FaqItem } from "@/lib/marketing/faq";

/** The visible half of an FAQ whose other half is FAQPage JSON-LD. */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div>
      {items.map((item) => (
        <details key={item.question} className="border-b py-4">
          <summary className="cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-4">{item.question}</summary>
          <p className="pb-2 pt-3 leading-7 text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
