"use client";

import { motion, type Variants } from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";

interface TimelineContentProps {
  children: React.ReactNode;
  animationNum: number;
  timelineRef: RefObject<HTMLElement>;
  customVariants?: Variants;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function TimelineContent({
  children,
  animationNum,
  timelineRef,
  customVariants,
  className = "",
  as: Component = "div",
}: TimelineContentProps) {
  const [inView, setInView] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
  };

  const variants = customVariants || defaultVariants;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      {
        threshold: 0.1,
        root: null,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      ref={elementRef as any}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      custom={animationNum}
      variants={variants}
      className={className}
      // @ts-ignore
      as={Component}
    >
      {children}
    </motion.div>
  );
}
