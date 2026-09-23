import BentoGrid from "@/components/landing/sections/bentogrid";
import ExamplesTeaser from "@/components/landing/sections/examples-teaser";
import Features from "@/components/landing/sections/features";
import HeroLanding from "@/components/landing/sections/hero-landing";
import Powered from "@/components/landing/sections/powered";
import FaqSection from "@/components/landing/sections/faq-section";
import PreviewLanding from "@/components/landing/sections/preview-landing";
import ProductShowcase from "@/components/landing/sections/product-showcase";
import CanvasSection from "@/components/landing/sections/canvas";
import { SectionWrapper } from "@/components/landing/ui/section-wrapper";
import { JsonLd } from "@/components/landing/json-ld";
import { landingFaq } from "@/lib/marketing/faq";
import { faqPageJsonLd } from "@/lib/marketing/structured-data";

/**
 * The landing page is served at "/" itself. It used to sit at /home behind a
 * redirect that ran in the browser, so anything fetching cracha-app.com without
 * executing JavaScript — a reviewer, a crawler, a link preview — saw one line
 * of loading text and a spinner, and nothing about what this is.
 */
export default function IndexPage() {
  return (
    <>
      {/* Same array as the FAQ rendered in FaqSection. */}
      <JsonLd data={faqPageJsonLd(landingFaq)} />
      <HeroLanding />
      <SectionWrapper>
        <PreviewLanding />
      </SectionWrapper>
      <SectionWrapper>
        <Powered />
      </SectionWrapper>
      <SectionWrapper>
        <BentoGrid />
      </SectionWrapper>
      <SectionWrapper>
        <ExamplesTeaser />
      </SectionWrapper>
      <SectionWrapper>
        <ProductShowcase />
      </SectionWrapper>
      <SectionWrapper>
        <Features />
      </SectionWrapper>
      <SectionWrapper>
        <FaqSection />
      </SectionWrapper>
      <SectionWrapper>
        <CanvasSection />
      </SectionWrapper>
    </>
  );
}
