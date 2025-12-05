'use client';

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  Droplet,
  Heart,
  Loader2,
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
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PillSwitcher } from "@/components/ui/PillSwitcher";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { HealthMetricCard } from "@/components/dashboard/HealthMetricCard";
import { getScoreColor } from "@/lib/unified-health-system";
import { useHealth } from "@/lib/health-context";
import { cn } from "@/lib/utils";
import { AlertService } from "@/lib/services";
import { EmptyDashboard } from "@/components/onboarding";

export default function Dashboard() {
  const router = useRouter();
  const { pets, alerts, appointments, petScores, loading, reload } = useHealth();
  const [resolvingAlert, setResolvingAlert] = useState<string>("");
  const [petTab, setPetTab] = useState<"overview" | "vaccinations" | "activity">("overview");
  const [activeScheduleDay, setActiveScheduleDay] = useState(0);

  const showEmpty = !loading && pets.length === 0;

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
    const trackedWeights = pets
      .map((pet) => pet.weight)
      .filter((weight): weight is number => typeof weight === "number" && !Number.isNaN(weight));
    const avgWeight =
      trackedWeights.length > 0
        ? trackedWeights.reduce((sum, weight) => sum + weight, 0) / trackedWeights.length
        : 0;
    const weightSparkline = (trackedWeights.length ? trackedWeights : [avgWeight || 0]).slice(-9);

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

    const scoreValues = Array.from(petScores.values()).map((score) => score.overall);
    const avgScore = scoreValues.length
      ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
      : 0;
    const scoreSparkline = (scoreValues.length ? scoreValues : [avgScore]).slice(-9);

    return [
      {
        title: "Weight tracking",
        value: avgWeight.toFixed(1),
        unit: trackedWeights.length ? "kg avg" : undefined,
        trend: "neutral" as const,
        trendValue: `${trackedWeights.length}/${pets.length} logged`,
        trendLabel: "tracked pets",
        icon: TrendingDown,
        sparklineData: weightSparkline,
        color: "green",
        context: "Uses the latest weight saved for each pet. Update weights after every vet visit.",
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
        trend: "neutral" as const,
        trendValue: `${petScores.size} synced`,
        trendLabel: "pets",
        icon: Heart,
        sparklineData: scoreSparkline,
        color: "purple",
        context: "Average of each pet’s unified health score calculated from weight, alerts, and appointments.",
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

  const heroPet = pets[0] || null;
  const heroScore = heroPet ? petScores.get(heroPet.id) : null;

  const nextAppt = stats.nextAppointment;

  const formatAppointmentTime = (value?: string | null) => {
    if (!value) return "Awaiting details";
    try {
      return format(new Date(value), "EEE, MMM d • h:mm a");
    } catch {
      return "Scheduled";
    }
  };

  const quickStats = [
    {
      label: "Household pets",
      value: stats.totalPets,
      caption: "In your household",
      icon: Users,
      tone: "from-sky-500/90 to-blue-500/80",
    },
    {
      label: "Active alerts",
      value: stats.activeAlerts,
      caption: "Need action",
      icon: AlertCircle,
      tone: "from-amber-500/90 to-orange-500/80",
    },
    {
      label: "Average score",
      value: `${stats.avgHealthScore}`,
      caption: "Across all pets",
      icon: Target,
      tone: "from-pink-500/90 to-rose-500/80",
    },
    {
      label: "Next checkup",
      value: nextAppt ? formatDistanceToNow(new Date(nextAppt.date), { addSuffix: true }) : "None",
      caption: nextAppt ? nextAppt.title : "Schedule soon",
      icon: CalendarDays,
      tone: "from-indigo-500/90 to-purple-500/80",
    },
  ];

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-slate-500">
        <div className="flex gap-2">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-300"
              style={{ animationDelay: `${dot * 120}ms` }}
            />
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">
          Syncing dashboard…
        </p>
      </div>
    );
  }

  if (showEmpty) {
    return <EmptyDashboard />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-6 pt-0 sm:space-y-6 sm:pb-8 sm:pt-0 lg:space-y-8 lg:pb-12">
      <Surface variant="glass" className="rounded-[32px] border-white/60 bg-white/85 p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8">
        <SectionHeader
          eyebrow="Unified overview"
          title={`${greeting}, here is your pet health cockpit.`}
          description="Track every signal, anticipate issues early, and keep your companions thriving."
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
              <Button
                className="w-full rounded-full border-0 bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs text-white shadow-lg shadow-indigo-400/30 sm:w-auto sm:px-5 sm:text-sm"
                onClick={() => router.push("/dashboard/health/add-record")}
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Add health record
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-slate-200/80 px-4 py-2 text-xs text-slate-600 hover:text-slate-900 sm:w-auto sm:px-5 sm:text-sm"
                onClick={() => router.push("/dashboard/appointments/new")}
              >
                Schedule appointment
              </Button>
            </div>
          }
        />
      </Surface>

      <Surface
        variant="gradient"
        className="relative overflow-hidden rounded-[36px] border border-white/40 p-4 sm:p-6 lg:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_60%)]" />
        <div className="relative grid gap-6 sm:gap-8 xl:grid-cols-[minmax(0,1.8fr),minmax(320px,1fr)]">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] sm:tracking-[0.45em] text-slate-300">Mission control</p>
                <p className="text-lg sm:text-2xl font-semibold text-slate-900">7-day health runway</p>
                <p className="text-xs sm:text-sm text-slate-600">
                  Tap a day to inspect vet visits, alerts, and automations queued for that window.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-slate-500">
                <span className="rounded-full border border-white/40 px-2 sm:px-3 py-0.5 sm:py-1">
                  <span className="text-blue-500">●</span> Live sync
                </span>
                <span className="rounded-full border border-white/40 px-2 sm:px-3 py-0.5 sm:py-1">AI co-pilot</span>
              </div>
            </div>

            <div
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {scheduleDays.map((day, idx) => (
                <button
                  key={day.id}
                  type="button"
                  className={cn(
                    "min-w-[88px] snap-center rounded-[20px] border px-4 py-3 text-left transition-all",
                    idx === activeScheduleDay
                      ? "border-white bg-white/90 text-slate-900 shadow-lg"
                      : "border-white/40 bg-white/40 text-slate-500 hover:bg-white/60"
                  )}
                  onClick={() => setActiveScheduleDay(idx)}
                >
                  <p className="text-xs uppercase tracking-[0.35em]">{day.label}</p>
                  <p className="text-2xl font-semibold">{day.day}</p>
                  {day.appointments.length > 0 && (
                    <p className="text-xs text-blue-600">{day.appointments.length} visits</p>
                  )}
                </button>
              ))}
            </div>

            <div className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Active day</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {activeSchedule ? format(activeSchedule.date, "EEEE, MMM d") : "—"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200/80 px-4 py-2 text-xs font-semibold"
                  onClick={() => router.push("/dashboard/appointments/new")}
                >
                  Plan visit
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {activeSchedule && activeSchedule.appointments.length > 0 ? (
                  activeSchedule.appointments.slice(0, 2).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100/80 bg-white/80 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900/5 p-2">
                          <Calendar className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{appt.title}</p>
                          <p className="text-xs text-slate-500">{formatAppointmentTime(appt.date)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => router.push(`/dashboard/appointments/${appt.id}`)}
                      >
                        Details <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No visits queued. Tap a date and schedule the next weight check or lab review.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/40 bg-white/85 p-6 shadow-[0_45px_90px_rgba(15,23,42,0.12)]">
            {heroPet && heroScore ? (
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="relative h-36 w-36">
                    <ProgressRing
                      progress={heroScore.overall}
                      size={144}
                      strokeWidth={8}
                      color={getScoreColor(heroScore.overall)}
                      showPercentage={false}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-semibold text-slate-900">{heroScore.overall}</span>
                      <span className="text-xs uppercase tracking-[0.35em] text-slate-400">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Lead pet</p>
                    <p className="text-2xl font-semibold text-slate-900">{heroPet.name}</p>
                    <p className="text-sm text-slate-500">
                      Updated{" "}
                      {heroPet.createdAt
                        ? formatDistanceToNow(new Date(heroPet.createdAt), { addSuffix: true })
                        : "recently"}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 rounded-full px-4 py-2 text-xs font-semibold"
                      onClick={() => router.push(`/dashboard/pets/${heroPet.id}`)}
                    >
                      View profile
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100/70 bg-slate-50/80 p-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Alert load</p>
                    <p className="text-xl font-semibold text-slate-900">{unresolvedAlerts.length}</p>
                    <p className="text-xs text-slate-500">{resolvedAlertsCount} resolved</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100/70 bg-slate-50/80 p-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Upcoming</p>
                    <p className="text-xl font-semibold text-slate-900">{upcomingAppointments.length}</p>
                    <p className="text-xs text-slate-500">
                      {upcomingAppointments[0] ? formatAppointmentTime(upcomingAppointments[0].date) : "No visits"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-500">
                <p>Connect a pet profile to unlock live wellness monitoring.</p>
                <Button
                  className="rounded-full px-5 py-2 text-sm"
                  onClick={() => router.push("/dashboard/pets")}
                >
                  Add a pet
                </Button>
              </div>
            )}
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Surface
              key={stat.label}
              variant="glass"
              interactive={false}
              className="p-4 sm:p-5"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.tone} p-2.5 sm:p-3 text-white shadow-lg shadow-slate-900/10 flex-shrink-0`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400 truncate">{stat.label}</p>
                  <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-slate-900 truncate">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">{stat.caption}</p>
                </div>
              </div>
            </Surface>
          );
        })}
      </div>

      {aggregateMetrics && (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Unified metrics"
            title="Signals you can act on"
            description="Each card is powered by the data you actually log: weights, appointments, and alerts."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {aggregateMetrics.map((metric) => (
              <HealthMetricCard key={metric.title} {...metric} />
            ))}
          </div>
        </section>
      )}

      <Surface variant="panel" className="space-y-4 sm:space-y-5 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="label-text text-slate-400 text-xs sm:text-sm">Pet roster</p>
            <p className="text-base sm:text-lg font-semibold text-slate-900">Manage every companion</p>
          </div>
          <PillSwitcher
            options={petTabs}
            value={petTab}
            onChange={(value) => setPetTab(value as typeof petTab)}
          />
        </div>
        {pets.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Heart className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No pets yet. Load demo data to explore.</p>
            <Button className="mt-4 rounded-full px-5 py-2 text-sm" onClick={reload}>
              Reload demo data
            </Button>
          </div>
        ) : petTab !== "overview" ? (
          <div className="rounded-2xl border border-slate-100 bg-white/70 p-6 text-sm text-slate-500">
            {petTab === "vaccinations"
              ? "Vaccination tracking will be available once medical records are connected."
              : "Activity-specific insights are coming soon."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {pets.map((pet, index) => {
              const score = petScores.get(pet.id);
              return (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/dashboard/pets/${pet.id}`}>
                    <Surface variant="glass" className="h-full overflow-hidden p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-slate-500">{pet.species}</p>
                          <p className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{pet.name}</p>
                        </div>
                        {score && (
                          <>
                            <div className="relative h-12 w-12 flex-shrink-0 sm:hidden">
                              <ProgressRing
                                progress={score.overall}
                                size={48}
                                strokeWidth={4}
                                color={getScoreColor(score.overall)}
                                showPercentage={false}
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-semibold text-slate-900">
                                {score.overall}
                              </div>
                            </div>
                            <div className="relative h-16 w-16 flex-shrink-0 hidden sm:block">
                              <ProgressRing
                                progress={score.overall}
                                size={64}
                                strokeWidth={5}
                                color={getScoreColor(score.overall)}
                                showPercentage={false}
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold text-slate-900">
                                {score.overall}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500">
                        Updated {pet.createdAt ? formatDistanceToNow(new Date(pet.createdAt), { addSuffix: true }) : 'recently'}
                      </p>
                    </Surface>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </Surface>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Surface variant="panel" className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-text text-slate-400 text-xs sm:text-sm">Active alerts</p>
              <p className="text-base sm:text-lg font-semibold text-slate-900">What needs attention</p>
            </div>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {unresolvedAlerts.length === 0 && (
              <p className="text-sm text-slate-500">No alerts open. Great work!</p>
            )}
            {unresolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border p-4 ${
                  alert.severity === "high"
                    ? "border-red-200 bg-red-50/80"
                    : alert.severity === "medium"
                    ? "border-amber-200 bg-amber-50/80"
                    : "border-blue-200 bg-blue-50/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{alert.message}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 hover:bg-white"
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={resolvingAlert === alert.id}
                  >
                    {resolvingAlert === alert.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                    ) : (
                      "Resolve"
                    )}
                  </Button>
                </div>
                {alert.recommendation && (
                  <p className="mt-1 text-xs text-slate-600">{alert.recommendation}</p>
                )}
                <p className="text-xs text-slate-400">Raised {format(new Date(alert.createdAt), "MMM d")}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface variant="panel" className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-text text-slate-400 text-xs sm:text-sm">Upcoming care</p>
              <p className="text-base sm:text-lg font-semibold text-slate-900">Stay ahead of appointments</p>
            </div>
            <Button
              variant="ghost"
              className="text-[10px] sm:text-xs font-semibold text-blue-600 p-1 sm:p-2"
              onClick={() => router.push("/dashboard/appointments")}
            >
              View all
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.length === 0 && (
              <p className="text-sm text-slate-500">No scheduled appointments.</p>
            )}
            {upcomingAppointments.slice(0, 3).map((appt) => (
              <div key={appt.id} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{appt.title || 'Appointment'}</span>
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">
                  {appt.date ? format(new Date(appt.date), "MMM d, yyyy") : 'TBD'} {appt.time ? `• ${appt.time}` : ""}
                </p>
                {appt.veterinarian && (
                  <p className="text-xs text-slate-500">{appt.veterinarian}</p>
                )}
                {appt.location && <p className="text-xs text-slate-400">{appt.location}</p>}
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
