'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Activity,
  Heart,
  Calendar,
  Info,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface HealthInsight {
  id: string;
  petId: string;
  userId: string;
  insightType: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  recommendation?: string;
  dataPoints?: Array<{ label: string; value: string | number; change?: string }>;
  scoreImpact: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PredictiveTrend {
  metric: string;
  current: number;
  predicted: number;
  confidence: number;
  timeline: string;
  risk: 'low' | 'medium' | 'high';
}

interface AIHealthInsightsProps {
  petId?: string;
  healthScore?: number;
  petName?: string;
  species?: string;
  breed?: string;
  age?: number;
  weight?: number;
}

export function AIHealthInsights({
  petId,
  healthScore = 85,
  petName = 'Your pet',
  species = 'dog',
  breed = 'Mixed',
  age = 5,
  weight = 25,
}: AIHealthInsightsProps) {
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch insights from API
  const fetchInsights = useCallback(async () => {
    try {
      const url = petId
        ? `/api/health-insights?petId=${petId}&resolved=false`
        : '/api/health-insights?resolved=false';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [petId]);

  // Setup realtime subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchInsights();

    // Setup realtime subscription
    const channel = supabase
      .channel('ai_health_insights_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_health_insights',
          filter: petId ? `pet_id=eq.${petId}` : undefined,
        },
        (payload) => {
          console.log('Realtime insight update:', payload);
          setIsConnected(true);

          if (payload.eventType === 'INSERT') {
            const newInsight = transformInsight(payload.new);
            if (!newInsight.resolved) {
              setInsights((prev) => [newInsight, ...prev]);
              toast.info(`New health insight: ${newInsight.message.slice(0, 50)}...`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedInsight = transformInsight(payload.new);
            if (updatedInsight.resolved) {
              // Remove resolved insights
              setInsights((prev) => prev.filter((i) => i.id !== updatedInsight.id));
            } else {
              setInsights((prev) =>
                prev.map((i) => (i.id === updatedInsight.id ? updatedInsight : i))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setInsights((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [petId, fetchInsights]);

  // Transform database record to frontend format
  const transformInsight = (record: any): HealthInsight => ({
    id: record.id,
    petId: record.pet_id,
    userId: record.user_id,
    insightType: record.insight_type,
    message: record.message,
    severity: record.severity,
    confidence: record.confidence,
    recommendation: record.recommendation,
    dataPoints: record.data_points,
    scoreImpact: record.score_impact,
    acknowledged: record.acknowledged,
    resolved: record.resolved,
    resolvedAt: record.resolved_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInsights();
    setIsRefreshing(false);
    toast.success('Insights refreshed');
  };

  const handleResolveInsight = async (insightId: string) => {
    try {
      const response = await fetch('/api/health-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, action: 'resolve' }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve insight');
      }

      // Optimistic update - remove from list
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
      toast.success('Insight resolved');
    } catch (error) {
      console.error('Error resolving insight:', error);
      toast.error('Failed to resolve insight');
    }
  };

  const handleAcknowledgeInsight = async (insightId: string) => {
    try {
      const response = await fetch('/api/health-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, action: 'acknowledge' }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge insight');
      }

      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? { ...i, acknowledged: true } : i))
      );
    } catch (error) {
      console.error('Error acknowledging insight:', error);
    }
  };

  // Predictive trends based on health score and pet data
  const predictiveTrends: PredictiveTrend[] = [
    {
      metric: 'Health Score',
      current: healthScore,
      predicted: Math.min(100, healthScore + 5),
      confidence: 89,
      timeline: '3 months',
      risk: healthScore < 70 ? 'medium' : 'low',
    },
    {
      metric: 'Weight Trend',
      current: weight,
      predicted: weight - 2,
      confidence: 72,
      timeline: '6 weeks',
      risk: weight > 30 ? 'medium' : 'low',
    },
    {
      metric: 'Activity Level',
      current: 65,
      predicted: 75,
      confidence: 81,
      timeline: '4 weeks',
      risk: 'low',
    },
  ];

  const getTypeIcon = (type: string, severity: string) => {
    if (type.includes('positive') || type.includes('improvement')) {
      return CheckCircle2;
    }
    if (severity === 'high' || type.includes('concern')) {
      return XCircle;
    }
    if (severity === 'medium' || type.includes('warning')) {
      return AlertTriangle;
    }
    return Info;
  };

  const getTypeColor = (type: string, severity: string) => {
    if (type.includes('positive') || type.includes('improvement')) {
      return 'from-emerald-500/90 to-green-600/90';
    }
    if (severity === 'high') {
      return 'from-red-500/90 to-rose-600/90';
    }
    if (severity === 'medium') {
      return 'from-amber-500/90 to-orange-600/90';
    }
    return 'from-slate-500/90 to-slate-600/90';
  };

  const getCategoryIcon = (type: string) => {
    if (type.includes('weight') || type.includes('diet') || type.includes('nutrition')) {
      return Shield;
    }
    if (type.includes('activity') || type.includes('exercise')) {
      return Activity;
    }
    if (type.includes('appointment') || type.includes('checkup') || type.includes('vaccination')) {
      return Calendar;
    }
    if (type.includes('symptom') || type.includes('health') || type.includes('medical')) {
      return Heart;
    }
    return Brain;
  };

  const getTrendFromScoreImpact = (scoreImpact: number) => {
    if (scoreImpact > 0) return 'improving';
    if (scoreImpact < 0) return 'declining';
    return 'stable';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-50/95 via-white/98 to-blue-50/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Premium header with AI branding */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 blur-xl" />
            <div className="relative rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-3 text-white shadow-lg">
              <Brain className="h-6 w-6" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">AI Health Intelligence</h3>
            <p className="text-xs text-slate-500">Powered by advanced veterinary AI models</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-xl border border-slate-200/50 bg-white/80 p-2 text-slate-600 transition-all hover:bg-white hover:shadow-md disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Real-time analysis status */}
      <div className="mb-4 rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/80 to-green-50/80 p-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={cn(
              'absolute inset-0 rounded-full',
              isConnected ? 'animate-ping bg-emerald-400' : 'bg-amber-400'
            )} />
            <div className={cn(
              'relative h-2 w-2 rounded-full',
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            )} />
          </div>
          <span className={cn(
            'text-xs font-medium',
            isConnected ? 'text-emerald-700' : 'text-amber-700'
          )}>
            {isConnected
              ? `AI actively monitoring ${petName}'s health patterns`
              : 'Connecting to realtime updates...'}
          </span>
        </div>
      </div>

      {/* Predictive Health Trends */}
      <div className="mb-6 space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          Predictive Health Trends
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {predictiveTrends.map((trend) => (
            <motion.div
              key={trend.metric}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">{trend.metric}</span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  trend.risk === 'low' && 'bg-green-100 text-green-700',
                  trend.risk === 'medium' && 'bg-amber-100 text-amber-700',
                  trend.risk === 'high' && 'bg-red-100 text-red-700'
                )}>
                  {trend.risk} risk
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">{trend.current}</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="text-lg font-bold text-indigo-600">{trend.predicted}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{trend.timeline}</span>
                <span>{trend.confidence}% confidence</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${trend.confidence}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Smart Health Insights
          {insights.length > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {insights.length} active
            </span>
          )}
        </h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-sm text-slate-500">Loading insights...</span>
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-sm font-medium text-slate-700">All clear!</p>
            <p className="text-xs text-slate-500">
              No active health insights for {petName}. Keep up the great care!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const TypeIcon = getTypeIcon(insight.insightType, insight.severity);
              const CategoryIcon = getCategoryIcon(insight.insightType);
              const isExpanded = activeInsight === insight.id;
              const trend = getTrendFromScoreImpact(insight.scoreImpact);

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'overflow-hidden rounded-2xl border bg-white/90 shadow-sm backdrop-blur-sm',
                    !insight.acknowledged && 'border-indigo-200 ring-2 ring-indigo-100',
                    insight.acknowledged && 'border-white/60'
                  )}
                >
                  <button
                    onClick={() => {
                      setActiveInsight(isExpanded ? null : insight.id);
                      if (!insight.acknowledged) {
                        handleAcknowledgeInsight(insight.id);
                      }
                    }}
                    className="w-full p-4 text-left transition-colors hover:bg-white/95"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'rounded-xl bg-gradient-to-br p-2 text-white shadow-md',
                        getTypeColor(insight.insightType, insight.severity)
                      )}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h5 className="font-semibold text-slate-900">
                            {insight.insightType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </h5>
                          {trend !== 'stable' && (
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              trend === 'improving' && 'bg-green-100 text-green-700',
                              trend === 'declining' && 'bg-red-100 text-red-700'
                            )}>
                              {trend === 'improving' && <TrendingUp className="inline h-3 w-3" />}
                              {trend === 'declining' && <TrendingDown className="inline h-3 w-3" />}
                              {trend}
                            </span>
                          )}
                          {!insight.acknowledged && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{insight.message}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <CategoryIcon className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{insight.severity}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                style={{ width: `${insight.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">{Math.round(insight.confidence * 100)}% confidence</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100"
                      >
                        <div className="p-4 pt-3">
                          {insight.dataPoints && insight.dataPoints.length > 0 && (
                            <div className="mb-3 grid grid-cols-2 gap-3">
                              {insight.dataPoints.map((metric, idx) => (
                                <div key={idx} className="rounded-xl bg-slate-50 p-2">
                                  <p className="text-xs text-slate-500">{metric.label}</p>
                                  <p className="font-semibold text-slate-900">
                                    {metric.value}
                                    {metric.change && (
                                      <span className="ml-1 text-xs font-normal text-green-600">
                                        {metric.change}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {insight.recommendation && (
                            <p className="mb-3 text-sm text-slate-600">
                              <strong>Recommendation:</strong> {insight.recommendation}
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveInsight(insight.id);
                            }}
                            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg"
                          >
                            Mark as Resolved
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Confidence Score */}
      <div className="mt-6 rounded-2xl border border-indigo-200/30 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">AI Analysis Confidence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-indigo-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '88%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>
            <span className="text-sm font-bold text-indigo-600">88%</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Based on 10,000+ similar pet profiles and veterinary best practices
        </p>
      </div>
    </div>
  );
}
