import BentoGrid from "@/components/landing/sections/bentogrid";
import Features from "@/components/landing/sections/features";
import HeroLanding from "@/components/landing/sections/hero-landing";
import Powered from "@/components/landing/sections/powered";
import PreviewLanding from "@/components/landing/sections/preview-landing";
import ProductShowcase from "@/components/landing/sections/product-showcase";
import CanvasSection from "@/components/landing/sections/canvas";
import { SectionWrapper } from "@/components/landing/ui/section-wrapper";

export default function HomePage() {
  return (
    <>
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
        <ProductShowcase />
      </SectionWrapper>
      <SectionWrapper>
        <Features />
      </SectionWrapper>
      <SectionWrapper>
        <CanvasSection />
      </SectionWrapper>
    </>
  );
}