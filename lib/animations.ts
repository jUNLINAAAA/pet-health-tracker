/**
 * Animation variants and utilities for Framer Motion
 * Provides consistent, accessible animations across the application
 */

import { Variants, Transition } from 'framer-motion';

/**
 * Easing curves following Material Design principles
 */
export const easings = {
  smooth: [0.16, 1, 0.3, 1] as const,
  snappy: [0.4, 0, 0.2, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  spring: { type: "spring" as const, stiffness: 200, damping: 25 },
  springSnappy: { type: "spring" as const, stiffness: 380, damping: 30 }
};

/**
 * Duration constants (in seconds)
 */
export const durations = {
  instant: 0.15,
  fast: 0.25,
  normal: 0.4,
  slow: 0.6,
  slower: 1.0
};

/**
 * Page transition variants
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.smooth }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: durations.fast }
  }
};

/**
 * Stagger animation for lists and grids
 */
export const staggerContainer: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: durations.fast }
  }
};

/**
 * Card hover animations
 */
export const cardHover: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: durations.normal, ease: easings.smooth }
  },
  tap: { scale: 0.98 }
};

/**
 * Loading animations
 */
export const loadingPulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const loadingSpinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

/**
 * Slide animations from different directions
 */
export const slideInLeft: Variants = {
  initial: { x: -100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: easings.spring
  },
  exit: { x: -100, opacity: 0 }
};

export const slideInRight: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: easings.spring
  },
  exit: { x: 100, opacity: 0 }
};

export const slideInUp: Variants = {
  initial: { y: 100, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: easings.spring
  },
  exit: { y: 100, opacity: 0 }
};

export const slideInDown: Variants = {
  initial: { y: -100, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: easings.spring
  },
  exit: { y: -100, opacity: 0 }
};

/**
 * Scale animations
 */
export const scaleIn: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", damping: 20, stiffness: 300 }
  },
  exit: { scale: 0.8, opacity: 0 }
};

export const scaleInCenter: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: easings.springSnappy
  },
  exit: { scale: 0, opacity: 0 }
};

/**
 * Fade animations
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: durations.normal }
  },
  exit: { opacity: 0 }
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.smooth }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: durations.fast }
  }
};

/**
 * Number counter animation
 */
export const numberCount: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 15, stiffness: 200 }
  }
};

/**
 * Alert/notification animations
 */
export const alertSlide: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: durations.normal, ease: easings.smooth }
  },
  exit: {
    x: 20,
    opacity: 0,
    height: 0,
    transition: { duration: durations.fast }
  }
};

/**
 * Modal/dialog animations
 */
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: durations.fast }
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast }
  }
};

export const modalContent: Variants = {
  initial: { scale: 0.95, opacity: 0, y: 20 },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.smooth }
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: 20,
    transition: { duration: durations.fast }
  }
};

/**
 * Tooltip animations
 */
export const tooltip: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 5 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.fast, ease: easings.smooth }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 5,
    transition: { duration: durations.instant }
  }
};

/**
 * Progress/loading bar animations
 */
export const progressBar = (progress: number): Variants => ({
  initial: { width: 0 },
  animate: {
    width: `${progress}%`,
    transition: { duration: durations.slow, ease: easings.smooth }
  }
});

/**
 * Accessibility: respect reduced motion preferences
 */
export const respectMotionPreference = (variants: Variants): Variants => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    };
  }
  return variants;
};

/**
 * Utility: Create stagger delay for index
 */
export const getStaggerDelay = (index: number, baseDelay = 0.1) => index * baseDelay;

/**
 * Utility: Create spring transition
 */
export const springTransition = (stiffness = 200, damping = 25): Transition => ({
  type: "spring",
  stiffness,
  damping
});

/**
 * Export all animations as a named collection
 */
export const animations = {
  pageTransition,
  staggerContainer,
  staggerItem,
  cardHover,
  loadingPulse,
  loadingSpinner,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  scaleIn,
  scaleInCenter,
  fadeIn,
  fadeInUp,
  numberCount,
  alertSlide,
  modalBackdrop,
  modalContent,
  tooltip,
  progressBar
};
