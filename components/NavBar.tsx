import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { label: "Product", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Research", href: "/health-algorithm" },
  { label: "Support", href: "/legal/privacy" },
];

const statusBadges = [
  { label: "Demo sync", value: "Live", tone: "text-emerald-600 bg-emerald-100/70" },
  { label: "Reliability", value: "99.4%", tone: "text-blue-600 bg-blue-100/70" },
];

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-3xl">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <Surface
          variant="glass"
          className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[28px] px-6 py-4 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="absolute inset-0 pointer-events-none opacity-80">
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_55%)]" />
          </div>

          <div className="relative flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-slate-900">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-indigo-400/40">
                PH
              </span>
              <span className="leading-tight">
                Pet Health
                <span className="block text-xs font-medium uppercase tracking-[0.35em] text-slate-400">
                  Radiant OS
                </span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-sm font-semibold text-slate-500 shadow-inner shadow-slate-200">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1 transition-all hover:bg-slate-900 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {statusBadges.map((badge) => (
                <div
                  key={badge.label}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]",
                    badge.tone
                  )}
                >
                  <span className="text-[10px] text-slate-400 mr-1">{badge.label}</span>
                  {badge.value}
                </div>
              ))}
            </div>
            <Link href="/waitlist" passHref>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border border-white/60 bg-white/70 px-5 text-sm font-semibold text-slate-600 shadow-none transition hover:-translate-y-0.5 hover:text-slate-900"
              >
                Join Waitlist
              </Button>
            </Link>
            <Link href="/auth/login" passHref>
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-5 text-sm font-semibold shadow-lg shadow-indigo-400/50 transition hover:-translate-y-0.5"
              >
                Launch App
              </Button>
            </Link>
          </div>
        </Surface>
      </div>
    </nav>
  );
}
