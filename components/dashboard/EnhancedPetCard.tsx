"use client";

import { motion } from "framer-motion";
import { AlertCircle, Calendar, Heart, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ProgressRing } from "./ProgressRing";
import { getScoreColor } from "@/lib/unified-health-system";
import { cn } from "@/lib/utils";

interface EnhancedPetCardProps {
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    image?: string;
    weight?: number;
  };
  healthScore: number;
  urgentAlerts?: number;
  nextAppointment?: Date;
  index?: number;
}

export function EnhancedPetCard({
  pet,
  healthScore,
  urgentAlerts = 0,
  nextAppointment,
  index = 0
}: EnhancedPetCardProps) {
  const scoreColor = getScoreColor(healthScore);
  const hasUrgentIssue = urgentAlerts > 0 || healthScore < 60;
  const isExcellent = healthScore >= 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <Link href={`/dashboard/pets/${pet.id}`}>
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-[28px] border-2 bg-white backdrop-blur-xl transition-all duration-300",
            hasUrgentIssue
              ? "border-orange-200/80 shadow-xl shadow-orange-500/15"
              : isExcellent
              ? "border-emerald-200/60 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/20"
              : "border-slate-200/60 shadow-lg hover:border-slate-300/80 hover:shadow-xl hover:shadow-slate-300/40"
          )}
        >
          {/* Urgent Alert Badge */}
          {hasUrgentIssue && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-orange-500/30"
            >
              <AlertCircle className="h-3.5 w-3.5 animate-pulse" />
              Needs attention
            </motion.div>
          )}

          {/* Excellent Badge */}
          {isExcellent && !hasUrgentIssue && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/30"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Excellent
            </motion.div>
          )}

          {/* Pet Image or Avatar */}
          <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {pet.image ? (
              <Image
                src={pet.image}
                alt={pet.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-all duration-700 ease-out group-hover:scale-110"
                priority={index === 0}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className="h-20 w-20 text-slate-200 transition-colors duration-300 group-hover:text-pink-400" />
                </motion.div>
              </div>
            )}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100" />

            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </div>

          {/* Card Content */}
          <div className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-1 text-xl font-bold text-slate-900 transition-colors duration-200 group-hover:text-blue-600">
                  {pet.name}
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  {pet.species}
                  {pet.breed && <span className="text-slate-400"> • {pet.breed}</span>}
                </p>
                {pet.weight && (
                  <p className="mt-1.5 text-xs font-semibold text-slate-400">
                    {pet.weight} kg
                  </p>
                )}
              </div>

              {/* Health Score Ring */}
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.2 }}
                className="relative -mt-2"
              >
                <ProgressRing
                  progress={healthScore}
                  size={72}
                  strokeWidth={6}
                  color={scoreColor}
                  showPercentage={false}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-900">{healthScore}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Score</span>
                </div>
              </motion.div>
            </div>

            {/* Quick Info Pills */}
            <div className="flex flex-wrap gap-2">
              {urgentAlerts > 0 && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm"
                >
                  <AlertCircle className="h-3 w-3" />
                  {urgentAlerts} {urgentAlerts === 1 ? 'alert' : 'alerts'}
                </motion.div>
              )}
              {nextAppointment && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"
                >
                  <Calendar className="h-3 w-3" />
                  {new Date(nextAppointment).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </motion.div>
              )}
              {!urgentAlerts && !nextAppointment && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm"
                >
                  <Heart className="h-3 w-3" />
                  Healthy
                </motion.div>
              )}
            </div>

            {/* View Details Hint */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 opacity-0 transition-all duration-300 group-hover:opacity-100"
            >
              <span>View details</span>
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.div>
          </div>

          {/* Hover Effect Accent */}
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 transition-all duration-300 group-hover:opacity-100" />
        </motion.div>
      </Link>
    </motion.div>
  );
}
