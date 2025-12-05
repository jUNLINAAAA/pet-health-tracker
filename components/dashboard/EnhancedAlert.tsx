"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Clock,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EnhancedAlertProps {
  id: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  recommendation?: string;
  createdAt: string;
  timeToAct?: string;
  category?: string;
  onResolve: (id: string) => void;
  onView?: (id: string) => void;
  resolving?: boolean;
}

export function EnhancedAlert({
  id,
  severity,
  message,
  recommendation,
  createdAt,
  timeToAct,
  category,
  onResolve,
  onView,
  resolving = false
}: EnhancedAlertProps) {
  const severityConfig = {
    high: {
      icon: AlertTriangle,
      iconBg: 'bg-red-500',
      bg: 'bg-gradient-to-br from-red-50 via-rose-50 to-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-700 border-red-200',
      accentLine: 'bg-gradient-to-r from-red-500 to-rose-500'
    },
    medium: {
      icon: AlertCircle,
      iconBg: 'bg-orange-500',
      bg: 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-700 border-orange-200',
      accentLine: 'bg-gradient-to-r from-orange-500 to-amber-500'
    },
    low: {
      icon: Info,
      iconBg: 'bg-blue-500',
      bg: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      accentLine: 'bg-gradient-to-r from-blue-500 to-cyan-500'
    }
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 backdrop-blur-sm transition-all duration-300",
          config.bg,
          config.border,
          "hover:shadow-lg"
        )}
      >
        {/* Accent Line */}
        <div className={cn("absolute left-0 top-0 h-full w-1", config.accentLine)} />

        <div className="p-5 pl-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110",
              config.iconBg
            )} aria-hidden="true">
              <Icon className="h-6 w-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                      config.badge
                    )}>
                      <span className="sr-only">Severity: </span>
                      {severity} priority
                    </span>
                    {category && (
                      <span className="inline-flex items-center rounded-full bg-white/70 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {category}
                      </span>
                    )}
                    {timeToAct && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {timeToAct}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-base font-semibold leading-snug", config.text)}>
                    {message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => onResolve(id)}
                  disabled={resolving}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-all hover:bg-white/70 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  aria-label={`Dismiss alert: ${message}`}
                >
                  {resolving ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Recommendation */}
              {recommendation && (
                <div className="rounded-xl bg-white/70 border border-white/80 p-3 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 leading-relaxed">
                    <span aria-label="Recommendation">💡</span> {recommendation}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-gray-500">
                  Created {format(new Date(createdAt), "MMM d 'at' h:mm a")}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResolve(id)}
                    disabled={resolving}
                    className={cn(
                      "h-8 gap-1 text-xs font-semibold",
                      "hover:bg-white/70 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Resolved
                  </Button>

                  {onView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(id)}
                      className="h-8 gap-1 text-xs font-semibold hover:bg-white/70 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View Details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
