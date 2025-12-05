import { cn } from "@/lib/utils";

export const radiantPalette = {
  primary: "#2563EB",
  primarySoft: "#4F46E5",
  accent: "#7C3AED",
  success: "#10B981",
  warning: "#F97316",
  danger: "#EF4444",
  neutral: {
    50: "#F4F6FF",
    100: "#E7EBFF",
    200: "#CBD5F5",
    400: "#7C83A5",
    600: "#4C5274",
    900: "#0F172A",
  },
};

export const surfaceVariants = {
  glass:
    "bg-white/80 backdrop-blur-3xl border border-white/40 shadow-[0_20px_40px_rgba(15,23,42,0.12)] rounded-[28px]",
  panel:
    "bg-white border border-white/40 shadow-[0_25px_60px_rgba(15,23,42,0.08)] rounded-3xl",
  gradient:
    "bg-gradient-to-br from-white via-blue-50/80 to-purple-50/70 border border-white/40 shadow-[0_25px_70px_rgba(79,70,229,0.15)] rounded-[32px]",
  subtle:
    "bg-white/70 border border-white/30 shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-4",
};

export const shadowTokens = {
  floating: "shadow-[0_20px_45px_rgba(15,23,42,0.18)]",
  hover: "shadow-[0_35px_70px_rgba(15,23,42,0.25)]",
};

export const transitionTokens = {
  default: "transition-all duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
};

export type SurfaceVariant = keyof typeof surfaceVariants;

interface SurfaceClassesOptions {
  variant?: SurfaceVariant;
  interactive?: boolean;
  bleed?: boolean;
}

export function getSurfaceClasses({
  variant = "glass",
  interactive = true,
  bleed = false,
}: SurfaceClassesOptions = {}) {
  return cn(
    surfaceVariants[variant],
    interactive && `${transitionTokens.default} hover:-translate-y-0.5 hover:${shadowTokens.hover} cursor-pointer`,
    bleed && "p-0 overflow-hidden"
  );
}

export const typography = {
  eyebrow: "text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold",
  title: "text-3xl font-semibold tracking-tight text-slate-900",
  body: "text-sm text-slate-600 leading-relaxed",
};

export const radii = {
  pill: "rounded-full",
  card: "rounded-[28px]",
  section: "rounded-[36px]",
};

export const themeTokens = {
  palette: radiantPalette,
  surfaces: surfaceVariants,
  shadows: shadowTokens,
  transitions: transitionTokens,
  radii,
  typography,
};
