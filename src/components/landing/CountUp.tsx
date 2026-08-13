"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

type CountUpProps = {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
};

/**
 * CountUp — animates from 0 to `end` over `duration` seconds when scrolled into view.
 */
export function CountUp({
  end,
  duration = 1.6,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let raf = 0;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / (duration * 1000), 1);
      // easeOutExpo for a satisfying finish
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(end * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isInView, end, duration]);

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("fr-FR");

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
