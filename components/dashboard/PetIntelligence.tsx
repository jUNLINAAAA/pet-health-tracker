'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Dna,
  Activity,
  Apple,
  Heart,
  TrendingUp,
  Brain,
  Sparkles,
  Award,
  Target,
  Zap,
  BarChart3,
  Info,
  ChevronRight,
  Shield,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreedInsight {
  trait: string;
  value: number;
  percentile: number;
  description: string;
  recommendation?: string;
}

interface ActivityRecommendation {
  type: string;
  duration: string;
  frequency: string;
  intensity: 'low' | 'moderate' | 'high';
  benefits: string[];
  caution?: string;
}

interface DietSuggestion {
  category: string;
  recommendation: string;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
  portions?: string;
}

interface HealthPrediction {
  condition: string;
  riskLevel: 'low' | 'moderate' | 'high';
  probability: number;
  timeline: string;
  preventionTips: string[];
}

interface PetIntelligenceProps {
  petId?: string;
  petName?: string;
  species?: string;
  breed?: string;
  age?: number;
  weight?: number;
  activityLevel?: 'low' | 'moderate' | 'high';
  healthScore?: number;
}

export function PetIntelligence({
  petName = 'Your pet',
  species = 'dog',
  breed = 'Golden Retriever',
  age = 5,
  weight = 30,
  activityLevel = 'moderate',
  healthScore = 85,
}: PetIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<'breed' | 'activity' | 'diet' | 'predictions'>('breed');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Mock breed-specific insights
  const breedInsights: BreedInsight[] = useMemo(() => {
    if (species === 'dog' && breed.includes('Golden')) {
      return [
        {
          trait: 'Energy Level',
          value: 85,
          percentile: 90,
          description: 'Golden Retrievers are highly energetic dogs requiring substantial daily exercise.',
          recommendation: 'Aim for 60-90 minutes of activity daily, including fetch and swimming.',
        },
        {
          trait: 'Intelligence',
          value: 92,
          percentile: 95,
          description: 'Ranked 4th in canine intelligence, excellent for training and mental stimulation.',
          recommendation: 'Incorporate puzzle toys and training sessions to prevent boredom.',
        },
        {
          trait: 'Social Needs',
          value: 88,
          percentile: 85,
          description: 'Highly social breed that thrives with human and animal companionship.',
          recommendation: 'Regular playdates and family interaction are essential for wellbeing.',
        },
        {
          trait: 'Grooming Requirements',
          value: 75,
          percentile: 70,
          description: 'Double coat requires regular maintenance to prevent matting.',
          recommendation: 'Brush 3-4 times weekly, professional grooming every 6-8 weeks.',
        },
      ];
    }
    return [
      {
        trait: 'Energy Level',
        value: 70,
        percentile: 65,
        description: `Typical ${breed} energy patterns for age ${age}.`,
      },
      {
        trait: 'Intelligence',
        value: 80,
        percentile: 75,
        description: 'Above average learning capacity and problem-solving skills.',
      },
      {
        trait: 'Social Needs',
        value: 75,
        percentile: 70,
        description: 'Moderate socialization requirements with regular interaction.',
      },
    ];
  }, [species, breed, age]);

  // Mock activity recommendations
  const activityRecommendations: ActivityRecommendation[] = useMemo(() => [
    {
      type: 'Walking',
      duration: '45-60 min',
      frequency: 'Daily',
      intensity: 'moderate',
      benefits: ['Cardiovascular health', 'Weight management', 'Mental stimulation'],
      caution: age > 7 ? 'Monitor for joint stress in senior years' : undefined,
    },
    {
      type: 'Swimming',
      duration: '20-30 min',
      frequency: '2-3x weekly',
      intensity: 'moderate',
      benefits: ['Low-impact exercise', 'Full-body workout', 'Joint-friendly'],
    },
    {
      type: 'Mental Games',
      duration: '15-20 min',
      frequency: 'Daily',
      intensity: 'low',
      benefits: ['Cognitive health', 'Reduces anxiety', 'Strengthens bond'],
    },
    {
      type: 'Fetch/Retrieve',
      duration: '20-30 min',
      frequency: '4-5x weekly',
      intensity: 'high',
      benefits: ['Natural instincts', 'High energy burn', 'Training reinforcement'],
      caution: 'Avoid on hot days, provide water breaks',
    },
  ], [age]);

  // Mock diet suggestions
  const dietSuggestions: DietSuggestion[] = useMemo(() => {
    const baseSuggestions: DietSuggestion[] = [
      {
        category: 'Protein',
        recommendation: `High-quality protein at 25-30% of diet for ${breed}`,
        reason: 'Maintains muscle mass and supports active lifestyle',
        priority: 'essential',
        portions: `${Math.round(weight * 0.8)}g daily`,
      },
      {
        category: 'Omega-3 Fatty Acids',
        recommendation: 'Fish oil supplementation recommended',
        reason: 'Supports coat health and reduces inflammation',
        priority: 'recommended',
        portions: '1000mg per 30lbs body weight',
      },
    ];

    if (weight > 28) {
      baseSuggestions.push({
        category: 'Calorie Management',
        recommendation: 'Consider weight management formula',
        reason: 'Current weight slightly above breed ideal',
        priority: 'recommended',
        portions: 'Reduce current portions by 10-15%',
      });
    }

    if (age >= 7) {
      baseSuggestions.push({
        category: 'Joint Support',
        recommendation: 'Add glucosamine and chondroitin supplements',
        reason: 'Senior dogs benefit from joint health support',
        priority: 'recommended',
      });
    }

    baseSuggestions.push({
      category: 'Hydration',
      recommendation: 'Fresh water available at all times',
      reason: 'Essential for kidney health and temperature regulation',
      priority: 'essential',
      portions: `${Math.round(weight * 50)}ml minimum daily`,
    });

    return baseSuggestions;
  }, [breed, weight, age]);

  // Mock health predictions
  const healthPredictions: HealthPrediction[] = useMemo(() => {
    const predictions: HealthPrediction[] = [];

    if (breed.includes('Golden')) {
      predictions.push({
        condition: 'Hip Dysplasia',
        riskLevel: age > 5 ? 'moderate' : 'low',
        probability: age > 5 ? 35 : 15,
        timeline: '2-4 years',
        preventionTips: [
          'Maintain healthy weight',
          'Regular low-impact exercise',
          'Joint supplements after age 5',
        ],
      });
    }

    if (weight > 28) {
      predictions.push({
        condition: 'Obesity-related Issues',
        riskLevel: 'moderate',
        probability: 40,
        timeline: '6-12 months',
        preventionTips: [
          'Implement portion control',
          'Increase daily exercise',
          'Regular weight monitoring',
        ],
      });
    }

    predictions.push({
      condition: 'Dental Disease',
      riskLevel: age > 3 ? 'moderate' : 'low',
      probability: age > 3 ? 45 : 20,
      timeline: '1-2 years',
      preventionTips: [
        'Daily teeth brushing',
        'Dental chews and toys',
        'Annual dental checkups',
      ],
    });

    if (age >= 7) {
      predictions.push({
        condition: 'Age-related Cognitive Decline',
        riskLevel: 'low',
        probability: 25,
        timeline: '3-5 years',
        preventionTips: [
          'Mental stimulation games',
          'Social interaction',
          'Omega-3 supplementation',
        ],
      });
    }

    return predictions;
  }, [breed, weight, age]);

  const tabs = [
    { id: 'breed', label: 'Breed Insights', icon: Dna },
    { id: 'activity', label: 'Activity Plan', icon: Activity },
    { id: 'diet', label: 'Nutrition AI', icon: Apple },
    { id: 'predictions', label: 'Health Forecast', icon: BarChart3 },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'from-green-500 to-emerald-600';
      case 'moderate':
        return 'from-amber-500 to-orange-600';
      case 'high':
        return 'from-red-500 to-rose-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low':
        return 'bg-blue-100 text-blue-700';
      case 'moderate':
        return 'bg-amber-100 text-amber-700';
      case 'high':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-violet-50/95 via-white/98 to-indigo-50/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Premium header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-xl" />
            <div className="relative rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-3 text-white shadow-lg">
              <Brain className="h-6 w-6" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Pet Intelligence Platform</h3>
            <p className="text-xs text-slate-500">Breed-specific AI analysis & predictions</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1">
          <Sparkles className="h-3 w-3 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">Premium AI</span>
        </div>
      </div>

      {/* Pet Summary Card */}
      <div className="mb-4 rounded-2xl border border-purple-200/30 bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">{petName}</h4>
            <p className="text-sm text-slate-600">{breed} • {age} years • {weight}kg</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">AI Health Score</p>
            <p className="text-2xl font-bold text-purple-600">{healthScore}/100</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100/50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'breed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="mb-3 rounded-xl bg-gradient-to-r from-purple-100/50 to-pink-100/50 p-3">
              <p className="text-sm font-medium text-purple-700">
                AI analysis based on 50,000+ {breed} profiles
              </p>
            </div>
            {breedInsights.map((insight) => (
              <div
                key={insight.trait}
                className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-semibold text-slate-900">{insight.trait}</h5>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                    Top {insight.percentile}%
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${insight.value}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{insight.value}/100</span>
                </div>
                <p className="text-sm text-slate-600">{insight.description}</p>
                {insight.recommendation && (
                  <div className="mt-3 rounded-xl bg-purple-50 p-3">
                    <p className="flex items-start gap-2 text-xs text-purple-700">
                      <Info className="h-3 w-3 flex-shrink-0" />
                      {insight.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-100/50 to-cyan-100/50 p-3">
              <p className="text-sm font-medium text-blue-700">
                Personalized activity plan for optimal {breed} health
              </p>
            </div>
            {activityRecommendations.map((activity) => (
              <div
                key={activity.type}
                className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-2 text-white">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-900">{activity.type}</h5>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {activity.frequency}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getIntensityColor(activity.intensity))}>
                    {activity.intensity}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
                  {activity.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
                {activity.caution && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2">
                    <p className="flex items-start gap-2 text-xs text-amber-700">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {activity.caution}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'diet' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="mb-3 rounded-xl bg-gradient-to-r from-green-100/50 to-emerald-100/50 p-3">
              <p className="text-sm font-medium text-green-700">
                AI-optimized nutrition plan for {petName}
              </p>
            </div>
            {dietSuggestions.map((diet) => (
              <div
                key={diet.category}
                className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-2 text-white">
                      <Apple className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-900">{diet.category}</h5>
                      <span className={cn(
                        'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        diet.priority === 'essential' && 'bg-red-100 text-red-700',
                        diet.priority === 'recommended' && 'bg-amber-100 text-amber-700',
                        diet.priority === 'optional' && 'bg-green-100 text-green-700'
                      )}>
                        {diet.priority}
                      </span>
                    </div>
                  </div>
                  {diet.portions && (
                    <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      {diet.portions}
                    </span>
                  )}
                </div>
                <p className="mb-2 text-sm text-slate-900">{diet.recommendation}</p>
                <p className="text-xs text-slate-600">{diet.reason}</p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'predictions' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-100/50 to-purple-100/50 p-3">
              <p className="text-sm font-medium text-indigo-700">
                Predictive health analysis powered by veterinary AI
              </p>
            </div>
            {healthPredictions.map((prediction) => (
              <div
                key={prediction.condition}
                className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-900">{prediction.condition}</h5>
                    <p className="mt-1 text-xs text-slate-600">Timeline: {prediction.timeline}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'inline-block rounded-full px-3 py-1 text-xs font-medium text-white',
                      `bg-gradient-to-r ${getRiskColor(prediction.riskLevel)}`
                    )}>
                      {prediction.riskLevel} risk
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900">{prediction.probability}%</p>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.probability}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn('h-full bg-gradient-to-r', getRiskColor(prediction.riskLevel))}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3">
                  <p className="mb-2 text-xs font-medium text-indigo-700">Prevention Tips:</p>
                  <ul className="space-y-1">
                    {prediction.preventionTips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-xs text-slate-600">
                        <Shield className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* AI Accuracy Badge */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-purple-200/30 bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-slate-700">AI Model Accuracy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-purple-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '92%' }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>
          <span className="text-sm font-bold text-purple-600">92%</span>
        </div>
      </div>
    </div>
  );
}