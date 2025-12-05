"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/ui/theme";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between",
        align === "center" && "text-center md:text-left",
        className
      )}
    >
      <div className="max-w-2xl space-y-1.5 sm:space-y-2">
        {eyebrow && <p className={cn(typography.eyebrow, "text-[10px] sm:text-[11px]")}>{eyebrow}</p>}
        <h2 className={cn(typography.title, "text-xl sm:text-2xl md:text-3xl lg:text-4xl")}>{title}</h2>
        {description && <p className="text-sm text-slate-500 sm:text-base">{description}</p>}
      </div>
      {action && <div className="flex w-full shrink-0 items-center justify-start sm:w-auto md:justify-end">{action}</div>}
    </div>
  );
}
