"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Scrolls to `location.hash` on `/` — Next.js client navigations do not always apply native hash scrolling. */
export function LandingHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    scrollToHash();
    const t = window.setTimeout(scrollToHash, 150);

    const onHashChange = () => scrollToHash();
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  return null;
}
