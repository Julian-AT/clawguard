import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-24 text-center", className)}
    >
      <Icon className="size-10 text-muted-foreground/40" aria-hidden />
      <h2 className="text-lg font-medium text-muted-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground/70">{description}</p>
    </div>
  );
}
