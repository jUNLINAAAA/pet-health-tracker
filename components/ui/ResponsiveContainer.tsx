"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
}

/**
 * Responsive container component with mobile-first design
 * Usage:
 * <ResponsiveContainer maxWidth="lg">
 *   <YourContent />
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  children,
  className,
  maxWidth = "full",
  padding = true,
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        padding && "px-3 sm:px-4 md:px-5 lg:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    mobile?: 1 | 2;
    tablet?: 2 | 3 | 4;
    desktop?: 2 | 3 | 4 | 5 | 6;
  };
  gap?: "sm" | "md" | "lg";
}

/**
 * Responsive grid component with breakpoint-based columns
 * Usage:
 * <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }}>
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 */
export function ResponsiveGrid({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "md",
}: ResponsiveGridProps) {
  const mobileColsClass = cols.mobile === 2 ? "grid-cols-2" : "grid-cols-1";
  const tabletColsClass = cols.tablet ? `md:grid-cols-${cols.tablet}` : "";
  const desktopColsClass = cols.desktop ? `lg:grid-cols-${cols.desktop}` : "";

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4 md:gap-5",
    lg: "gap-5 md:gap-6 lg:gap-8",
  };

  return (
    <div
      className={cn(
        "grid",
        mobileColsClass,
        tabletColsClass,
        desktopColsClass,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg" | "xl";
  direction?: "vertical" | "horizontal-mobile" | "horizontal-tablet" | "horizontal-desktop";
}

/**
 * Responsive stack component for vertical/horizontal layouts
 * Usage:
 * <ResponsiveStack spacing="lg" direction="horizontal-tablet">
 *   <Item />
 *   <Item />
 * </ResponsiveStack>
 */
export function ResponsiveStack({
  children,
  className,
  spacing = "md",
  direction = "vertical",
}: ResponsiveStackProps) {
  const spacingClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-3 sm:gap-4 lg:gap-5",
    lg: "gap-4 sm:gap-5 lg:gap-6",
    xl: "gap-5 sm:gap-6 lg:gap-8",
  };

  const directionClasses = {
    vertical: "flex flex-col",
    "horizontal-mobile": "flex flex-row",
    "horizontal-tablet": "flex flex-col md:flex-row md:items-center",
    "horizontal-desktop": "flex flex-col lg:flex-row lg:items-center",
  };

  return (
    <div className={cn(directionClasses[direction], spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}
