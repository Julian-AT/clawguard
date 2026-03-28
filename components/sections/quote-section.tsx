// biome-ignore assist/source/organizeImports: <explanation>
import { siteConfig } from "@/lib/landing-config";
import Image from "next/image";

export function QuoteSection() {
  const { quoteSection } = siteConfig;

  return (
    <section
      id="quote"
      className="flex flex-col items-center justify-center gap-8 w-full p-14 bg-accent z-20"
    >
      <blockquote className="max-w-3xl text-left px-4">
        <p className="text-xl md:text-2xl text-primary leading-relaxed tracking-tighter font-medium mb-6">
          {quoteSection.quote}
        </p>

        <div className="flex gap-4">
          <div className="size-10 rounded-full bg-(--landing-brand-fill) border border-border">
            <Image
              src="/BP5_9351-0-scaled.webp"
              alt={quoteSection.author.name}
              fill
              className="object-cover rounded-full"
              style={{ objectFit: "cover" }}
              sizes="40px"
              priority
            />
          </div>
          <div className="text-left">
            <cite className="text-lg font-medium text-primary not-italic">
              {quoteSection.author.name}
            </cite>
            <p className="text-sm text-primary">{quoteSection.author.role}</p>
          </div>
        </div>
      </blockquote>
    </section>
  );
}
