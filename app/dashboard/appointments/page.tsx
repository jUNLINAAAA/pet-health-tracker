"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  PlusCircle,
  User,
  XCircle,
} from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { PillSwitcher } from "@/components/ui/PillSwitcher";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { useHealth, type Appointment, type Pet } from "@/lib/health-context";
import { cn } from "@/lib/utils";

const statusCopy = {
  scheduled: {
    label: "Scheduled",
    pill: "border-blue-200 bg-blue-50 text-blue-700",
    icon: <Calendar className="h-4 w-4" />,
  },
  completed: {
    label: "Completed",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  cancelled: {
    label: "Cancelled",
    pill: "border-slate-200 bg-slate-50 text-slate-600",
    icon: <XCircle className="h-4 w-4" />,
  },
  missed: {
    label: "Missed",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
} as const;

type NormalizedStatus = keyof typeof statusCopy;
type NormalizedAppointment = Appointment & { status: NormalizedStatus; parsedDate: Date | null };

const safeParseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.error("Failed to parse appointment date", value, error);
    return null;
  }
};

const normalizeStatus = (appointment: Appointment): NormalizedStatus => {
  const raw = typeof appointment.status === "string" ? appointment.status.toLowerCase() : undefined;

  if (raw === "completed" || appointment.completed) return "completed";
  if (raw === "cancelled") return "cancelled";
  if (raw === "missed") return "missed";

  const parsedDate = safeParseDate(appointment.date);
  if (parsedDate && isPast(parsedDate)) return "missed";

  return "scheduled";
};

const normalizeAppointment = (appointment: Appointment): NormalizedAppointment => {
  const parsedDate = safeParseDate(appointment.date);
  const status = normalizeStatus(appointment);

  return { ...appointment, parsedDate, status };
};

const formatDateLabel = (value: Date | null) => {
  if (!value) return "Date TBD";
  try {
    return format(value, "EEE, MMM d");
  } catch (error) {
    console.error("Failed to format date", error);
    return "Date TBD";
  }
};

const formatWhen = (value: Date | null, status: NormalizedStatus) => {
  if (!value) return status === "completed" ? "Logged" : "Awaiting details";
  if (status === "completed") return format(value, "MMM d, yyyy");
  return formatDistanceToNow(value, { addSuffix: true });
};

