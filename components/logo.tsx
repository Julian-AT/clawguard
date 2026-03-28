import Image from "next/image";
import { cn } from "@/lib/utils";

export type ClawGuardLogoProps = {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  title?: string;
};

/** ClawGuard mark from `/logo.svg` (square). Size via className, e.g. `size-8` or `h-10 w-10`. */
export function ClawGuardLogo({
  className,
  "aria-hidden": ariaHidden = true,
  title,
}: ClawGuardLogoProps) {
  const hidden = ariaHidden === true || ariaHidden === "true";
  const label = title ?? "ClawGuard";

  return (
    <Image
      src="/logo.svg"
      alt={hidden ? "" : label}
      width={1080}
      height={1080}
      decoding="async"
      unoptimized
      className={cn("shrink-0 object-contain", className)}
      aria-hidden={hidden ? true : undefined}
    />
  );
}
