'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthInsight {
  id: string;
  type: 'positive' | 'warning' | 'critical' | 'neutral';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: 'prevention' | 'nutrition' | 'exercise' | 'medical' | 'behavior';
  actionable: boolean;
  action?: string;
  trend?: 'improving' | 'stable' | 'declining';
  metrics?: {
    label: string;
    value: string | number;
    change?: string;
  }[];
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

  // Mock AI-generated insights based on health score and pet data
  const insights: HealthInsight[] = useMemo(() => {
    const baseInsights: HealthInsight[] = [];

    if (healthScore >= 90) {
      baseInsights.push({
        id: '1',
        type: 'positive',
        title: 'Excellent Health Trajectory',
        description: `${petName}'s health indicators are performing in the top 10% for ${breed} ${species}s of similar age.`,
        confidence: 94,
        impact: 'high',
        category: 'medical',
        actionable: false,
        trend: 'improving',
        metrics: [
          { label: 'Overall Score', value: healthScore, change: '+3%' },
          { label: 'Peer Ranking', value: 'Top 10%' },
        ],
      });
    }

    if (healthScore < 70) {
      baseInsights.push({
        id: '2',
        type: 'warning',
        title: 'Health Score Below Optimal',
        description: 'AI analysis suggests scheduling a comprehensive health check within 2 weeks.',
        confidence: 87,
        impact: 'high',
        category: 'prevention',
        actionable: true,
        action: 'Schedule Checkup',
        trend: 'declining',
        metrics: [
          { label: 'Risk Level', value: 'Moderate' },
          { label: 'Action Timeline', value: '2 weeks' },
        ],
      });
    }

    if (weight > 30) {
      baseInsights.push({
        id: '3',
        type: 'warning',
        title: 'Weight Management Alert',
        description: `Based on breed standards, ${petName} may benefit from a nutrition adjustment plan.`,
        confidence: 82,
        impact: 'medium',
        category: 'nutrition',
        actionable: true,
        action: 'Get Diet Plan',
        trend: 'stable',
        metrics: [
          { label: 'Current Weight', value: `${weight}kg` },
          { label: 'Ideal Range', value: '20-25kg' },
        ],
      });
    }

    if (age >= 7) {
      baseInsights.push({
        id: '4',
        type: 'neutral',
        title: 'Senior Care Recommendations',
        description: 'AI suggests transitioning to senior-specific care protocols for optimal health maintenance.',
        confidence: 91,
        impact: 'medium',
        category: 'prevention',
        actionable: true,
        action: 'View Senior Plan',
        trend: 'stable',
        metrics: [
          { label: 'Life Stage', value: 'Senior' },
          { label: 'Care Level', value: 'Enhanced' },
        ],
      });
    }

    baseInsights.push({
      id: '5',
      type: 'positive',
      title: 'Vaccination Schedule Optimized',
      description: 'All core vaccinations are up-to-date with smart reminders configured.',
      confidence: 98,
      impact: 'low',
      category: 'medical',
      actionable: false,
      trend: 'stable',
      metrics: [
        { label: 'Compliance', value: '100%' },
        { label: 'Next Due', value: '3 months' },
      ],
    });

    if (species === 'dog') {
      baseInsights.push({
        id: '6',
        type: 'neutral',
        title: 'Exercise Pattern Analysis',
        description: 'AI recommends 15% increase in daily activity based on breed energy requirements.',
        confidence: 76,
        impact: 'medium',
        category: 'exercise',
        actionable: true,
        action: 'Activity Guide',
        trend: 'stable',
        metrics: [
          { label: 'Current Activity', value: '45 min/day' },
          { label: 'Recommended', value: '60 min/day' },
        ],
      });
    }

    return baseInsights;
  }, [healthScore, petName, species, breed, age, weight]);

  // Mock predictive trends
  const predictiveTrends: PredictiveTrend[] = useMemo(() => [
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
  ], [healthScore, weight]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const getTypeIcon = (type: HealthInsight['type']) => {
    switch (type) {
      case 'positive':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return Info;
    }
  };

  const getTypeColor = (type: HealthInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'from-emerald-500/90 to-green-600/90';
      case 'warning':
        return 'from-amber-500/90 to-orange-600/90';
      case 'critical':
        return 'from-red-500/90 to-rose-600/90';
      default:
        return 'from-slate-500/90 to-slate-600/90';
    }
  };

  const getCategoryIcon = (category: HealthInsight['category']) => {
    switch (category) {
      case 'medical':
        return Heart;
      case 'exercise':
        return Activity;
      case 'nutrition':
        return Shield;
      case 'prevention':
        return Calendar;
      default:
        return Brain;
    }
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
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
            <div className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-medium text-emerald-700">
            AI actively monitoring {petName}&rsquo;s health patterns
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
              {/* Mini progress bar */}
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
        </h4>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const TypeIcon = getTypeIcon(insight.type);
            const CategoryIcon = getCategoryIcon(insight.category);
            const isExpanded = activeInsight === insight.id;

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-sm backdrop-blur-sm"
              >
                <button
                  onClick={() => setActiveInsight(isExpanded ? null : insight.id)}
                  className="w-full p-4 text-left transition-colors hover:bg-white/95"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'rounded-xl bg-gradient-to-br p-2 text-white shadow-md',
                      getTypeColor(insight.type)
                    )}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h5 className="font-semibold text-slate-900">{insight.title}</h5>
                        {insight.trend && (
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            insight.trend === 'improving' && 'bg-green-100 text-green-700',
                            insight.trend === 'stable' && 'bg-blue-100 text-blue-700',
                            insight.trend === 'declining' && 'bg-red-100 text-red-700'
                          )}>
                            {insight.trend === 'improving' && <TrendingUp className="inline h-3 w-3" />}
                            {insight.trend === 'declining' && <TrendingDown className="inline h-3 w-3" />}
                            {insight.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{insight.description}</p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <CategoryIcon className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">{insight.category}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{insight.confidence}% confidence</span>
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
                        {insight.metrics && (
                          <div className="mb-3 grid grid-cols-2 gap-3">
                            {insight.metrics.map((metric) => (
                              <div key={metric.label} className="rounded-xl bg-slate-50 p-2">
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
                        {insight.actionable && insight.action && (
                          <button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg">
                            {insight.action}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
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
