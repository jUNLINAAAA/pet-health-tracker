"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  MapPin,
  PlusCircle,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import Breadcrumb from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { useHealth, type Appointment, type Pet } from "@/lib/health-context";
import { cn } from "@/lib/utils";
import { AppointmentService, StorageService } from "@/lib/services";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    icon: <AlertCircle className="h-4 w-4" />,
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

export default function AppointmentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { appointments, pets, loading, reload } = useHealth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const normalizedAppointments = useMemo(
    () => appointments.map((appt) => normalizeAppointment(appt)),
    [appointments]
  );

  const appointment = normalizedAppointments.find((appt) => appt.id === params.id) || null;
  const pet: Pet | undefined = useMemo(
    () => pets.find((p) => p.id === appointment?.petId),
    [pets, appointment]
  );

  const handleDelete = async () => {
    if (!appointment) return;
    setDeleting(true);
    try {
      // Delete any attachments first
      await StorageService.deleteAppointmentAttachments(appointment.id);
      // Delete the appointment
      await AppointmentService.deleteAppointment(appointment.id);
      toast.success("Appointment deleted successfully");
      await reload();
      router.push("/dashboard/appointments");
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Failed to delete appointment. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Appointment not found</h1>
        <p className="text-slate-500">It may have been removed or you followed an outdated link.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => router.push("/dashboard/appointments")}>Back to appointments</Button>
          <Button className="rounded-full" onClick={() => router.push("/dashboard/appointments/new")}>Schedule new</Button>
        </div>
      </div>
    );
  }

  const status = statusCopy[appointment.status];
  const dateLabel = appointment.parsedDate ? format(appointment.parsedDate, "EEEE, MMM d") : "Date TBD";
  const whenLabel = appointment.parsedDate
    ? formatDistanceToNow(appointment.parsedDate, { addSuffix: true })
    : "Awaiting details";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Appointments", href: "/dashboard/appointments" },
          { label: appointment.title || "Appointment", href: `/dashboard/appointments/${appointment.id}` },
        ]}
      />

      <SectionHeader
        eyebrow="Visit details"
        title={appointment.title || "Appointment"}
        description="Clinic details, who is attending, and what to expect."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full text-sm"
              onClick={() => router.push(`/dashboard/appointments/${appointment.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => router.push("/dashboard/appointments")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <Surface variant="gradient" className="overflow-hidden p-0">
        <div className="relative grid gap-6 p-6 md:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]",
                  status.pill
                )}
              >
                {status.icon}
                {status.label}
              </span>
              <span className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                {whenLabel}
              </span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-white/70">Date & time</p>
              <p className="text-3xl font-semibold tracking-tight">{dateLabel}</p>
              {appointment.time && <p className="text-white/80">{appointment.time}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {appointment.location && (
                <Surface variant="subtle" interactive={false} className="bg-white/15 text-white">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Location</p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" /> {appointment.location}
                  </p>
                </Surface>
              )}
              {appointment.veterinarian && (
                <Surface variant="subtle" interactive={false} className="bg-white/15 text-white">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Veterinarian</p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" /> {appointment.veterinarian}
                  </p>
                </Surface>
              )}
            </div>
            {appointment.notes && (
              <p className="text-sm text-white/80">{appointment.notes}</p>
            )}
          </div>

          <Surface variant="glass" className="relative overflow-hidden rounded-2xl p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/20" />
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-slate-900">Reminder</p>
                <p className="text-sm text-slate-600">Arrive 10 minutes early to share weight and recent symptoms.</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {appointment.parsedDate && (
                    <span className="rounded-full bg-slate-100 px-3 py-1">{formatDistanceToNow(appointment.parsedDate, { addSuffix: true })}</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1">Bring vaccination history</span>
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </Surface>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Surface variant="panel" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-text text-slate-400">Visit checklist</p>
              <p className="text-lg font-semibold text-slate-900">What to cover</p>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-slate-200"
              onClick={() => router.push("/dashboard/appointments/new")}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Schedule follow-up
            </Button>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <ChecklistItem label="Confirm weight trend" />
            <ChecklistItem label="Share recent alerts" />
            <ChecklistItem label="Capture new notes from vet" />
          </div>
        </Surface>

        <Surface variant="panel" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-text text-slate-400">Pet</p>
              <p className="text-lg font-semibold text-slate-900">Who is attending</p>
            </div>
          </div>
          {pet ? (
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {pet.image ? (
                  <Image
                    src={pet.image}
                    alt={pet.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-500">
                    {pet.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">{pet.name}</p>
                <p className="text-sm text-slate-500">{pet.species} {pet.breed ? `• ${pet.breed}` : ""}</p>
                <p className="text-xs text-slate-400">Weight {pet.weight ? `${pet.weight} kg` : "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Pet profile missing.</p>
          )}
        </Surface>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Appointment?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This action cannot be undone. Are you sure you want to delete &ldquo;{appointment.title}&rdquo;?
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

function ChecklistItem({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2"
    >
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      <span>{label}</span>
    </motion.div>
  );
}
