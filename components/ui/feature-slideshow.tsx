"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { motion, useInView } from "motion/react";
import type React from "react";
import { forwardRef, type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AccordionItemProps = {
  children: React.ReactNode;
  className?: string;
} & Accordion.AccordionItemProps;

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <Accordion.Item
      className={cn("mt-px overflow-hidden focus-within:relative focus-within:z-10", className)}
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Accordion.Item>
  ),
);
AccordionItem.displayName = "AccordionItem";

type AccordionTriggerProps = {
  children: React.ReactNode;
  className?: string;
};

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <Accordion.Header className="flex">
      <Accordion.Trigger
        className={cn(
          "group flex h-[45px] flex-1 cursor-pointer items-center justify-between p-3 text-[15px] leading-none outline-none",
          className,
        )}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Accordion.Trigger>
    </Accordion.Header>
  ),
);
AccordionTrigger.displayName = "AccordionTrigger";

type AccordionContentProps = {
  children: ReactNode;
  className?: string;
} & Accordion.AccordionContentProps;

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <Accordion.Content
      className={cn(
        "overflow-hidden text-[15px] font-medium data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down",
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      <div className="p-3">{children}</div>
    </Accordion.Content>
  ),
);
AccordionContent.displayName = "AccordionContent";

type FeatureItem = {
  id: number;
  title: string;
  content: string;
  image?: string;
  video?: string;
};
type FeatureProps = {
  collapseDelay?: number;
  ltr?: boolean;
  linePosition?: "left" | "right" | "top" | "bottom";
  lineColor?: string;
  featureItems: FeatureItem[];
};

