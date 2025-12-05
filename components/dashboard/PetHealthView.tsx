"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  ClipboardList,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { HealthMetricCard } from "@/components/dashboard/HealthMetricCard";
import { InteractiveHistoryChart } from "@/components/dashboard/InteractiveHistoryChart";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PillSwitcher } from "@/components/ui/PillSwitcher";
import { getScoreColor, type UnifiedHealthScore } from "@/lib/unified-health-system";
import {
  loadPetHealthData,
  type PetHealthData,
} from "@/lib/pets/health-data";
import { usePetHealthData } from "@/lib/health-context";

interface PetHealthViewProps {
  petId: string;
  backHref?: string;
}

export function PetHealthView({ petId, backHref }: PetHealthViewProps) {
  const router = useRouter();
  const cachedData = usePetHealthData(petId);
  const [data, setData] = useState<PetHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState<"30d" | "60d">("30d");
  const [historyMetric, setHistoryMetric] = useState<"score" | "activity" | "weight">("score");
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  // Options for PillSwitcher components
  const metricOptions = [
    { value: "score", label: "Health Score" },
    { value: "activity", label: "Activity" },
    { value: "weight", label: "Weight" },
  ];

  const rangeOptions = [
    { value: "30d", label: "30 Days" },
    { value: "60d", label: "60 Days" },
  ];

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setError(null);
      setLoading(false);
    }
  }, [cachedData]);

  useEffect(() => {
    if (cachedData) return;
    let mounted = true;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const result = await loadPetHealthData(petId);
        if (!mounted) return;
        if (!result) {
          setError("Pet not found");
          setData(null);
        } else {
          setData(result);
        }
      } catch (err) {
        console.error("Failed to load health view", err);
        if (mounted) {
          setError("Unable to load health data");
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetch();

    return () => {
      mounted = false;
    };
  }, [cachedData, petId]);

  const formatDate = (value?: string | Date | null, fallback = "—") => {
    if (!value) return fallback;
    try {
      return format(new Date(value), "MMM d, yyyy");
    } catch (error) {
      return fallback;
    }
  };

  // Handler for resolving alerts
  const handleResolveAlert = useCallback(async (alertId: string) => {
    if (resolvingAlertId) return; // Prevent multiple simultaneous resolves

    setResolvingAlertId(alertId);

    // Store alert for potential restore on error
    const alertToRemove = data?.alerts.find(a => a.id === alertId);

    // Remove immediately from UI
    if (data) {
      setData({
        ...data,
        alerts: data.alerts.filter(alert => alert.id !== alertId),
      });
    }

    try {
      const response = await fetch('/api/alerts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      // Restore on error
      if (data && alertToRemove) {
        setData({
          ...data,
          alerts: [...data.alerts, alertToRemove],
        });
      }
    } finally {
      setResolvingAlertId(null);
    }
  }, [data, resolvingAlertId]);

  const historyPoints = useMemo(() => {
    if (!data) return [] as number[];
    // Safe access to history - API may not include it
    const history = data.healthScore?.history || { weights: [], activities: [], scores: [] };
    const source =
      historyMetric === "weight"
        ? (history.weights || [])
        : historyMetric === "activity"
        ? (history.activities || [])
        : (history.scores || []);
    const window = historyRange === "30d" ? 30 : 60;
    return source.slice(-window);
  }, [data, historyMetric, historyRange]);

  const historyMeta = useMemo(() => {
    switch (historyMetric) {
      case "weight":
        return { label: "Weight trend", sublabel: "kg", accent: "from-green-500 to-emerald-400", chartLabel: "Weight (kg)", chartColor: "green" };
      case "activity":
        return { label: "Activity trend", sublabel: "minutes", accent: "from-blue-500 to-cyan-400", chartLabel: "Activity (min)", chartColor: "blue" };
      default:
        return { label: "Health score trend", sublabel: "score", accent: "from-indigo-500 to-violet-500", chartLabel: "Health Score", chartColor: "purple" };
    }
  }, [historyMetric]);

  const derivedCards = useMemo(() => {
    if (!data) {
      return {
        quickTiles: [] as { label: string; trend: "up" | "down" | "stable"; value: string }[],
        metrics: [] as any[],
      };
    }

    const { healthScore, alerts, appointments, pet } = data;
    // Safe access to history and trends - API may not include them
    const history = healthScore?.history || { weights: [], activities: [], scores: [] };
    const trends = healthScore?.trends || { overall: { direction: "stable" }, weight: { direction: "stable" }, activity: { direction: "stable" } };

    const weightHistory = history.weights || [];
    const activityHistory = history.activities || [];
    const latestWeight = weightHistory.at(-1) ?? pet.weight ?? null;
    const previousWeight = weightHistory.at(-2) ?? null;
    const weightDelta =
      latestWeight && previousWeight ? Number(latestWeight) - Number(previousWeight) : 0;
    const latestActivity = activityHistory.at(-1) ?? null;
    const avgActivity =
      activityHistory.length > 0
        ? Math.round(
            activityHistory.slice(-7).reduce((sum, value) => sum + value, 0) /
              Math.min(7, activityHistory.length)
          )
        : null;
    const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
    const resolvedAlerts = alerts.filter((alert) => alert.resolved);
    const upcomingAppointments = appointments
      .filter((appt) => !appt.completed && appt.date)
      .sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch {
          return 0;
        }
      });
    const nextAppointment = upcomingAppointments[0] || null;

    // Get trend direction safely
    const overallDirection = trends?.overall?.direction;
    const overallTrend = overallDirection === "improving" ? "up" : overallDirection === "declining" ? "down" : "stable";

    const quickTiles = [
      {
        label: "Overall",
        trend: overallTrend as "up" | "down" | "stable",
        value: `${healthScore?.overall ?? 0}/100`,
      },
      {
        label: "Weight",
        trend: weightDelta === 0 ? "stable" : weightDelta > 0 ? "up" : "down",
        value: latestWeight ? `${Number(latestWeight).toFixed(1)} kg` : "Log weight",
      },
      {
        label: "Activity",
        trend:
          latestActivity && avgActivity
            ? latestActivity > avgActivity
              ? "up"
              : latestActivity < avgActivity
              ? "down"
              : "stable"
            : "stable",
        value: latestActivity ? `${Math.round(latestActivity)} min` : "Awaiting data",
      },
      {
        label: "Alerts",
        trend: unresolvedAlerts.length > 0 ? "down" : "up",
        value: `${unresolvedAlerts.length} active`,
      },
    ];

    const metrics = [
      {
        title: "Weight trend",
        value: latestWeight ? Number(latestWeight).toFixed(1) : "—",
        unit: latestWeight ? "kg" : undefined,
        trend:
          latestWeight && previousWeight
            ? weightDelta === 0
              ? "neutral"
              : weightDelta > 0
              ? "up"
              : "down"
            : "neutral",
        trendValue: latestWeight
          ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg vs last log`
          : "Awaiting log",
        trendLabel: "change",
        icon: TrendingDown,
        sparklineData: weightHistory.slice(-12),
        color: "green",
        context: "Reflects the last recorded weights.",
      },
      {
        title: "Activity load",
        value: latestActivity ? Math.round(latestActivity).toString() : "0",
        unit: "minutes",
        trend:
          latestActivity && avgActivity
            ? latestActivity > avgActivity
              ? "up"
              : latestActivity < avgActivity
              ? "down"
              : "neutral"
            : "neutral",
        trendValue: avgActivity ? `Avg ${Math.round(avgActivity)} min` : "Log activity",
        trendLabel: "7-day avg",
        icon: Activity,
        sparklineData: activityHistory.slice(-12),
        color: "blue",
        context: "Powered by your recent walk/activity logs.",
      },
      {
        title: "Upcoming care",
        value: upcomingAppointments.length,
        unit: "visits",
        trend: upcomingAppointments.length > 0 ? "up" : "neutral",
        trendValue: nextAppointment
          ? `${format(new Date(nextAppointment.date), "MMM d")} • ${nextAppointment.title}`
          : "No visits scheduled",
        trendLabel: "next visit",
        icon: Calendar,
        sparklineData: upcomingAppointments.map((appt) => new Date(appt.date).getTime()),
        color: "purple",
        context: "Directly tied to the appointments you plan.",
      },
      {
        title: "Alert load",
        value: unresolvedAlerts.length,
        unit: "open",
        trend: unresolvedAlerts.length > 0 ? "down" : "up",
        trendValue:
          unresolvedAlerts.length > 0
            ? "Resolve to lift health score"
            : `${resolvedAlerts.length} cleared`,
        trendLabel: "status",
        icon: AlertCircle,
        sparklineData: unresolvedAlerts.map((alert) =>
          alert.severity === "high" ? 3 : alert.severity === "medium" ? 2 : 1
        ),
        color: "orange",
        context: "Shows outstanding alerts waiting for action.",
      },
    ];

    return { quickTiles, metrics };
  }, [data]);

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
          Syncing health records…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">{error ?? "Pet not found"}</h1>
        <p className="text-sm text-slate-500">Double-check the link or choose another companion.</p>
        <Button
          className="action-button rounded-full px-6 py-3"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
        >
          Go back
        </Button>
      </div>
    );
  }

  const { healthScore: rawHealthScore, alerts, appointments, healthRecords, pet } = data;

  // Ensure healthScore has all required properties with safe defaults
  const healthScore = {
    overall: rawHealthScore?.overall ?? 0,
    status: rawHealthScore?.status ?? "fair",
    statusBg: rawHealthScore?.statusBg ?? "bg-slate-100",
    statusColor: rawHealthScore?.statusColor ?? "text-slate-600",
    insights: rawHealthScore?.insights || [],
    recommendations: rawHealthScore?.recommendations || [],
    components: rawHealthScore?.components || {},
    history: rawHealthScore?.history || { weights: [], activities: [], scores: [] },
    trends: rawHealthScore?.trends || { overall: { direction: "stable" } },
  };

  const quickTiles = derivedCards.quickTiles;
  const metrics = derivedCards.metrics;

  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
  const resolvedAlerts = alerts.filter((alert) => alert.resolved);

  const upcomingAppointments = appointments
    .filter((appt) => !appt.completed && appt.date)
    .sort((a, b) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch {
        return 0;
      }
    });

  const nextAppointment = upcomingAppointments[0] || null;

  const heroImageStyle: React.CSSProperties = pet.image
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.65), rgba(15,23,42,0.15)), url(${pet.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage: "linear-gradient(135deg, #dbeafe, #ede9fe)",
      };

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-10 px-4 py-10 sm:px-6">
      <SectionHeader
        eyebrow="Health Overview"
        title={`${pet.name}’s Wellness Report`}
        description={`${pet.species} • ${pet.breed || "Unknown breed"} • ${
          pet.age ?? "—"
        } years • ${pet.weight ?? "—"} kg`}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="rounded-full text-sm text-slate-600 hover:text-slate-900"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Surface variant="glass" className="relative overflow-hidden rounded-[36px] border border-white/50 p-0">
          <div className="h-[280px] w-full" style={heroImageStyle} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 space-y-5 px-6 pb-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">Lead companion</p>
                <p className="text-3xl font-semibold">{pet.name}</p>
                <p className="text-sm text-white/80">
                  {pet.species} • {pet.breed || "Unknown breed"}
                </p>
              </div>
              <span className="rounded-full border border-white/50 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-white">
                synced
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Age</p>
                <p className="text-lg font-semibold">{pet.age ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Weight</p>
                <p className="text-lg font-semibold">{pet.weight ? `${pet.weight} kg` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Created</p>
                <p className="text-lg font-semibold">
                  {pet.createdAt ? formatDate(pet.createdAt) : "Recently"}
                </p>
              </div>
            </div>
          </div>
        </Surface>

        <Surface variant="gradient" className="flex flex-col gap-6 rounded-[32px] border border-white/50 p-6 lg:p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-text text-slate-500">Current score</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">Overall wellness</p>
              <p className="text-sm text-slate-600">
                Insights update every time you log weight, activity, or alerts.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-white/60 px-4 py-2 text-xs font-semibold text-slate-700"
              onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
            >
              View profile
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative h-32 w-32">
                <ProgressRing
                  progress={healthScore.overall}
                  size={140}
                  strokeWidth={7}
                  color={getScoreColor(healthScore.overall)}
                  showPercentage={false}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-semibold text-slate-900">{healthScore.overall}</span>
                  <span className="text-xs uppercase tracking-[0.4em] text-slate-400">/100</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${healthScore.statusBg} ${healthScore.statusColor}`}
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-current" />
                  {healthScore.status.replace("-", " ").toUpperCase()}
                </span>
                <p className="text-sm text-slate-600">
                  {healthScore.insights[0] ?? "Health metrics are stabilising. Keep monitoring weekly."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {quickTiles.map((tile) => (
                <TrendTile key={tile.label} {...tile} />
              ))}
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner">
              {nextAppointment ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Next appointment</p>
                      <p className="text-sm font-semibold text-slate-900">{nextAppointment.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(nextAppointment.date)} • {nextAppointment.time ?? "Time TBC"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-full px-4 py-2 text-xs font-semibold"
                    onClick={() => router.push(`/dashboard/appointments/${nextAppointment.id}`)}
                  >
                    View
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>No upcoming appointments scheduled.</span>
                  <Button
                    variant="ghost"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    onClick={() => router.push("/dashboard/appointments/new")}
                  >
                    Schedule
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Surface>
      </section>

      <Surface variant="glass" className="space-y-6 rounded-[32px] border border-white/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-text text-slate-400">Health score history</p>
            <p className="text-lg font-semibold text-slate-900">{historyMeta.label}</p>
            <p className="text-sm text-slate-500">
              Last {historyRange === "30d" ? "30 days" : "60 days"} • {historyMeta.sublabel}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row">
            <PillSwitcher
              size="sm"
              options={metricOptions}
              value={historyMetric}
              onChange={(val) => setHistoryMetric(val as typeof historyMetric)}
            />
            <PillSwitcher
              size="sm"
              options={rangeOptions}
              value={historyRange}
              onChange={(val) => setHistoryRange(val as typeof historyRange)}
            />
          </div>
        </div>
        {historyPoints.length === 0 ? (
          <p className="text-sm text-slate-500">No historical data available yet.</p>
        ) : (
          <InteractiveHistoryChart
            data={historyPoints}
            height={220}
            label={historyMeta.chartLabel}
            color={historyMeta.chartColor}
          />
        )}
      </Surface>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Metric Breakdown"
          title="Meaningful metrics"
          description="Every card compares your pet to breed-specific targets so you know exactly what needs attention."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <HealthMetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Surface variant="panel" className="space-y-4 p-6">
          <div>
            <p className="label-text text-slate-400">Insights</p>
            <p className="text-lg font-semibold text-slate-900">What we’re seeing</p>
          </div>
          <div className="space-y-3">
            {healthScore.insights.length === 0 && (
              <p className="text-sm text-slate-500">No insights generated yet.</p>
            )}
            {healthScore.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm"
              >
                <AlertCircle className="h-5 w-5 text-slate-400" />
                <p className="text-sm text-slate-600">{insight}</p>
              </motion.div>
            ))}
          </div>
        </Surface>

        <Surface variant="panel" className="space-y-4 p-6">
          <div>
            <p className="label-text text-slate-400">Recommended actions</p>
            <p className="text-lg font-semibold text-slate-900">Next best steps</p>
          </div>
          <div className="space-y-3">
            {healthScore.recommendations.length === 0 && (
              <p className="text-sm text-slate-500">
                Maintain current routines. We’ll suggest actions when needed.
              </p>
            )}
            {healthScore.recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white p-4 text-sm text-slate-600"
              >
                {rec}
              </motion.div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Surface variant="panel" className="space-y-4 p-6">
          <div>
            <p className="label-text text-slate-400">Active alerts</p>
            <p className="text-lg font-semibold text-slate-900">What needs attention</p>
          </div>
          <div className="space-y-3">
            {unresolvedAlerts.length === 0 && (
              <p className="text-sm text-slate-500">No alerts open. Great work!</p>
            )}
            {unresolvedAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`rounded-2xl border p-4 ${
                  alert.severity === "high"
                    ? "border-red-200 bg-red-50/80"
                    : alert.severity === "medium"
                    ? "border-amber-200 bg-amber-50/80"
                    : "border-blue-200 bg-blue-50/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{alert.message}</span>
                      <span className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                        alert.severity === "high"
                          ? "bg-red-100 text-red-700"
                          : alert.severity === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    {alert.recommendation && (
                      <p className="mt-1 text-xs text-slate-600">{alert.recommendation}</p>
                    )}
                    <span className="text-xs text-slate-400">Raised {formatDate(alert.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={resolvingAlertId === alert.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      resolvingAlertId === alert.id
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95"
                    }`}
                  >
                    {resolvingAlertId === alert.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Resolve
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
            {resolvedAlerts.length > 0 && (
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer font-semibold">Resolved alerts</summary>
                <div className="mt-2 space-y-2">
                  {resolvedAlerts.map((alert) => (
                    <div key={alert.id} className="rounded-xl border border-white/60 bg-white/80 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">{alert.message}</span>
                        <span className="text-[10px] uppercase text-slate-400">
                          Resolved {formatDate(alert.resolvedAt ?? alert.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </Surface>

        <Surface variant="panel" className="space-y-4 p-6">
          <div>
            <p className="label-text text-slate-400">Upcoming care</p>
            <p className="text-lg font-semibold text-slate-900">Keep routines on track</p>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.length === 0 && (
              <p className="text-sm text-slate-500">No scheduled appointments.</p>
            )}
            {upcomingAppointments.map((appt) => (
              <div key={appt.id} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{appt.title}</span>
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(appt.date)} {appt.time ? `• ${appt.time}` : ""}
                </p>
                {appt.veterinarian && (
                  <p className="text-xs text-slate-500">{appt.veterinarian}</p>
                )}
                {appt.location && <p className="text-xs text-slate-400">{appt.location}</p>}
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <Surface variant="panel" className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="label-text text-slate-400">Health records</p>
            <p className="text-lg font-semibold text-slate-900">Clinical history</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
            onClick={() => router.push(`/dashboard/health/add-record?petId=${pet.id}`)}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Add record
          </Button>
        </div>
        {healthRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No health records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="py-3">Date</th>
                  <th className="py-3">Metric</th>
                  <th className="py-3">Value</th>
                  <th className="py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {healthRecords
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.recordedAt ?? b.createdAt).getTime() -
                      new Date(a.recordedAt ?? a.createdAt).getTime()
                  )
                  .map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70">
                      <td className="py-3 text-slate-500">
                        {formatDate(record.recordedAt ?? record.createdAt)}
                      </td>
                      <td className="py-3 font-medium text-slate-900 capitalize">
                        {record.type.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 text-slate-600">
                        {record.value} {record.unit}
                      </td>
                      <td className="py-3 text-slate-500">{record.notes ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

function TrendTile({
  label,
  trend,
  value,
}: {
  label: string;
  trend: "up" | "down" | "stable";
  value: string;
}) {
  const icon =
    trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : trend === "down" ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <Minus className="h-4 w-4 text-slate-400" />
    );

  return (
    <Surface variant="subtle" interactive={false} className="p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
        <span>{label}</span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </Surface>
  );
}
