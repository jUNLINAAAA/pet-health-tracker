"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Heart,
  Home,
  LogOut,
  Sparkles,
  User,
  TrendingUp,
  CheckCircle2,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home, exact: true },
  { name: "Pets", href: "/dashboard/pets", icon: Heart, exact: false },
  { name: "Health", href: "/dashboard/health", icon: Activity, exact: false },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar, exact: false },
  { name: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle, exact: false },
  { name: "Account", href: "/dashboard/account", icon: User, exact: false },
];

interface QuickStats {
  wellnessIndex: number;
  wellnessChange: number;
  alertsResolved: number;
  alertsTotal: number;
  resolvedPercent: number;
}

interface UserData {
  email?: string;
  name?: string;
}

const LogoGlyph = () => (
  <div className="relative h-14 w-14">
    <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-indigo-200/80 via-blue-100/70 to-purple-100/60 blur-lg" />
    <div className="relative flex h-full w-full items-center justify-center rounded-[22px] bg-gradient-to-br from-white via-white to-indigo-50 shadow-lg shadow-indigo-500/20 ring-1 ring-white/70">
      <Heart className="h-7 w-7 text-indigo-500" />
      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/40">
        <Plus className="h-3.5 w-3.5" />
      </div>
    </div>
  </div>
);

interface SidebarNavProps {
  onAssistantSummon?: () => void;
}

export function SidebarNav({ onAssistantSummon }: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<QuickStats>({
    wellnessIndex: 0,
    wellnessChange: 0,
    alertsResolved: 0,
    alertsTotal: 0,
    resolvedPercent: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      // Fetch all pets with their health scores
      const { data: pets } = await supabase
        .from('pets')
        .select('id, name')
        .limit(50);

      let totalScore = 0;
      let petCount = 0;

      if (pets && pets.length > 0) {
        // Calculate wellness index from health scores
        for (const pet of pets) {
          try {
            const res = await fetch(`/api/health-score?petId=${pet.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.overall) {
                totalScore += data.overall;
                petCount++;
              }
            }
          } catch {
            // Skip failed requests
          }
        }
      }

      const avgScore = petCount > 0 ? Math.round(totalScore / petCount) : 85;

      // Fetch alerts stats
      const { data: alerts } = await supabase
        .from('alerts')
        .select('id, is_resolved, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const totalAlerts = alerts?.length || 0;
      const resolvedAlerts = alerts?.filter(a => a.is_resolved).length || 0;
      const resolvedPercent = totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 0;

      setStats({
        wellnessIndex: avgScore,
        wellnessChange: 0, // Would need historical data to calculate
        alertsResolved: resolvedAlerts,
        alertsTotal: totalAlerts,
        resolvedPercent,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Use defaults on error
      setStats({
        wellnessIndex: 85,
        wellnessChange: 0,
        alertsResolved: 0,
        alertsTotal: 0,
        resolvedPercent: 0,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data?.user) {
          setUser({
            email: data.user.email ?? undefined,
            name: (data.user.user_metadata as any)?.name ?? undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
    fetchStats();

    // Set up real-time subscription for alerts changes
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const alertsChannel = supabase
        .channel('sidebar-alerts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
          fetchStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'health_records' }, () => {
          fetchStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, () => {
          fetchStats();
        })
        .subscribe();

      // Also poll every 30 seconds as backup
      const pollInterval = setInterval(() => {
        fetchStats();
      }, 30000);

      return () => {
        supabase.removeChannel(alertsChannel);
        clearInterval(pollInterval);
      };
    }
  }, [fetchStats]);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      toast.success("Logged out successfully");
      router.replace("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out. Please try again.");
    }
  };

  const isActive = (item: { href: string; exact: boolean }) => {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="hidden w-80 shrink-0 lg:flex">
      <div className="sticky top-6 flex w-full flex-col gap-6">
        {/* Brand Header */}
        <Surface
          variant="gradient"
          interactive={false}
          className="group relative overflow-hidden rounded-[32px] text-slate-900 transition-all duration-300 hover:shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.3),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.2),_transparent_50%)]" />

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onAssistantSummon?.()}
            className="relative flex w-full flex-col gap-6 rounded-[32px] px-6 py-6 text-left focus:outline-none"
            aria-label="Open Radiant assistant"
          >
            <div className="flex items-center gap-4">
              <LogoGlyph />
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-slate-400">
                  Pet Health Management
                </p>
                <p className="text-xl font-bold tracking-tight text-slate-900">Command OS</p>
                <p className="text-xs text-slate-500">Tap to open Radiant AI cockpit</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 backdrop-blur-sm">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-500">
                Radiant
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Live cockpit
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">
                <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                AI ready
              </span>
            </div>
          </motion.button>
        </Surface>

        {/* Navigation Section */}
        <Surface variant="glass" interactive={false} className="flex flex-col gap-5 p-5">
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition-all duration-300",
                  isActive(item)
                    ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/40 ring-2 ring-blue-400/20"
                    : "text-slate-600 hover:bg-gradient-to-r hover:from-white hover:to-blue-50 hover:text-slate-900 hover:shadow-lg hover:shadow-slate-200/50"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive(item) ? "scale-110" : "group-hover:scale-110"
                  )} />
                  <span>{item.name}</span>
                </div>
                {isActive(item) && (
                  <span className="animate-pulse text-[10px] font-bold uppercase tracking-[0.3em] text-white/90">
                    Live
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* User Info & Stats Section */}
          <div className="space-y-5">
            {/* User Email */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-5 py-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Signed in as</p>
              <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">{user?.email || "demo@example.com"}</p>
            </div>

            {/* Quick Glance Stats - Live from Backend */}
            <div className="space-y-3">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Quick Insights</p>
              <div className="grid gap-3">
                {/* Wellness Index */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 px-4 py-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-blue-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Wellness Index</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {isLoadingStats ? "..." : stats.wellnessIndex}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {isLoadingStats ? "Loading..." : "Average health score"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:scale-110">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Alerts Resolved */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 px-4 py-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-blue-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Alerts Resolved</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {isLoadingStats ? "..." : `${stats.alertsResolved}/${stats.alertsTotal}`}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {isLoadingStats ? "Loading..." : stats.alertsTotal > 0 ? `${stats.resolvedPercent}% this week` : "No alerts this week"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:scale-110">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-lg"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span>Sign Out</span>
            </button>
          </div>
        </Surface>
      </div>
    </aside>
  );
}