export const Feature = ({
  collapseDelay = 5000,
  ltr = false,
  linePosition = "left",
  lineColor = "bg-neutral-500 dark:bg-white",
  featureItems,
}: FeatureProps) => {
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [previousIndex, setPreviousIndex] = useState<number>(-1);

  const carouselRef = useRef<HTMLUListElement>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    amount: 0.5,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isInView) {
        setCurrentIndex(0);
      } else {
        setCurrentIndex(-1);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isInView]);

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const card = carouselRef.current.querySelectorAll(".card")[index];
      if (card) {
        const cardRect = card.getBoundingClientRect();
        const carouselRect = carouselRef.current.getBoundingClientRect();
        const offset =
          cardRect.left - carouselRect.left - (carouselRect.width - cardRect.width) / 2;

        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollLeft + offset,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex !== undefined ? (prevIndex + 1) % featureItems.length : 0,
      );
    }, collapseDelay);

    return () => clearInterval(timer);
  }, [collapseDelay, featureItems.length]);

  useEffect(() => {
    const handleAutoScroll = () => {
      const nextIndex = (currentIndex !== undefined ? currentIndex + 1 : 0) % featureItems.length;
      scrollToIndex(nextIndex);
    };

    const autoScrollTimer = setInterval(handleAutoScroll, collapseDelay);

    return () => clearInterval(autoScrollTimer);
  }, [collapseDelay, currentIndex, featureItems.length, scrollToIndex]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      const handleScroll = () => {
        const scrollLeft = carousel.scrollLeft;
        const cardWidth = carousel.querySelector(".card")?.clientWidth || 0;
        const newIndex = Math.min(Math.floor(scrollLeft / cardWidth), featureItems.length - 1);
        setCurrentIndex(newIndex);
      };

      carousel.addEventListener("scroll", handleScroll);
      return () => carousel.removeEventListener("scroll", handleScroll);
    }
  }, [featureItems.length]);

  useEffect(() => {
    if (currentIndex !== previousIndex) {
      setImageLoaded(false);
      setPreviousIndex(currentIndex);
    }
  }, [currentIndex, previousIndex]);

  const renderMedia = () => {
    const currentItem = featureItems[currentIndex];

    if (!currentItem) {
      return (
        <div className="aspect-auto h-full w-full animate-pulse rounded-xl border border-white/25 bg-(--landing-brand-fill)/40 p-1" />
      );
    }

    if (currentItem.image) {
      return (
        <div className="relative h-full w-full overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 rounded-xl border border-white/25 bg-(--landing-brand-fill)/35",
              "transition-all duration-150",
              imageLoaded ? "opacity-0" : "opacity-100",
            )}
          />

          <motion.img
            key={currentIndex}
            src={currentItem.image}
            alt={currentItem.title}
            className={cn(
              "aspect-auto h-full w-full rounded-xl border border-white/25 object-cover p-1",
              "transition-all duration-300",
              imageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl",
            )}
            initial={{
              opacity: 0,
              filter: "blur(5px)",
            }}
            animate={{
              opacity: imageLoaded ? 1 : 0,
              filter: imageLoaded ? "blur(0px)" : "blur(5px)",
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            onLoad={() => setImageLoaded(true)}
            loading="eager"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      );
    }

    if (currentItem.video) {
      return (
        <video
          preload="auto"
          src={currentItem.video}
          className="aspect-auto h-full w-full rounded-lg object-cover"
          autoPlay
          loop
          muted
          playsInline // Better mobile support
        />
      );
    }

    return (
      <div className="aspect-auto h-full w-full rounded-xl border border-white/25 bg-(--landing-brand-fill)/35 p-1" />
    );
  };

  return (
    <div ref={ref} className="w-full">
      <div className="flex w-full flex-col items-center justify-center max-w-7xl mx-auto">
        <div className="grid h-full grid-cols-5 gap-x-10 px-10 md:px-20 items-center w-full">
          <div
            className={`col-span-2 w-full h-full hidden lg:flex md:items-center ${
              ltr ? "md:order-2 md:justify-end" : "justify-start"
            }`}
          >
            <Accordion.Root
              className="w-full h-full flex flex-col gap-8"
              type="single"
              defaultValue={`item-${currentIndex}`}
              value={`item-${currentIndex}`}
              onValueChange={(value) => setCurrentIndex(Number(value.split("-")[1]))}
            >
              {featureItems.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  className={cn(
                    "relative rounded-lg border border-border bg-card text-foreground data-[state=closed]:rounded-none data-[state=closed]:border-0",
                    "data-[state=open]:shadow-[0px_0px_0px_1px_rgba(255,255,255,0.08),0px_4px_12px_-2px_rgba(0,0,0,0.15)]",
                  )}
                  value={`item-${index}`}
                >
                  <div
                    className={cn(
                      "absolute overflow-hidden rounded-lg transition-opacity",
                      "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
                      "bg-white/25",
                      {
                        "bottom-0 top-0 h-full w-0.5 left-0": linePosition === "left",
                        "bottom-0 top-0 h-full w-0.5 right-0": linePosition === "right",
                        "left-0 right-0 top-0 h-0.5 w-full": linePosition === "top",
                        "left-0 right-0 bottom-0 h-0.5 w-full": linePosition === "bottom",
                      },
                    )}
                    data-state={currentIndex === index ? "open" : "closed"}
                  >
                    <div
                      className={cn(
                        "absolute transition-all ease-linear",
                        lineColor,
                        {
                          "left-0 top-0 w-full": ["left", "right"].includes(linePosition),
                          "left-0 top-0 h-full": ["top", "bottom"].includes(linePosition),
                        },
                        currentIndex === index
                          ? ["left", "right"].includes(linePosition)
                            ? "h-full"
                            : "w-full"
                          : ["left", "right"].includes(linePosition)
                            ? "h-0"
                            : "w-0",
                      )}
                      style={{
                        transitionDuration: currentIndex === index ? `${collapseDelay}ms` : "0s",
                      }}
                    />
                  </div>
                  <AccordionTrigger className="text-left text-lg font-semibold tracking-tight text-foreground">
                    {item.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-medium text-muted-foreground">
                    {item.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion.Root>
          </div>
          <div
            className={`col-span-5 h-[350px] min-h-[200px] w-auto lg:col-span-3 ${
              ltr && "md:order-1"
            }`}
          >
            {renderMedia()}
          </div>

          <ul
            ref={carouselRef}
            className="col-span-5 flex snap-x flex-nowrap overflow-x-auto [-ms-overflow-style:none] [-webkit-mask-image:linear-gradient(90deg,transparent,black_10%,white_90%,transparent)] [mask-image:linear-gradient(90deg,transparent,black_10%,white_90%,transparent)] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden snap-mandatory"
            style={{
              padding: "50px calc(50%)",
            }}
          >
            {featureItems.map((item, index) => (
              <a
                key={item.id}
                className="card relative grid h-full max-w-64 shrink-0 items-start justify-center border-b border-l border-t border-border bg-card p-3 text-foreground last:border-r first:rounded-tl-xl last:rounded-tr-xl"
                onClick={() => setCurrentIndex(index)}
                style={{
                  scrollSnapAlign: "center",
                }}
              >
                <div
                  className={cn(
                    "absolute overflow-hidden rounded-lg transition-opacity",
                    "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
                    "bg-white/25",
                    {
                      "bottom-0 top-0 h-full w-0.5 left-0": linePosition === "left",
                      "bottom-0 top-0 h-full w-0.5 right-0": linePosition === "right",
                      "left-0 right-0 top-0 h-0.5 w-full": linePosition === "top",
                      "left-0 right-0 bottom-0 h-0.5 w-full": linePosition === "bottom",
                    },
                  )}
                  data-state={currentIndex === index ? "open" : "closed"}
                >
                  <div
                    className={cn(
                      "absolute transition-all ease-linear",
                      lineColor,
                      {
                        "left-0 top-0 w-full": ["left", "right"].includes(linePosition),
                        "left-0 top-0 h-full": ["top", "bottom"].includes(linePosition),
                      },
                      currentIndex === index
                        ? ["left", "right"].includes(linePosition)
                          ? "h-full"
                          : "w-full"
                        : ["left", "right"].includes(linePosition)
                          ? "h-0"
                          : "w-0",
                    )}
                    style={{
                      transitionDuration: currentIndex === index ? `${collapseDelay}ms` : "0s",
                    }}
                  />
                </div>
                <div className="relative z-10 flex flex-col gap-2">
                  <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
                  <p className="mx-0 max-w-sm text-balance text-sm font-medium leading-relaxed text-muted-foreground">
                    {item.content}
                  </p>
                </div>
              </a>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
