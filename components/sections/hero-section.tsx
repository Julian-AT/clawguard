import { HeroVideoSection } from "@/components/sections/hero-video-section";
import { siteConfig } from "@/lib/landing-config";
import Link from "next/link";

export function HeroSection() {
  const { hero } = siteConfig;

  return (
    <section id="hero" className="relative w-full scroll-mt-28">
      <div className="relative flex flex-col items-center w-full px-6">
        <div className="absolute inset-0">
          <div className="absolute inset-0 -z-10 h-[600px] md:h-[800px] w-full [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--landing-brand-fill)_100%)] rounded-b-xl"></div>
        </div>
        <div className="relative z-10 pt-32 max-w-3xl mx-auto h-full w-full flex flex-col gap-10 items-center justify-center">
          <p className="border border-border bg-accent rounded-full text-sm h-8 px-3 flex items-center gap-2">
            {hero.badgeIcon}
            {hero.badge}
          </p>
          <div className="flex flex-col items-center justify-center gap-5">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tighter text-balance text-center text-primary">
              {hero.title}
            </h1>
            <p className="text-base md:text-lg text-center text-muted-foreground font-medium text-balance leading-relaxed tracking-tight">
              {hero.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:flex-nowrap">
            <Link
              href={hero.cta.primary.href}
              className="inline-flex h-10 min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-white/12 bg-(--landing-brand-fill) px-6 text-sm font-normal tracking-wide text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:opacity-90 active:scale-95"
            >
              {hero.cta.primary.text}
            </Link>
            <Link
              href={hero.cta.secondary.href}
              className="inline-flex h-10 min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#E5E7EB] bg-white px-6 text-sm font-normal tracking-wide text-black transition-all ease-out hover:bg-white/90 active:scale-95 dark:border-[#27272A] dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {hero.cta.secondary.text}
            </Link>
          </div>
        </div>
      </div>
      <HeroVideoSection />
    </section>
  );
}
