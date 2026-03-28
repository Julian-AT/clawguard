import { LandingHashScroll } from "@/components/landing-hash-scroll";
import { BentoSection } from "@/components/sections/bento-section";
import { CompanyShowcase } from "@/components/sections/company-showcase";
import { CTASection } from "@/components/sections/cta-section";
import { FAQSection } from "@/components/sections/faq-section";
import { FeatureSection } from "@/components/sections/feature-section";
import { FooterSection } from "@/components/sections/footer-section";
import { GrowthSection } from "@/components/sections/growth-section";
import { HeroSection } from "@/components/sections/hero-section";
import { Navbar } from "@/components/sections/navbar";
import { QuoteSection } from "@/components/sections/quote-section";

export default function Home() {
  return (
    <div className="landing-page-scope relative mx-auto max-w-7xl border-x">
      <LandingHashScroll />
      <div className="pointer-events-none absolute top-0 left-6 z-10 block h-full w-px border-l border-border" />
      <div className="pointer-events-none absolute top-0 right-6 z-10 block h-full w-px border-r border-border" />
      <Navbar />
      <main className="flex min-h-screen w-full flex-col items-center justify-center divide-y divide-border">
        <HeroSection />
        <CompanyShowcase />
        <BentoSection />
        <FeatureSection />
        <QuoteSection />
        <GrowthSection />
        <FAQSection />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  );
}