export default function AppointmentsPage() {
  const router = useRouter();
  const { appointments, pets, loading, reload } = useHealth();
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "past" | "all">("upcoming");

  const petLookup = useMemo(() => {
    return pets.reduce<Map<string, Pet>>((map, pet) => map.set(pet.id, pet), new Map());
  }, [pets]);

  const normalizedAppointments = useMemo(
    () => appointments.map((appt) => normalizeAppointment(appt)),
    [appointments]
  );

  const counts = useMemo(() => {
    const base = { upcoming: 0, completed: 0, past: 0 };
    normalizedAppointments.forEach((appt) => {
      if (appt.status === "completed") base.completed += 1;
      else if (appt.status === "missed" || appt.status === "cancelled") base.past += 1;
      else base.upcoming += 1;
    });
    return base;
  }, [normalizedAppointments]);

  const sortedAppointments = useMemo(
    () =>
      [...normalizedAppointments].sort((a, b) => {
        const aTime = a.parsedDate ? a.parsedDate.getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.parsedDate ? b.parsedDate.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }),
    [normalizedAppointments]
  );

  const filteredAppointments = useMemo(() => {
    return sortedAppointments.filter((appt) => {
      if (activeTab === "all") return true;
      if (activeTab === "completed") return appt.status === "completed";
      if (activeTab === "past") return appt.status === "missed" || appt.status === "cancelled";
      // upcoming
      return appt.status === "scheduled";
    });
  }, [activeTab, sortedAppointments]);

  const nextAppointment = sortedAppointments.find((appt) => appt.status === "scheduled");

  const tabOptions = [
    { id: "upcoming", label: `Upcoming (${counts.upcoming})` },
    { id: "completed", label: `Completed (${counts.completed})` },
    { id: "past", label: `Past / Cancelled (${counts.past})` },
    { id: "all", label: `All (${normalizedAppointments.length})` },
  ];

  const renderPetChip = (pet: Pet | undefined) => {
    if (!pet) return null;
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/5 text-[11px] font-bold uppercase text-slate-700">
          {pet.name.slice(0, 1)}
        </span>
        {pet.name}
      </span>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Appointments", href: "/dashboard/appointments" },
        ]}
      />

      <SectionHeader
        eyebrow="Care timeline"
        title="Appointments & follow-ups"
        description="Track every vet visit, see what is coming up, and keep clinic details close."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-slate-200 px-4 text-sm"
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-5 text-sm text-white shadow-lg shadow-blue-500/20"
              onClick={() => router.push("/dashboard/appointments/new")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add appointment
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Surface variant="glass" interactive={false} className="p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total appointments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{normalizedAppointments.length}</p>
          <p className="text-xs text-slate-500">All pets, all statuses</p>
        </Surface>
        <Surface variant="glass" interactive={false} className="p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Upcoming</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{counts.upcoming}</p>
          <p className="text-xs text-slate-500">Scheduled and in the future</p>
        </Surface>
        <Surface variant="glass" interactive={false} className="p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{counts.completed}</p>
          <p className="text-xs text-slate-500">Logged visits</p>
        </Surface>
        <Surface variant="glass" interactive={false} className="p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Next up</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {nextAppointment?.parsedDate ? format(nextAppointment.parsedDate, "MMM d") : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {nextAppointment ? formatWhen(nextAppointment.parsedDate, nextAppointment.status) : "No visits scheduled"}
          </p>
        </Surface>
      </div>

      <Surface variant="panel" className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Filter timeline</p>
            <p className="text-base font-semibold text-slate-900">Spot the right visits fast</p>
          </div>
          <PillSwitcher
            options={tabOptions}
            value={activeTab}
            onChange={(value) => setActiveTab(value as typeof activeTab)}
            size="sm"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50/80"
              />
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <Surface
            variant="glass"
            className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 p-8 text-center"
            interactive={false}
          >
            <div className="rounded-full bg-blue-50 p-3 text-blue-500">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Nothing here yet</h3>
            <p className="text-sm text-slate-500">Schedule your next vet visit to see it in the timeline.</p>
            <Button className="rounded-full px-5" onClick={() => router.push("/dashboard/appointments/new")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Schedule appointment
            </Button>
          </Surface>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appointment, index) => {
              const pet = petLookup.get(appointment.petId);
              const status = statusCopy[appointment.status];

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Surface
                    variant="glass"
                    className="group relative overflow-hidden rounded-3xl border border-white/70 p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(15,23,42,0.12)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700">
                          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{appointment.parsedDate ? format(appointment.parsedDate, "LLL") : "TBD"}</span>
                          <span className="text-xl font-semibold">
                            {appointment.parsedDate ? format(appointment.parsedDate, "d") : "?"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                              {appointment.title || "Appointment"}
                            </h3>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em]",
                                status.pill
                              )}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                            {appointment.time && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                                <Clock className="h-3.5 w-3.5" />
                                {appointment.time}
                              </span>
                            )}
                            {appointment.veterinarian && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                                <User className="h-3.5 w-3.5" />
                                {appointment.veterinarian}
                              </span>
                            )}
                            {appointment.location && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                                <MapPin className="h-3.5 w-3.5" />
                                {appointment.location}
                              </span>
                            )}
                            {renderPetChip(pet)}
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-slate-600 line-clamp-2">{appointment.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right text-xs text-slate-500 sm:text-sm">
                        <p>{formatWhen(appointment.parsedDate, appointment.status)}</p>
                        <Link
                          href={`/dashboard/appointments/${appointment.id}`}
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View details <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </Surface>
                </motion.div>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
}
