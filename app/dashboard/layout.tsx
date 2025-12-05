"use client";

import { SidebarNav } from "@/components/SidebarNav";
import { MobileNav } from "@/components/MobileNav";
import { HealthProvider } from "@/lib/health-context";
import { RadiantAssistant } from "@/components/RadiantAssistant";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <HealthProvider>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 paw-pattern">
        {/* Playful pet blobs */}
        <div className="pebble-blob pebble-blob-1" />
        <div className="pebble-blob pebble-blob-2" />
        <div className="pebble-blob pebble-blob-3" />
        {/* Premium Background gradient blobs - Animated */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-40 -top-32 h-[620px] w-[620px] animate-pulse rounded-full bg-gradient-to-br from-indigo-200/40 via-blue-200/30 to-pink-200/20 blur-[140px]"
            style={{ animationDuration: "3s" }}
          />
          <div
            className="absolute -left-24 bottom-0 h-[520px] w-[520px] animate-pulse rounded-full bg-gradient-to-tr from-sky-200/40 via-cyan-200/30 to-emerald-200/20 blur-[160px]"
            style={{ animationDuration: "3s" }}
          />
          <div
            className="absolute right-1/3 top-1/2 h-[420px] w-[420px] animate-pulse rounded-full bg-gradient-to-br from-purple-100/20 to-violet-100/10 blur-[120px]"
            style={{ animationDuration: "4s" }}
          />
        </div>

        {/* Mobile Navigation - Always on top */}
        <div className="lg:hidden">
          <MobileNav onAssistantSummon={() => setAssistantOpen(true)} />
        </div>

        {/* Main Content Container - Premium Responsive Layout */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1680px] gap-3 px-3 pb-20 pt-3 sm:gap-4 sm:px-4 sm:pb-24 md:gap-5 md:px-5 lg:gap-6 lg:px-6 lg:pb-16 lg:pt-6 xl:gap-8 xl:px-8 2xl:gap-10 2xl:px-10">
          {/* Desktop Sidebar - Hidden on mobile/tablet */}
          <SidebarNav onAssistantSummon={() => setAssistantOpen(true)} />

          {/* Main Content Area - Premium Glassmorphism */}
          <main className="w-full flex-1 overflow-visible rounded-[20px] border border-white/50 bg-white/80 p-3 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_48px_rgba(15,23,42,0.12)] sm:rounded-[24px] sm:p-5 md:rounded-[28px] md:p-6 lg:rounded-[32px] lg:p-8 xl:rounded-[36px] xl:p-10 2xl:p-12">
            <div className="mx-auto w-full max-w-[1200px] space-y-6 sm:space-y-7 md:space-y-8 lg:space-y-10 xl:space-y-12">{children}</div>
          </main>
        </div>
      </div>
      <RadiantAssistant open={assistantOpen} onOpenChange={setAssistantOpen} />
    </HealthProvider>
  );
}
