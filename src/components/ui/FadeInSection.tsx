'use client';

import React, { useRef, ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const CTG_EASE = [0.33, 1, 0.68, 1] as const;

interface FadeInSectionProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
  once?: boolean;
}

export const FadeInSection: React.FC<FadeInSectionProps> = ({
  children,
  delay = 0,
  duration = 0.65,
  direction = 'up',
  distance = 12,
  className = '',
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-40px', amount: 0.08 });
  const reduceMotion = useReducedMotion();

  const entry = (() => {
    if (direction === 'up') return { opacity: [0.88, 1], y: [distance, 0], x: 0 };
    if (direction === 'down') return { opacity: [0.88, 1], y: [-distance, 0], x: 0 };
    if (direction === 'left') return { opacity: [0.88, 1], x: [distance, 0], y: 0 };
    if (direction === 'right') return { opacity: [0.88, 1], x: [-distance, 0], y: 0 };
    return { opacity: [0.9, 1], x: 0, y: 0 };
  })();

  // Progressive enhancement: SSR/no-JS output is fully visible. JavaScript may
  // add a subtle entrance only after IntersectionObserver confirms visibility.
  // No content is ever parked at opacity:0 waiting for a client-side callback.
  return (
    <motion.div
      ref={ref}
      data-reveal
      initial={false}
      animate={!reduceMotion && isInView ? entry : { opacity: 1, x: 0, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration, delay, ease: CTG_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggeredContainerProps {
  children: ReactNode;
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export const StaggeredContainer: React.FC<StaggeredContainerProps> = ({
  children,
  delay = 0,
  staggerDelay = 0.08,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      data-reveal
      initial={false}
      animate="visible"
      variants={{
        visible: {
          opacity: 1,
          transition: reduceMotion || !isInView ? { duration: 0 } : { delay, staggerChildren: staggerDelay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggeredItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({ children, className = '' }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      data-reveal
      initial={false}
      variants={{
        visible: reduceMotion
          ? { opacity: 1, y: 0 }
          : { opacity: [0.9, 1], y: [8, 0], transition: { duration: 0.55, ease: CTG_EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
