/**
 * Typography System
 * Consistent type scale and hierarchy following modern design principles
 */

/**
 * Display text - Large headlines and hero sections
 */
export const display = {
  xl: "text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-none",
  lg: "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight",
  md: "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight",
  sm: "text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight"
};

/**
 * Headings - Section and component headers
 */
export const heading = {
  h1: "text-3xl sm:text-4xl font-semibold tracking-tight leading-tight",
  h2: "text-2xl sm:text-3xl font-semibold tracking-tight leading-snug",
  h3: "text-xl sm:text-2xl font-semibold leading-snug",
  h4: "text-lg sm:text-xl font-semibold leading-snug",
  h5: "text-base sm:text-lg font-semibold leading-normal",
  h6: "text-sm sm:text-base font-semibold leading-normal"
};

/**
 * Body text - Main content and paragraphs
 */
export const body = {
  xl: "text-xl leading-relaxed",
  lg: "text-lg leading-relaxed",
  base: "text-base leading-relaxed",
  sm: "text-sm leading-normal",
  xs: "text-xs leading-normal"
};

/**
 * Labels and UI text - Form labels, buttons, badges
 */
export const label = {
  lg: "text-sm font-medium leading-none",
  base: "text-xs font-medium leading-none tracking-wide uppercase",
  sm: "text-[11px] font-semibold leading-none tracking-wider uppercase"
};

/**
 * Eyebrow/Overline text - Section labels and categories
 */
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.2em] text-gray-500";

/**
 * Captions - Supplementary text and metadata
 */
export const caption = {
  base: "text-xs text-gray-500 leading-normal",
  sm: "text-[11px] text-gray-400 leading-normal"
};

/**
 * Code text - Monospace and technical content
 */
export const code = {
  inline: "font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded",
  block: "font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"
};

/**
 * Reading width constraints for optimal line length
 * Recommended: 50-75 characters per line
 */
export const prose = {
  narrow: "max-w-prose-narrow", // ~45ch
  base: "max-w-prose", // ~65ch
  wide: "max-w-prose-wide" // ~85ch
};

/**
 * Text colors with semantic meaning
 */
export const textColors = {
  primary: "text-gray-900",
  secondary: "text-gray-600",
  tertiary: "text-gray-400",
  inverse: "text-white",
  success: "text-emerald-600",
  warning: "text-orange-600",
  error: "text-red-600",
  info: "text-blue-600"
};

/**
 * Combined typography utility object
 */
export const typography = {
  display,
  heading,
  body,
  label,
  eyebrow,
  caption,
  code,
  prose,
  textColors
};

/**
 * Utility function to build typography classes
 */
export function buildTypographyClass(
  category: 'display' | 'heading' | 'body' | 'label' | 'caption',
  size: string,
  color?: keyof typeof textColors
): string {
  const baseClass = typography[category][size as keyof typeof typography[typeof category]];
  const colorClass = color ? textColors[color] : '';
  return `${baseClass} ${colorClass}`.trim();
}

/**
 * Responsive text utilities
 */
export const responsive = {
  hideOnMobile: "hidden sm:inline",
  hideOnDesktop: "sm:hidden",
  truncate: "truncate overflow-hidden text-ellipsis whitespace-nowrap",
  clamp: (lines: number) => `line-clamp-${lines} overflow-hidden`
};

/**
 * Text alignment utilities
 */
export const align = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify"
};

/**
 * Font weight utilities
 */
export const weight = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold"
};

/**
 * Text decoration utilities
 */
export const decoration = {
  underline: "underline decoration-2 underline-offset-2",
  lineThrough: "line-through",
  none: "no-underline"
};

/**
 * Export default typography system
 */
export default typography;
