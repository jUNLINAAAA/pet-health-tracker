"use client";

/**
 * PremiumDashboardHero Component
 *
 * Premium hero section with:
 * - Animated gradient backgrounds
 * - Floating particles effect
 * - Real-time stats with smooth animations
 * - Responsive grid layout
 * - Touch-friendly CTA buttons
 *
 * @example
 * <PremiumDashboardHero
 *   greeting="Good Morning"
 *   stats={stats}
 *   onAddRecord={() => router.push('/add')}
 * />
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useMemo } from "react";
import {
  PlusCircle,
  Calendar,
  TrendingUp,
  Zap,
  Sparkles,
  Heart,
  Activity,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalPets: number;
  activeAlerts: number;
  avgHealthScore: number;
  nextAppointment: { date: string; title: string } | null;
}

interface PremiumDashboardHeroProps {
  greeting: string;
  stats: DashboardStats;
  onAddRecord: () => void;
  onScheduleAppointment: () => void;
}

export function PremiumDashboardHero({
  greeting,
  stats,
  onAddRecord,
  onScheduleAppointment,
}: PremiumDashboardHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  // Generate floating particles
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: Math.random() * 3 + 2,
      })),
    []
  );

  const statCards = [
    {
      icon: Heart,
      label: "Your Pets",
      value: stats.totalPets,
      suffix: "companions",
      gradient: "from-rose-500 to-pink-500",
      glow: "shadow-rose-500/30",
    },
    {
      icon: Target,
      label: "Health Score",
      value: stats.avgHealthScore,
      suffix: "/100",
      gradient: "from-blue-500 to-indigo-500",
      glow: "shadow-blue-500/30",
    },
    {
      icon: Zap,
      label: "Active Alerts",
      value: stats.activeAlerts,
      suffix: "pending",
      gradient: "from-amber-500 to-orange-500",
      glow: "shadow-amber-500/30",
    },
    {
      icon: Calendar,
      label: "Next Visit",
      value: stats.nextAppointment ? "Soon" : "None",
      suffix: stats.nextAppointment?.title || "scheduled",
      gradient: "from-purple-500 to-indigo-500",
      glow: "shadow-purple-500/30",
    },
  ];

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity, scale }}
      className="relative overflow-hidden rounded-[40px] border border-white/60 bg-gradient-to-br from-white/95 via-white/85 to-slate-50/80 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:p-12"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden rounded-[40px]">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15), transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.15), transparent 50%)",
              "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15), transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.12), transparent 50%)",
              "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.12), transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.12), transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
      </div>

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-sm"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-6 w-6 text-amber-500" />
            </motion.div>
            <span className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
              Your Pet Health Dashboard
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            {greeting}
          </h1>
          <p className="mt-3 text-lg text-slate-600 md:text-xl">
            Track wellness, prevent issues, and keep your companions thriving.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 + idx * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 backdrop-blur-xl shadow-xl transition-all duration-300",
                  card.glow,
                  "hover:shadow-2xl"
                )}
              >
                {/* Gradient overlay on hover */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.05 }}
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    card.gradient
                  )}
                />

                {/* Icon */}
                <div
                  className={cn(
                    "mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
                    card.gradient,
                    card.glow
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Label */}
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>

                {/* Value */}
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {card.value}
                  </span>
                  <span className="text-sm text-slate-500">{card.suffix}</span>
                </div>

                {/* Hover indicator */}
                <motion.div
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "absolute bottom-0 left-0 h-1 bg-gradient-to-r",
                    card.gradient
                  )}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddRecord}
            className={cn(
              "group relative flex items-center justify-center gap-3 overflow-hidden rounded-full border-0 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-blue-500/40 transition-all",
              "hover:shadow-3xl hover:shadow-blue-500/50"
            )}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <PlusCircle className="h-5 w-5 transition-transform group-hover:rotate-90" />
            <span>Add Health Record</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onScheduleAppointment}
            className={cn(
              "group flex items-center justify-center gap-3 rounded-full border-2 border-slate-200/80 bg-white/90 px-8 py-4 text-base font-bold text-slate-700 shadow-lg backdrop-blur-xl transition-all",
              "hover:border-slate-300 hover:bg-white hover:shadow-xl"
            )}
          >
            <Calendar className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span>Schedule Appointment</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
}
