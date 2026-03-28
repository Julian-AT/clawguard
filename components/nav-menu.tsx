"use client";

import { motion } from "motion/react";
import React, { useRef, useState } from "react";
import { siteConfig } from "@/lib/landing-config";

interface NavItem {
  name: string;
  href: string;
}

const navs: NavItem[] = siteConfig.nav.links;

export function NavMenu() {
  const ref = useRef<HTMLUListElement>(null);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isManualScroll, setIsManualScroll] = useState(false);

  React.useEffect(() => {
    const firstItem = ref.current?.querySelector(
      `[href="#${navs[0].href.substring(1)}"]`,
    )?.parentElement;
    if (firstItem) {
      const rect = firstItem.getBoundingClientRect();
      setLeft(firstItem.offsetLeft);
      setWidth(rect.width);
      setIsReady(true);
    }
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll) return;

      const sections = navs.map((item) => item.href.substring(1));

      let closestSection = sections[0];
      let minDistance = Infinity;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          const distance = Math.abs(rect.top - 100);
          if (distance < minDistance) {
            minDistance = distance;
            closestSection = section;
          }
        }
      }

      setActiveSection(closestSection);
      const navItem = ref.current?.querySelector(`[href="#${closestSection}"]`)?.parentElement;
      if (navItem) {
        const rect = navItem.getBoundingClientRect();
        setLeft(navItem.offsetLeft);
        setWidth(rect.width);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isManualScroll]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    const targetId = item.href.substring(1);
    const element = document.getElementById(targetId);

    if (!element) {
      return;
    }

    e.preventDefault();
    window.history.replaceState(window.history.state, "", `#${targetId}`);

    setIsManualScroll(true);
    setActiveSection(targetId);
    const navItem = e.currentTarget.parentElement;
    if (navItem) {
      setLeft(navItem.offsetLeft);
      setWidth(navItem.getBoundingClientRect().width);
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      setIsManualScroll(false);
    }, 900);
  };

  return (
    <div className="w-full hidden md:block">
      <ul
        className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center"
        ref={ref}
      >
        {navs.map((item) => (
          <li
            key={item.name}
            className={`z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              activeSection === item.href.substring(1)
                ? "text-primary"
                : "text-primary/60 hover:text-primary"
            } tracking-tight`}
          >
            <a href={item.href} onClick={(e) => handleClick(e, item)}>
              {item.name}
            </a>
          </li>
        ))}
        {isReady && (
          <motion.li
            animate={{ left, width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-0 my-1.5 rounded-full bg-accent/60 border border-border"
          />
        )}
      </ul>
    </div>
  );
}
