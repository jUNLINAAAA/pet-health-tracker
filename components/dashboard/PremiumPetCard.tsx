"use client";

/**
 * PremiumPetCard Component
 *
 * Premium iOS 26-inspired pet card with:
 * - Glassmorphism with depth
 * - Animated health rings
 * - Smooth hover transitions with 3D effect
 * - Quick actions overlay
 * - Status badges with glow
 * - Touch-friendly on mobile
 *
 * @example
 * <PremiumPetCard
 *   pet={pet}
 *   score={score}
 *   onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
 * />
 */

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useState, useRef } from "react";
import {
  Heart,
  Activity,
  Calendar,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Stethoscope,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";
import { getScoreColor } from "@/lib/unified-health-system";
import { formatDistanceToNow } from "date-fns";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  imageUrl?: string;
  createdAt?: string;
}

interface PetScore {
  overall: number;
  weight?: number;
  activity?: number;
  nutrition?: number;
}

interface PremiumPetCardProps {
  pet: Pet;
  score?: PetScore | null;
  onClick?: () => void;
  delay?: number;
}

export function PremiumPetCard({
  pet,
  score,
  onClick,
  delay = 0,
}: PremiumPetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D hover effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowActions(false);
    x.set(0);
    y.set(0);
  };

  const petImage = pet.imageUrl || getDefaultPetImage(pet.species);
  const scoreColor = score ? getScoreColor(score.overall) : "#94A3B8";

  const quickActions = [
    {
      icon: Activity,
      label: "Add Record",
      color: "from-blue-500 to-indigo-500",
    },
    {
      icon: Calendar,
      label: "Schedule",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Edit3,
      label: "Edit Profile",
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => setShowActions(!showActions)}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      {/* Premium glassmorphic card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-2xl",
          "shadow-[0_20px_70px_rgba(15,23,42,0.12)] transition-all duration-500",
          "hover:shadow-[0_30px_90px_rgba(15,23,42,0.18)] hover:border-white/80"
        )}
      >
        {/* Gradient overlay on hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),_transparent_60%)] pointer-events-none"
        />

        {/* Glow effect on hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-[32px] blur-xl -z-10"
        />

        {/* Pet Image Section */}
        <div className="relative h-40 sm:h-48 md:h-56 overflow-hidden rounded-t-[32px]">
          {/* Image with gradient overlay */}
          <motion.div
            className="h-full w-full"
            animate={{
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${petImage})`,
              }}
            />
          </motion.div>

          {/* Bottom gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />

          {/* Status badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 backdrop-blur-xl shadow-lg"
            >
              <Heart className="h-3.5 w-3.5 text-rose-500" fill="currentColor" />
              <span className="text-xs font-bold text-slate-900">{pet.species}</span>
            </motion.div>

            {score && score.overall >= 90 && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
                className="relative flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1.5 shadow-lg shadow-amber-500/40"
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-bold text-white">Excellent</span>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -inset-0.5 rounded-full bg-amber-400/30 blur-md -z-10"
                />
              </motion.div>
            )}
          </div>

          {/* Quick Actions Overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isHovered || showActions ? 1 : 0,
              y: isHovered || showActions ? 0 : 20,
            }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-4 bottom-4 flex gap-2"
          >
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: isHovered || showActions ? 1 : 0,
                    y: isHovered || showActions ? 0 : 10,
                  }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle action
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/95 backdrop-blur-xl px-3 py-2.5 shadow-lg transition-all",
                    "hover:scale-105 active:scale-95 hover:shadow-xl"
                  )}
                >
                  <Icon className="h-4 w-4 text-slate-700" />
                  <span className="hidden text-xs font-semibold text-slate-900 sm:inline">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* Card Content */}
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Pet Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <motion.h3
                  className="text-2xl font-bold text-slate-900 truncate"
                  animate={{
                    scale: isHovered ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {pet.name}
                </motion.h3>
              </div>

              <p className="mt-1 text-sm text-slate-600">
                {pet.breed || pet.species}
                {pet.age && ` • ${pet.age} ${pet.age === 1 ? "year" : "years"}`}
              </p>

              {/* Stats Row */}
              <div className="mt-4 flex flex-wrap gap-3">
                {pet.weight && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900">
                      {pet.weight} kg
                    </span>
                  </div>
                )}

                {pet.createdAt && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-slate-600">
                      {formatDistanceToNow(new Date(pet.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Health Score Ring */}
            {score && (
              <motion.div
                animate={{
                  scale: isHovered ? 1.1 : 1,
                  rotate: isHovered ? 5 : 0,
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex-shrink-0"
              >
                <div className="relative h-24 w-24">
                  <ProgressRing
                    progress={score.overall}
                    size={96}
                    strokeWidth={8}
                    color={scoreColor}
                    showPercentage={false}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">
                      {score.overall}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Score
                    </span>
                  </div>

                  {/* Pulsing glow on high score */}
                  {score.overall >= 90 && (
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${scoreColor}40, transparent)`,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* View Details Footer */}
          <motion.div
            animate={{
              x: isHovered ? 5 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="mt-5 flex items-center justify-between pt-5 border-t border-slate-100"
          >
            <span className="text-sm font-semibold text-blue-600">View Full Profile</span>
            <ChevronRight className="h-5 w-5 text-blue-600" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to get default pet images
function getDefaultPetImage(species: string): string {
  const defaults: Record<string, string> = {
    Dog: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&fit=crop",
    Cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop",
    Bird: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&auto=format&fit=crop",
    Rabbit: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&auto=format&fit=crop",
  };

  return (
    defaults[species] ||
    "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&auto=format&fit=crop"
  );
}
