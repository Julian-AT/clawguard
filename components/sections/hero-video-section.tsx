import { HeroVideoDialog } from "@/components/ui/hero-video-dialog";
import { siteConfig } from "@/lib/landing-config";

export function HeroVideoSection() {
  const { embedUrl, thumbnailSrc, thumbnailAlt } = siteConfig.heroVideo;

  return (
    <div className="relative px-6 mt-10">
      <div className="relative size-full shadow-xl rounded-2xl overflow-hidden">
        <HeroVideoDialog
          className="block"
          animationStyle="from-center"
          videoSrc={embedUrl}
          thumbnailSrc={thumbnailSrc}
          thumbnailAlt={thumbnailAlt}
        />
      </div>
    </div>
  );
}
