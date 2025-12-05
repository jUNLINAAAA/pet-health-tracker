"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Heart,
  Home,
  User,
  Plus,
  X,
  Sparkles,
  Menu,
  LogOut,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home, exact: true },
  { name: "Pets", href: "/dashboard/pets", icon: Heart, exact: false },
  { name: "Health", href: "/dashboard/health", icon: Activity, exact: false },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar, exact: false },
  { name: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle, exact: false },
];

const quickActions = [
  {
    name: "Add Health Record",
    href: "/dashboard/health/add-record",
    icon: Activity,
    color: "from-blue-500 to-indigo-500",
  },
  {
    name: "Schedule Appointment",
    href: "/dashboard/appointments/new",
    icon: Calendar,
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Add Pet",
    href: "/dashboard/pets/new",
    icon: Heart,
    color: "from-rose-500 to-orange-500",
  },
];

interface MobileNavProps {
  onAssistantSummon?: () => void;
}

interface UserData {
  email?: string;
  name?: string;
}

export function MobileNav({ onAssistantSummon }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

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
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setShowMenu(false);
      toast.success("Signed out successfully");
      router.replace("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out. Please try again.");
    }
  };

  const isActive = (item: { href: string; exact: boolean }) => {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Header - Only visible on mobile/tablet */}
      <header className="sticky top-0 z-50 lg:hidden">
        <div className="flex items-center justify-between border-b border-white/40 bg-white/80 backdrop-blur-xl px-4 py-3 shadow-sm">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onAssistantSummon?.()}
            className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-3 py-2 shadow-inner shadow-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Open Radiant assistant"
          >
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-200/80 via-blue-100/70 to-purple-100/60 blur-md transition duration-300 group-hover:blur-lg" />
              <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-white via-white to-indigo-50 shadow-lg shadow-indigo-500/20 ring-1 ring-white/70">
                <Sparkles className="h-5 w-5 text-indigo-500 transition duration-200 group-hover:text-indigo-600" />
              </div>
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold tracking-tight text-slate-900">Radiant OS</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Copilot
              </span>
            </div>
          </motion.button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            aria-label="Toggle menu"
            aria-expanded={showMenu}
          >
            {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Full Screen Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            />

            {/* Slide-in Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 shadow-2xl lg:hidden"
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/40 bg-white/80 p-4 backdrop-blur-xl">
                  <h2 className="text-lg font-bold text-slate-900">Navigation</h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 space-y-2 p-4" role="navigation">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setShowMenu(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-all duration-300",
                        isActive(item)
                          ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/40"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-lg"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-transform duration-300",
                        isActive(item) ? "scale-110" : "group-hover:scale-110"
                      )} />
                      {item.name}
                    </Link>
                  ))}

                  <div className="my-3 border-t border-slate-200/60" />

                  <Link
                    href="/dashboard/account"
                    onClick={() => setShowMenu(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-all duration-300",
                      pathname?.startsWith("/dashboard/account")
                        ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/40"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-lg"
                    )}
                  >
                    <User className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      pathname?.startsWith("/dashboard/account") ? "scale-110" : "group-hover:scale-110"
                    )} />
                    Account
                  </Link>

                </nav>

                {/* Footer with User Info & Sign Out */}
                <div className="border-t border-white/40 bg-white/60 p-4 backdrop-blur-xl space-y-3">
                  {/* User Info */}
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.email || "Loading..."}</p>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>Sign Out</span>
                  </button>

                  {/* App Info */}
                  <div className="rounded-2xl border border-blue-100/70 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                        Pet Health Tracker
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-blue-700">
                      Powered by Supabase
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Actions Modal */}
      <AnimatePresence>
        {showQuickActions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
              onClick={() => setShowQuickActions(false)}
            />

            {/* Quick Actions Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="fixed inset-x-4 bottom-24 z-50 lg:hidden"
            >
              <Surface variant="gradient" className="overflow-hidden p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                  </div>
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => setShowQuickActions(false)}
                        className="group flex items-center gap-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm transition-all hover:shadow-lg active:scale-95"
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
                            action.color
                          )}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-base font-semibold text-slate-900">
                          {action.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Surface>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar - Only visible on mobile/tablet */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="relative mx-auto max-w-2xl px-4 pb-safe">
          {/* Glass navigation container */}
          <div className="rounded-t-[32px] border border-b-0 border-white/40 bg-white/80 backdrop-blur-3xl shadow-[0_-20px_60px_rgba(15,23,42,0.15)]">
            {/* Navigation items */}
            <div className="flex items-center justify-around px-2 py-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all",
                      active
                        ? "text-blue-600"
                        : "text-slate-500 active:scale-95"
                    )}
                  >
                    {/* Active indicator background */}
                    {active && (
                      <motion.div
                        layoutId="mobileNavActiveIndicator"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100"
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 300,
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                      <Icon
                        className={cn(
                          "h-6 w-6 transition-all",
                          active && "scale-110"
                        )}
                      />
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500"
                        />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "relative z-10 text-[10px] font-semibold uppercase tracking-wider",
                        active ? "text-blue-600" : "text-slate-500"
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Floating Action Button (FAB) */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <button
                onClick={() => setShowQuickActions(true)}
                className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 shadow-2xl shadow-blue-500/40 ring-4 ring-white/50 transition-all active:scale-95"
              >
                {/* Animated pulse ring */}
                <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/30" />

                {/* Icon */}
                <div className="relative">
                  <Plus className="h-8 w-8 text-white transition-transform group-active:rotate-90" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
