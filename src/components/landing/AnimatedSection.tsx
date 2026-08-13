"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** stagger index: 0,1,2... */
  index?: number;
  y?: number;
  as?: "div" | "section" | "li" | "article";
};

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: (i ?? 0) * 0.08,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

/**
 * AnimatedSection — fade-in + slide-up on scroll (Intersection Observer).
 * Used for sections and cards. Use `index` to stagger children.
 */
export function AnimatedSection({
  children,
  className,
  delay = 0,
  index = 0,
  y = 24,
  as = "div",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            delay: delay + index * 0.08,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}

export { containerVariants };
