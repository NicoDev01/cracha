import { SiteShell } from "@/components/landing/layout/site-shell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
