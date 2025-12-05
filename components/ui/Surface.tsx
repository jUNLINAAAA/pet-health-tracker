"use client";

import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getSurfaceClasses, SurfaceVariant } from "@/lib/ui/theme";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  interactive?: boolean;
  bleed?: boolean;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { className, variant = "glass", interactive = true, bleed = false, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(getSurfaceClasses({ variant, interactive, bleed }), className)}
      {...props}
    />
  );
});
