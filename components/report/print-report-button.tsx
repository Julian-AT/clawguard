"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="print:hidden gap-1.5"
      onClick={() => window.print()}
    >
      <Printer className="size-3.5" />
      Print
    </Button>
  );
}
