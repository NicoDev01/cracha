import Link from "next/link";
import { BookOpen, Briefcase } from "lucide-react";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const useCases = [
  {
    href: "/kundenwebsite-durchsuchen",
    icon: <Briefcase className="h-5 w-5" />,
    audience: "Für Agenturen und Marketing-Teams",
    title: "Kundenwebsites durchsuchen",
    text: "Arbeite dich in die Website eines Kunden ein, ohne jede Unterseite zu lesen. Leistungen, Zielgruppen, Formulierungen – mit Link zur Seite, auf der es steht.",
  },
  {
    href: "/dokumentation-durchsuchen",
    icon: <BookOpen className="h-5 w-5" />,
    audience: "Für Entwicklerinnen und Entwickler",
    title: "Dokumentationen durchsuchen",
    text: "Frag große Docs direkt nach Konfiguration, API-Details oder Migrationsschritten – auf Deutsch, mit Link zur passenden Doku-Seite.",
  },
];

export default function UseCases() {
  return (
    <section id="anwendungsfaelle" className="scroll-mt-24 py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
            Für Firmenwebsites und <span className="text-gradient_indigo-purple">Dokumentationen</span>
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {useCases.map((useCase) => (
            <Link
              key={useCase.href}
              href={useCase.href}
              className="group rounded-2xl border bg-background p-6 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <div className="w-fit rounded-lg border bg-muted p-2">{useCase.icon}</div>
              <p className="mt-5 text-sm font-medium text-muted-foreground">{useCase.audience}</p>
              <h3 className="mt-1 text-2xl font-semibold">{useCase.title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{useCase.text}</p>
              <span className="mt-4 inline-block font-medium underline underline-offset-4">Mehr erfahren</span>
            </Link>
          ))}
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
