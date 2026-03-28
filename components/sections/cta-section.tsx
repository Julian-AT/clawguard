import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/landing-config";

export function CTASection() {
  const { ctaSection } = siteConfig;

  return (
    <section id="cta" className="flex flex-col items-center justify-center w-full">
      <div className="w-full">
        <div className="relative z-20 h-[400px] w-full overflow-hidden rounded-xl border border-white/15 bg-(--landing-brand-fill) shadow-xl md:h-[400px]">
          <Image
            src={ctaSection.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-right opacity-20 md:object-center"
            fill
            priority
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <h1 className="max-w-xs text-center text-4xl font-medium tracking-tighter text-white md:max-w-xl md:text-7xl">
              {ctaSection.title} <br /> Ship safer
            </h1>
            <div className="mt-10 flex flex-col items-center justify-center gap-2">
              <Link
                href={ctaSection.button.href}
                className="landing-btn-accent flex h-10 w-fit items-center justify-center px-6 text-sm font-semibold ring-2 ring-white/35 shadow-lg"
              >
                {ctaSection.button.text}
              </Link>
              <span className="text-center text-sm text-white/85">{ctaSection.subtext}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
