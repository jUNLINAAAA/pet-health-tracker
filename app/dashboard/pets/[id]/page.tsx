"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Edit,
  Heart,
  PlusCircle,
  Settings,
  Trash2,
  TrendingDown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PetService, StorageService } from "@/lib/services";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { HealthMetricCard } from "@/components/dashboard/HealthMetricCard";
import { getScoreColor } from "@/lib/unified-health-system";
import { useHealth, usePetScore } from "@/lib/health-context";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { loadPetHealthData, type PetHealthData } from "@/lib/pets/health-data";

export default function PetProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { pets, alerts, appointments, loading, reload } = useHealth();
  const healthScore = usePetScore(params.id);

  const [fallbackData, setFallbackData] = useState<PetHealthData | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pet = useMemo(() => pets.find((p) => p.id === params.id), [pets, params.id]);
  const effectivePet = pet ?? fallbackData?.pet ?? null;
  const effectiveHealthScore = healthScore ?? fallbackData?.healthScore ?? null;
  const effectiveAlerts = useMemo(
    () => (effectivePet ? alerts.filter((a) => a.petId === effectivePet.id) : fallbackData?.alerts ?? []),
    [alerts, effectivePet, fallbackData]
  );
  const effectiveAppointments = useMemo(
    () => (effectivePet ? appointments.filter((a) => a.petId === effectivePet.id) : fallbackData?.appointments ?? []),
    [appointments, effectivePet, fallbackData]
  );

  useEffect(() => {
    if (loading) return;
    if (pet && healthScore) return;
    if (fallbackLoading || fallbackData) return;
    setFallbackLoading(true);
    loadPetHealthData(params.id)
      .then((data) => {
        setFallbackData(data);
        setFallbackError(null);
      })
      .catch((err) => {
        console.error("Fallback pet load failed", err);
        setFallbackError("Unable to load pet. It may not exist or you lack access.");
      })
      .finally(() => setFallbackLoading(false));
  }, [loading, pet, healthScore, params.id, fallbackLoading, fallbackData]);

  const metrics = useMemo(() => {
    if (!effectivePet || !effectiveHealthScore) return [];

    // Safe access to history and trends - API may not include these
    const history = effectiveHealthScore.history || { activities: [], weights: [], scores: [] };
    const trends = effectiveHealthScore.trends || {
      activity: { direction: "stable", value: "stable" },
      weight: { direction: "stable", value: "stable" },
      overall: { direction: "stable", value: "stable" },
    };

    const toTrend = (dir: "up" | "down" | "stable" | "improving" | "declining" | undefined): "up" | "down" | "neutral" => {
      if (dir === "up" || dir === "improving") return "up";
      if (dir === "down" || dir === "declining") return "down";
      return "neutral";
    };

    // Get activity from components if history not available
    const activityValue = history.activities?.at(-1) ?? effectiveHealthScore.components?.activity ?? 0;

    return [
      {
        title: "Daily Activity",
        value: String(Math.round(activityValue)),
        unit: "score",
        trend: toTrend(trends.activity?.direction),
        trendValue: trends.activity?.value || "stable",
        icon: Activity,
        sparklineData: history.activities?.slice(-9) || [],
        color: "blue",
      },
      {
        title: "Current Weight",
        value: (effectivePet.weight || 0).toFixed(1),
        unit: "kg",
        trend: toTrend(trends.weight?.direction),
        trendValue: trends.weight?.value || "stable",
        icon: TrendingDown,
        sparklineData: history.weights?.slice(-9) || [],
        color: "green",
      },
      {
        title: "Health Score",
        value: Math.round(effectiveHealthScore.overall),
        unit: "/100",
        trend: toTrend(trends.overall?.direction),
        trendValue: effectiveHealthScore.status?.replace("-", " ") || "good",
        icon: Heart,
        sparklineData: history.scores?.slice(-9) || [],
        color: "purple",
      },
      {
        title: "Alert Impact",
        value: Math.round(effectiveHealthScore.components?.alerts ?? 100),
        unit: "%",
        trend: toTrend(trends.overall?.direction),
        trendValue: `${effectiveAlerts.filter((a) => !a.resolved).length} active`,
        icon: AlertCircle,
        sparklineData: history.scores?.slice(-9) || [],
        color: "orange",
      },
    ];
  }, [effectivePet, effectiveHealthScore, effectiveAlerts]);

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "—";
    try {
      return format(new Date(value), "MMM d, yyyy");
    } catch (error) {
      return "—";
    }
  };

  const handleDelete = async () => {
    if (!effectivePet) return;
    setDeleting(true);
    try {
      // Delete pet images from storage
      await StorageService.deleteAllPetImages(effectivePet.id);
      // Delete the pet
      await PetService.deletePet(effectivePet.id);
      toast.success("Pet deleted successfully");
      await reload();
      router.push("/dashboard/pets");
    } catch (error) {
      console.error("Error deleting pet:", error);
      toast.error("Failed to delete pet. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">Syncing profile…</p>
      </div>
    );
  }

  if (!effectivePet || !effectiveHealthScore) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Pet not found</h1>
        <p className="text-sm text-slate-500">
          {fallbackError || "This pet may have been removed or you may not have access."}
        </p>
        <Button onClick={() => router.push("/dashboard")} className="action-button rounded-full px-6 py-3">
          Back to dashboard
        </Button>
      </div>
    );
  }

  const petAlerts = alerts.filter((a) => a.petId === effectivePet.id && !a.resolved);
  const petAppts = appointments
    .filter((a) => a.petId === effectivePet.id && !a.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-8">
      <SectionHeader
        eyebrow="Pet overview"
        title={`${effectivePet.name}'s wellness cockpit`}
        description={`${effectivePet.species} • ${effectivePet.breed || "Unknown breed"} • ${effectivePet.age ?? "—"} years • ${
          effectivePet.weight ?? "—"
        } kg`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full text-sm"
              onClick={() => router.push(`/dashboard/pets/${effectivePet.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Pet
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-sm text-slate-600 hover:text-slate-900"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.2fr)_0.8fr]">
        <Surface variant="glass" className="relative overflow-hidden rounded-[36px] border border-white/50 p-0 pet-hero-overlay paw-pattern">
          {/* Hero image with enhanced overlay */}
          <div className="relative h-56 w-full sm:h-72 md:h-[400px]">
            {effectivePet.image ? (
              <Image
                src={effectivePet.image}
                alt={effectivePet.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--pet-cream)] via-[var(--pet-blush)] to-[var(--pet-sky)]">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Heart className="h-20 w-20 text-slate-300" />
                </motion.div>
              </div>
            )}
            {/* Premium gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />

            {/* Floating badge - top right */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute right-3 top-3 sm:right-4 sm:top-4"
            >
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-md border border-white/30 sm:gap-2 sm:px-4 sm:py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white sm:text-xs">Synced</span>
              </div>
            </motion.div>
          </div>

          {/* Content overlay at bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 space-y-5 px-4 pb-4 text-white sm:px-6 sm:pb-6">
            {/* Badge row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="pet-chip pet-chip-happy">🐾 Lead companion</span>
              <span className="pet-chip pet-chip-calm">Wellness live</span>
              <span className="pet-chip pet-chip-caution">
                Mood: {effectiveHealthScore?.status ?? "—"}
              </span>
            </motion.div>

            {/* Pet info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="text-3xl font-bold tracking-tight drop-shadow-lg sm:text-4xl md:text-5xl">{effectivePet.name}</h2>
              <p className="mt-1 text-sm text-white/80 sm:text-base">
                {effectivePet.species} • {effectivePet.breed || "Mixed"}
              </p>
            </motion.div>

            {/* Stats row with glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-2 sm:gap-3"
            >
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md transition-all duration-300 hover:bg-white/15 sm:p-4">
                <p className="text-[9px] uppercase tracking-[0.3em] text-white/60 sm:text-[10px]">Age</p>
                <p className="mt-1 text-xl font-bold sm:mt-1.5 sm:text-2xl">{effectivePet.age ?? "—"}</p>
                {effectivePet.age && <p className="text-[10px] text-white/50 sm:text-xs">years old</p>}
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md transition-all duration-300 hover:bg-white/15 sm:p-4">
                <p className="text-[9px] uppercase tracking-[0.3em] text-white/60 sm:text-[10px]">Weight</p>
                <p className="mt-1 text-xl font-bold sm:mt-1.5 sm:text-2xl">{effectivePet.weight ?? "—"}</p>
                {effectivePet.weight && <p className="text-[10px] text-white/50 sm:text-xs">kilograms</p>}
              </div>
            </motion.div>
          </div>
        </Surface>

        <Surface variant="panel" className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="label-text text-xs text-slate-400 sm:text-sm">Health score</p>
              <p className="text-base font-semibold text-slate-900 sm:text-lg">Overall wellness</p>
            </div>
            <Button
              variant="outline"
              className="flex-shrink-0 rounded-full border-slate-200 px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm"
              onClick={() => router.push(`/dashboard/health/${effectivePet.id}`)}
            >
              View profile
            </Button>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative flex-shrink-0">
              <div className="block sm:hidden">
                <ProgressRing
                  progress={effectiveHealthScore.overall}
                  size={96}
                  strokeWidth={6}
                  color={getScoreColor(effectiveHealthScore.overall)}
                  showPercentage={false}
                />
              </div>
              <div className="hidden sm:block">
                <ProgressRing
                  progress={effectiveHealthScore.overall}
                  size={128}
                  strokeWidth={7}
                  color={getScoreColor(effectiveHealthScore.overall)}
                  showPercentage={false}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                <span className="text-2xl font-semibold sm:text-4xl">{effectiveHealthScore.overall}</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 sm:text-xs sm:tracking-[0.4em]">/100</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${effectiveHealthScore.statusBg} ${effectiveHealthScore.statusColor}`}
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-current" />
                {effectiveHealthScore.status.replace("-", " ").toUpperCase()}
              </span>
              <p className="text-sm text-slate-600">
                {effectiveHealthScore.insights[0] ?? "Metrics within healthy range."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(effectiveHealthScore.components).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{key}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                    <motion.div
                      className="h-full rounded-full bg-slate-900"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(value)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{Math.round(value)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Wellness metrics"
          title="Signals unique to this pet"
          description="Every card compares your pet to breed-specific targets and real activity."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <HealthMetricCard key={metric.title} {...metric} />
          ))}
        </div>
        <Surface variant="panel" className="p-6">
          <p className="text-sm font-semibold text-slate-900 mb-4">
            Understanding {effectivePet.name}&rsquo;s metrics
          </p>
          <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <MetricExplainer
              icon={Activity}
              title="Daily activity"
              description={`Calibrated for a ${effectivePet.species.toLowerCase()} aged ${effectivePet.age ?? "—"}.
                Higher activity improves cardiovascular health.`}
            />
            <MetricExplainer
              icon={TrendingDown}
              title="Weight"
              description={`${effectivePet.weight || "—"}kg compared to ${effectivePet.breed || effectivePet.species} ideal ranges.`}
            />
            <MetricExplainer
              icon={Heart}
              title="Health Score"
              description={`Overall wellness score of ${Math.round(effectiveHealthScore.overall)}/100 based on weight, activity, and alerts.`}
            />
            <MetricExplainer
              icon={AlertCircle}
              title="Alert impact"
              description={`${petAlerts.length} active alerts. Resolve them to lift the score.`}
            />
          </div>
        </Surface>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Surface variant="panel" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-text text-slate-400">Insights</p>
              <p className="text-lg font-semibold text-slate-900">Key findings</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => router.push(`/dashboard/health/${effectivePet.id}`)}
            >
              View details
            </Button>
          </div>
          <div className="space-y-3">
            {effectiveHealthScore.insights.length === 0 && (
              <p className="text-sm text-slate-500">No concerns detected. Keep up the great work!</p>
            )}
            {effectiveHealthScore.insights.map((insight, i) => (
              <motion.div
                key={insight}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <AlertCircle className="h-5 w-5 text-slate-400" />
                <p className="text-sm text-slate-600">{insight}</p>
              </motion.div>
            ))}
          </div>
        </Surface>

        <Surface variant="panel" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-text text-slate-400">Active alerts</p>
              <p className="text-lg font-semibold text-slate-900">What needs attention</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => router.push("/dashboard/alerts")}
            >
              Manage
            </Button>
          </div>
          <div className="space-y-3">
            {petAlerts.length === 0 && (
              <div className="text-center py-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <Heart className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm text-slate-500">All clear! No active alerts.</p>
              </div>
            )}
            {petAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
                  <span className="text-xs uppercase font-semibold text-slate-500">{alert.severity}</span>
                </div>
                {alert.recommendation && (
                  <p className="mt-2 text-xs text-slate-600">{alert.recommendation}</p>
                )}
                <span className="mt-2 block text-xs text-slate-400">Raised {formatDate(alert.createdAt)}</span>
              </motion.div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface variant="panel" className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="label-text text-slate-400">Upcoming care</p>
            <p className="text-lg font-semibold text-slate-900">Keep routines on track</p>
          </div>
          <Link
            href="/dashboard/appointments"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {petAppts.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Calendar className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No scheduled appointments.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full border-slate-200"
                onClick={() => router.push("/dashboard/appointments/new")}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Schedule care
              </Button>
            </div>
          ) : (
            petAppts.slice(0, 3).map((appt, index) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{appt.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(appt.date)} {appt.time ? `• ${appt.time}` : ""}
                    </p>
                    {appt.veterinarian && (
                      <p className="text-xs text-slate-500">{appt.veterinarian}</p>
                    )}
                  </div>
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Surface>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">Delete {effectivePet.name}?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This action cannot be undone. All health records, appointments, and alerts associated with {effectivePet.name} will also be deleted.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricExplainer({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Surface variant="subtle" interactive={false} className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
        <Icon className="h-4 w-4 text-slate-500" />
      </Surface>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}
