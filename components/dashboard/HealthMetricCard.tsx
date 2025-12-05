"use client";

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { InteractiveSparkline } from './InteractiveSparkline';

interface HealthMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  icon: LucideIcon;
  sparklineData?: number[];
  color?: string;
  status?: 'excellent' | 'good' | 'needs_attention' | string;
  target?: string;
  context?: string;
  recommendation?: string;
}

export function HealthMetricCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  trendLabel = 'vs last week',
  icon: Icon,
  sparklineData,
  color = 'blue',
  status,
  target,
  context,
  recommendation
}: HealthMetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const statusClasses: Record<string, string> = {
    excellent: 'bg-green-50 text-green-700 border border-green-100',
    good: 'bg-blue-50 text-blue-700 border border-blue-100',
    needs_attention: 'bg-orange-50 text-orange-700 border border-orange-100',
  };

  const statusLabels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'On track',
    needs_attention: 'Needs attention',
  };

  const statusKey = typeof status === 'string' ? status.toLowerCase() : '';
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group cursor-pointer rounded-xl border border-gray-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-gray-300/80 hover:shadow-lg hover:shadow-gray-200/50 sm:rounded-2xl sm:p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-gray-500 sm:text-xs">{title}</h3>
          {target && (
            <p className="mt-0.5 text-[10px] text-gray-400 sm:mt-1 sm:text-[11px]">
              {target}
            </p>
          )}
        </div>
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-md sm:h-9 sm:w-9 sm:rounded-xl ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
          <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-105 sm:h-5 sm:w-5" />
        </div>
      </div>

      {status && (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:px-2.5 sm:py-1 sm:text-[11px] ${
          statusClasses[statusKey] || 'border border-gray-100 bg-gray-50 text-gray-500'
        }`}>
          {statusLabels[statusKey] || status}
        </span>
      )}

      <div className="mt-2.5 flex items-baseline gap-1.5 sm:mt-3 sm:gap-2">
        <div className="text-2xl font-semibold text-gray-900 sm:text-3xl">{formattedValue}</div>
        {unit && <div className="text-xs font-light text-gray-500 sm:text-sm">{unit}</div>}
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2.5 h-10 sm:mt-3 sm:h-12">
          <InteractiveSparkline data={sparklineData} color={color} />
        </div>
      )}

      {trend && trendValue && (
        <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
          <span className={`text-[11px] font-medium sm:text-xs ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
          {trendLabel && <span className="text-[11px] text-gray-400 sm:text-xs">{trendLabel}</span>}
        </div>
      )}

      {(context || recommendation) && (
        <div className="mt-2.5 space-y-1 text-[11px] leading-relaxed text-gray-500 sm:mt-3 sm:text-xs">
          {context && <p>{context}</p>}
          {recommendation && (
            <p className="font-semibold text-gray-600">
              {recommendation}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
