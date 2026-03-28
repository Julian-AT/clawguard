"use client";

import createGlobe, { type COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

const MOVEMENT_DAMPING = 1400;

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [1, 1, 1],
  glowColor: [1, 1, 1],
  markers: [],
};

const COLORS = {
  light: {
    base: [1, 1, 1] as [number, number, number],
    glow: [1, 1, 1] as [number, number, number],
  },
  dark: {
    base: [0.4, 0.4, 0.4] as [number, number, number],
    glow: [0.24, 0.24, 0.27] as [number, number, number],
  },
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);

  const r = useMotionValue(0);
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  });
  const rsRef = useRef(rs);
  rsRef.current = rs;

  const finalConfig = useMemo(() => {
    const base = isDarkMode ? COLORS.dark.base : COLORS.light.base;
    const glow = isDarkMode ? COLORS.dark.glow : COLORS.light.glow;
    return {
      ...config,
      baseColor: base,
      glowColor: glow,
      markerColor: base,
      markers: config.markers ?? [],
      dark: isDarkMode ? 1 : 0,
      diffuse: isDarkMode ? 0.45 : 0.35,
      mapBrightness: isDarkMode ? 1.25 : 1.1,
    };
  }, [config, isDarkMode]);

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      r.set(r.get() + delta / MOVEMENT_DAMPING);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let globe: ReturnType<typeof createGlobe> | null = null;
    let rafId = 0;

    const syncWidth = () => {
      const w = container.clientWidth;
      if (w >= 8) {
        widthRef.current = w;
      }
    };

    const loop = () => {
      if (!globe) {
        syncWidth();
        const w = widthRef.current;
        if (w >= 8) {
          const side = w * 2;
          globe = createGlobe(canvas, {
            ...finalConfig,
            width: side,
            height: side,
          });
          canvas.style.opacity = "1";
        }
      } else {
        syncWidth();
        if (pointerInteracting.current === null) {
          phiRef.current += 0.0025;
        }
        const s = widthRef.current * 2;
        globe.update({
          phi: phiRef.current + rsRef.current.get(),
          width: s,
          height: s,
        });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    const ro = new ResizeObserver(syncWidth);
    ro.observe(container);
    window.addEventListener("resize", syncWidth);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", syncWidth);
      globe?.destroy();
    };
  }, [finalConfig]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 mx-auto aspect-square w-full max-w-[600px]", className)}
    >
      <canvas
        className={cn("size-full opacity-0 transition-opacity duration-500 contain-layout")}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX;
          updatePointerInteraction(e.clientX);
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  );
}
