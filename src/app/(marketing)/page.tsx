import BentoGrid from "@/components/landing/sections/bentogrid";
import Features from "@/components/landing/sections/features";
import HeroLanding from "@/components/landing/sections/hero-landing";
import GettingStarted from "@/components/landing/sections/getting-started";
import PreviewLanding from "@/components/landing/sections/preview-landing";
import ProductShowcase from "@/components/landing/sections/product-showcase";
import CanvasSection from "@/components/landing/sections/canvas";
import { SectionWrapper } from "@/components/landing/ui/section-wrapper";

/**
 * The landing page is served at "/" itself. It used to sit at /home behind a
 * redirect that ran in the browser, so anything fetching cracha-app.com without
 * executing JavaScript — a reviewer, a crawler, a link preview — saw one line
 * of loading text and a spinner, and nothing about what this is.
 */
export default function IndexPage() {
  return (
    <>
      <HeroLanding />
      <SectionWrapper>
        <PreviewLanding />
      </SectionWrapper>
      <SectionWrapper>
        <BentoGrid />
      </SectionWrapper>
      <SectionWrapper>
        <ProductShowcase />
      </SectionWrapper>
      <SectionWrapper>
        <Features />
      </SectionWrapper>
      <SectionWrapper>
        <GettingStarted />
      </SectionWrapper>
      <SectionWrapper>
        <CanvasSection />
      </SectionWrapper>
    </>
  );
}
