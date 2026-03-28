"use client";

import { Printer } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "print:hidden gap-1.5"
      )}
    >
      <Printer className="size-3.5" />
      Print
    </button>
  );
}
