'use client';

/**
 * Premium Dashboard - iOS 26 Inspired
 *
 * Features:
 * - Animated gradient hero section
 * - Premium glassmorphic pet cards
 * - Smooth scroll animations
 * - Responsive grid system
 * - Touch-friendly interactions
 * - Loading skeletons
 * - Empty states
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarDays,
  ChevronRight,
  Heart,
  PlusCircle,
  Sparkles,
  Target,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/Surface";
import { AlertService } from "@/lib/services";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PillSwitcher } from "@/components/ui/PillSwitcher";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { HealthMetricCard } from "@/components/dashboard/HealthMetricCard";
import { PremiumPetCard } from "@/components/dashboard/PremiumPetCard";
import { PremiumDashboardHero } from "@/components/dashboard/PremiumDashboardHero";
import { getScoreColor } from "@/lib/unified-health-system";
import { useHealth } from "@/lib/health-context";
import { cn } from "@/lib/utils";

export default function PremiumDashboard() {
  const router = useRouter();
  const { pets, alerts, appointments, petScores, loading, reload } = useHealth();
  const [resolvingAlert, setResolvingAlert] = useState<string>("");
  const [petTab, setPetTab] = useState<"overview" | "vaccinations" | "activity">("overview");
  const [activeScheduleDay, setActiveScheduleDay] = useState(0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const stats = useMemo(() => {
    const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
    const upcomingAppts = appointments
      .filter((appt) => !appt.completed && appt.date)
      .sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch {
          return 0;
        }
      });

    const avgScore = pets.length > 0
      ? Math.round(
          Array.from(petScores.values()).reduce((sum, score) => sum + score.overall, 0) /
            pets.length
        )
      : 0;

    return {
      totalPets: pets.length,
      activeAlerts: unresolvedAlerts.length,
      nextAppointment: upcomingAppts[0] || null,
      avgHealthScore: avgScore,
    };
  }, [alerts, appointments, pets, petScores]);

  const aggregateMetrics = useMemo(() => {
    if (pets.length === 0) return null;

    const msInDay = 1000 * 60 * 60 * 24;

    // Get historical data from petScores (from Edge Function)
    // For meaningful sparklines, we need to handle different metrics appropriately
    const allActivityHistory: number[] = [];
    const allScoreHistory: number[] = [];
    const latestWeightsPerPet: number[] = [];

    Array.from(petScores.values()).forEach((score) => {
      // Use activity history for trend (activity minutes are comparable across pets)
      if (score.history?.activities?.length > 0) {
        allActivityHistory.push(...score.history.activities.filter((a: number) => a > 0));
      }
      // Use score history for trend (scores are 0-100 and comparable)
      if (score.history?.scores?.length > 0) {
        allScoreHistory.push(...score.history.scores.filter((s: number) => s > 0));
      }
      // For weight, only use the LATEST weight per pet (not all history)
      // because different pets have vastly different weight scales
      if (score.history?.weights?.length > 0) {
        const weights = score.history.weights.filter((w: number) => w > 0);
        if (weights.length > 0) {
          latestWeightsPerPet.push(weights[weights.length - 1]);
        }
      }
    });

    // Fallback to current pet weights if no history
    const trackedWeights = latestWeightsPerPet.length > 0
      ? latestWeightsPerPet
      : pets
          .map((pet) => pet.weight)
          .filter((weight): weight is number => typeof weight === "number" && !Number.isNaN(weight));

    const avgWeight =
      trackedWeights.length > 0
        ? trackedWeights.reduce((sum, weight) => sum + weight, 0) / trackedWeights.length
        : 0;

    // For weight sparkline, show activity trend instead (more meaningful time-series)
    // Activity minutes are comparable across pets and show engagement over time
    const weightSparkline = allActivityHistory.length > 2
      ? allActivityHistory.slice(-9)
      : (trackedWeights.length ? trackedWeights : [avgWeight || 0]).slice(-9);

    const upcomingAppts = appointments
      .filter((appt) => !appt.completed && appt.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const appointmentSparkline = (upcomingAppts.length
      ? upcomingAppts.map((appt) => {
          const date = new Date(appt.date);
          return Number.isNaN(date.getTime())
            ? 0
            : Math.max(0, (date.getTime() - Date.now()) / msInDay);
        })
      : [0]
    ).slice(-9);

    const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
    const resolvedAlerts = alerts.length - unresolvedAlerts.length;
    const alertSparkline = (unresolvedAlerts.length
      ? unresolvedAlerts.map((alert) =>
          alert.severity === "high" ? 3 : alert.severity === "medium" ? 2 : 1
        )
      : [0]
    ).slice(-9);

    // Use historical score data if available, fallback to current scores
    const scoreValues = allScoreHistory.length > 0
      ? allScoreHistory
      : Array.from(petScores.values()).map((score) => score.overall);
    const avgScore = scoreValues.length
      ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
      : 0;
    const scoreSparkline = (scoreValues.length ? scoreValues : [avgScore]).slice(-9);

    // Calculate activity stats for display
    const avgActivity = allActivityHistory.length > 0
      ? Math.round(allActivityHistory.reduce((sum, a) => sum + a, 0) / allActivityHistory.length)
      : 0;

    return [
      {
        title: "Weight tracking",
        value: avgWeight.toFixed(1),
        unit: trackedWeights.length ? "kg avg" : undefined,
        trend: allActivityHistory.length > 1 ? "up" as const : "neutral" as const,
        trendValue: allActivityHistory.length > 0
          ? `${avgActivity} min/day avg`
          : `${trackedWeights.length}/${pets.length} logged`,
        trendLabel: allActivityHistory.length > 0 ? "activity trend" : "tracked pets",
        icon: TrendingDown,
        sparklineData: weightSparkline,
        color: "green",
        context: `Average weight: ${avgWeight.toFixed(1)}kg. Chart shows activity trends (${allActivityHistory.length} data points).`,
      },
      {
        title: "Vet schedule",
        value: upcomingAppts.length,
        unit: "upcoming",
        trend: upcomingAppts.length > 0 ? "up" : "neutral",
        trendValue: upcomingAppts[0]?.date
          ? format(new Date(upcomingAppts[0].date), "MMM d")
          : "No visits",
        trendLabel: "next visit",
        icon: Calendar,
        sparklineData: appointmentSparkline,
        color: "blue",
        context: "Counts the appointments you actually scheduled in the app.",
      },
      {
        title: "Alert load",
        value: unresolvedAlerts.length,
        unit: "open",
        trend: unresolvedAlerts.length > 0 ? "down" : "up",
        trendValue: `${resolvedAlerts} resolved`,
        trendLabel: "resolved",
        icon: AlertCircle,
        sparklineData: alertSparkline,
        color: "orange",
        context: "Active alerts reflect real vet notes, reminders, or AI warnings that still need action.",
      },
      {
        title: "Score sync",
        value: avgScore,
        unit: "/100",
        trend: allScoreHistory.length > 1 ? "up" as const : "neutral" as const,
        trendValue: allScoreHistory.length > 0
          ? `${allScoreHistory.length} scores`
          : `${petScores.size} synced`,
        trendLabel: "pets",
        icon: Heart,
        sparklineData: scoreSparkline,
        color: "purple",
        context: "Average of each pet's unified health score calculated from weight, alerts, and appointments.",
      },
    ];
  }, [alerts, appointments, petScores, pets]);

  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
  const resolvedAlertsCount = alerts.length - unresolvedAlerts.length;
  const upcomingAppointments = appointments
    .filter((appt) => !appt.completed && appt.date)
    .sort((a, b) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch {
        return 0;
      }
    });

  const calendarDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + idx);
      return {
        id: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        label: format(date, "EEE"),
        day: format(date, "dd"),
        date,
      };
    });
  }, []);

  const scheduleDays = useMemo(
    () =>
      calendarDays.map((day) => ({
        ...day,
        appointments: upcomingAppointments.filter((appt) => {
          if (!appt.date) return false;
          try {
            return isSameDay(new Date(appt.date), day.date);
          } catch {
            return false;
          }
        }),
      })),
    [calendarDays, upcomingAppointments]
  );

  const activeSchedule = scheduleDays[activeScheduleDay] ?? scheduleDays[0];

  const petTabs = [
    { id: "overview", label: "Overview" },
    { id: "vaccinations", label: "Vaccinations" },
    { id: "activity", label: "Activity" },
  ];

  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlert(alertId);

    try {
      await AlertService.resolveAlert(alertId);
      toast.success("Alert resolved");
      // Reload to refresh alerts from context
      await reload();
    } catch (error) {
      console.error("Failed to resolve alert", error);
      toast.error("Failed to resolve alert");
    } finally {
      setResolvingAlert("");
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-blue-500"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm font-semibold tracking-wide text-slate-500"
        >
          Loading your dashboard...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-6 pt-0 sm:space-y-8 sm:pb-8 lg:space-y-10 lg:pb-12">
      {/* Premium Hero Section */}
      <PremiumDashboardHero
        greeting={greeting}
        stats={stats}
        onAddRecord={() => router.push("/dashboard/health/add-record")}
        onScheduleAppointment={() => router.push("/dashboard/appointments/new")}
      />

      {/* Pet Grid Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Your Pets</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage health profiles and track wellness for all your companions
            </p>
          </div>
          <PillSwitcher
            options={petTabs}
            value={petTab}
            onChange={(value) => setPetTab(value as typeof petTab)}
          />
        </div>

        {/* Pet Cards Grid */}
        {pets.length === 0 ? (
          <Surface variant="panel" className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <Heart className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">No pets yet</h3>
            <p className="mb-6 max-w-md text-sm text-slate-600">
              Add your first pet to start tracking their health and wellness journey
            </p>
            <Button
              onClick={() => router.push("/dashboard/pets/new")}
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 text-white shadow-lg hover:shadow-xl"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Your First Pet
            </Button>
          </Surface>
        ) : petTab !== "overview" ? (
          <Surface variant="panel" className="p-8 text-center">
            <p className="text-sm text-slate-600">
              {petTab === "vaccinations"
                ? "Vaccination tracking will be available once medical records are connected."
                : "Activity-specific insights are coming soon."}
            </p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pets.map((pet, index) => {
              const score = petScores.get(pet.id);
              return (
                <PremiumPetCard
                  key={pet.id}
                  pet={pet}
                  score={score}
                  delay={index * 0.1}
                  onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
                />
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Metrics Grid */}
      {aggregateMetrics && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <SectionHeader
            eyebrow="Unified Metrics"
            title="Health Insights at a Glance"
            description="Real-time data from appointments, alerts, and health records"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aggregateMetrics.map((metric, idx) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.05 }}
              >
                <HealthMetricCard {...metric} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Alerts & Appointments Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Surface variant="panel" className="h-full space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Alerts
                </p>
                <p className="text-lg font-semibold text-slate-900">What needs attention</p>
              </div>
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-3">
              {unresolvedAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">All clear!</p>
                  <p className="text-xs text-slate-500">No active alerts</p>
                </div>
              )}
              {unresolvedAlerts.slice(0, 3).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-2xl border p-4 transition-all hover:shadow-md",
                    alert.severity === "high"
                      ? "border-red-200 bg-red-50/80"
                      : alert.severity === "medium"
                      ? "border-amber-200 bg-amber-50/80"
                      : "border-blue-200 bg-blue-50/80"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{alert.message}</span>
                    <button
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      onClick={() => handleResolveAlert(alert.id)}
                      disabled={resolvingAlert === alert.id}
                    >
                      {resolvingAlert === alert.id ? "..." : "Resolve"}
                    </button>
                  </div>
                  {alert.recommendation && (
                    <p className="mt-1 text-xs text-slate-600">{alert.recommendation}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Raised {format(new Date(alert.createdAt), "MMM d")}
                  </p>
                </motion.div>
              ))}
            </div>
          </Surface>
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Surface variant="panel" className="h-full space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Upcoming Care
                </p>
                <p className="text-lg font-semibold text-slate-900">Scheduled appointments</p>
              </div>
              <Button
                variant="ghost"
                className="text-xs font-semibold text-blue-600"
                onClick={() => router.push("/dashboard/appointments")}
              >
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingAppointments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Calendar className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">No appointments</p>
                  <p className="text-xs text-slate-500">Schedule a visit</p>
                </div>
              )}
              {upcomingAppointments.slice(0, 3).map((appt) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group cursor-pointer rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm transition-all hover:shadow-lg"
                  onClick={() => router.push(`/dashboard/appointments/${appt.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {appt.title || "Appointment"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {appt.date ? format(new Date(appt.date), "MMM d, yyyy") : "TBD"}
                    {appt.time ? ` • ${appt.time}` : ""}
                  </p>
                  {appt.veterinarian && (
                    <p className="mt-1 text-xs text-slate-500">{appt.veterinarian}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </Surface>
        </motion.div>
      </div>
    </div>
  );
}
