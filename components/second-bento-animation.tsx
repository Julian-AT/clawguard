import type { ReactNode } from "react";
import { Icons } from "@/components/landing-icons";
import { OrbitingCircles } from "@/components/ui/orbiting-circle";
import {
  Bug,
  FileWarning,
  GitPullRequest,
  KeyRound,
  Lock,
  Network,
  ScanSearch,
  Server,
  Shield,
} from "lucide-react";

function OrbitIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-[52px] items-center justify-center rounded-full border border-(--landing-brand-fill)/30 bg-background text-(--landing-brand-fill) shadow-sm">
      {children}
    </div>
  );
}

export function SecondBentoAnimation() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-20 w-full bg-gradient-to-t from-background to-transparent"></div>
      <div className="pointer-events-none absolute top-0 left-0 z-20 h-20 w-full bg-gradient-to-b from-background to-transparent"></div>

      <div className="absolute top-1/2 left-1/2 z-30 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-full bg-(--landing-brand-fill) p-2 md:bottom-0 md:top-auto">
        <Icons.logo className="size-10 text-white" />
      </div>
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <div className="relative flex h-full w-full translate-y-0 items-center justify-center md:translate-y-32">
          <OrbitingCircles
            index={0}
            iconSize={60}
            radius={100}
            reverse
            speed={1}
          >
            <OrbitIcon>
              <Shield className="size-7" aria-hidden />
            </OrbitIcon>
            <OrbitIcon>
              <GitPullRequest className="size-7" aria-hidden />
            </OrbitIcon>
            <OrbitIcon>
              <ScanSearch className="size-7" aria-hidden />
            </OrbitIcon>
          </OrbitingCircles>

          <OrbitingCircles index={1} iconSize={60} speed={0.5}>
            <OrbitIcon>
              <Lock className="size-7" aria-hidden />
            </OrbitIcon>
            <OrbitIcon>
              <Bug className="size-7" aria-hidden />
            </OrbitIcon>
            <OrbitIcon>
              <FileWarning className="size-7" aria-hidden />
            </OrbitIcon>
          </OrbitingCircles>

          <OrbitingCircles
            index={2}
            iconSize={60}
            radius={230}
            reverse
            speed={0.5}
          >
            <OrbitIcon>
              <KeyRound className="size-7" aria-hidden />
            </OrbitIcon>
            <OrbitIcon>
              <Server className="size-7" aria-hidden />
            </OrbitIcon>
            <OrbitIcon>
              <Network className="size-7" aria-hidden />
            </OrbitIcon>
          </OrbitingCircles>
        </div>
      </div>
    </div>
  );
}
