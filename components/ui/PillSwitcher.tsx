"use client";

import { cn } from "@/lib/utils";

interface PillOption {
  id: string;
  label: string;
  badge?: string;
}

interface PillSwitcherProps {
  options: PillOption[];
  value: string;
  onChange?(value: string): void;
  className?: string;
  size?: "sm" | "md";
}

export function PillSwitcher({
  options,
  value,
  onChange,
  className,
  size = "md",
}: PillSwitcherProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-white/60 p-1 shadow-inner shadow-white/40 backdrop-blur-xl border border-white/40",
        className
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            className={cn(
              "relative flex items-center gap-2 rounded-full px-4 font-semibold transition-all duration-200",
              size === "sm" ? "text-xs py-1.5" : "text-sm py-2.5",
              active
                ? "bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white shadow-lg shadow-primary/20"
                : "text-slate-500 hover:text-slate-800"
            )}
            onClick={() => onChange?.(option.id)}
          >
            <span>{option.label}</span>
            {option.badge && (
              <span
                className={cn(
                  "rounded-full border px-2 text-[11px]",
                  active
                    ? "border-white/40 text-white"
                    : "border-slate-200 bg-white/80 text-slate-500"
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
