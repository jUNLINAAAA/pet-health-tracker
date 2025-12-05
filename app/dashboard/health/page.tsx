"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Heart, Plus, Thermometer, Weight, ArrowLeft, Calendar, Syringe, TrendingUp, TrendingDown, AlertCircle, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { useHealth } from '@/lib/health-context';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { getScoreColor } from '@/lib/unified-health-system';
import { Surface } from '@/components/ui/Surface';
import { cn } from '@/lib/utils';

export default function HealthDashboardPage() {
  const router = useRouter();
  const { pets, alerts, petScores, petDetails, loading } = useHealth();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Set first pet as selected if not set
  const activePetId = selectedPetId || (pets.length > 0 ? pets[0].id : null);
  const activePet = pets.find(p => p.id === activePetId);
  const activeScore = activePetId ? petScores.get(activePetId) : null;
  const activePetData = activePetId ? petDetails.get(activePetId) : null;

  // Get health records for active pet from petDetails
  const petHealthRecords = useMemo(() => {
    if (!activePetData) return [];
    return activePetData.healthRecords || [];
  }, [activePetData]);

  // Get alerts for active pet
  const petAlerts = useMemo(() => {
    if (!activePetId) return [];
    return alerts.filter(a => a.petId === activePetId && !a.resolved);
  }, [alerts, activePetId]);

  // Calculate health metrics from records and pet data
  const healthMetrics = useMemo(() => {
    if (!activePet) return [];

    const weightRecord = petHealthRecords.find(r => r.type === 'weight');
    const activityRecord = petHealthRecords.find(r => r.type === 'activity');

    // Get weight and activity scores (they're just numbers, not objects)
    const weightScore = activeScore?.components?.weight ?? 0;
    const activityScore = activeScore?.components?.activity ?? 0;

    // Get trend info from activeScore.trends
    const weightTrend = activeScore?.trends?.weight?.direction ?? "stable";
    const activityTrend = activeScore?.trends?.activity?.direction ?? "stable";

    return [
      {
        title: "Weight",
        value: activePet.weight ? `${activePet.weight} kg` : "Not recorded",
        change: weightTrend,
        trend: weightTrend === "up" ? "up" : weightTrend === "down" ? "down" : "stable",
        icon: Weight,
        score: weightScore,
        status: weightScore >= 80 ? "excellent" : weightScore >= 60 ? "good" : weightScore >= 40 ? "fair" : "needs attention",
        date: weightRecord ? `Updated ${formatDistanceToNow(new Date(weightRecord.recordedAt), { addSuffix: true })}` : "No records",
      },
      {
        title: "Activity",
        value: activityRecord ? `${activityRecord.value} ${activityRecord.unit}` : "Not tracked",
        change: activityTrend,
        trend: activityTrend === "up" ? "up" : activityTrend === "down" ? "down" : "stable",
        icon: Activity,
        score: activityScore,
        status: activityScore >= 80 ? "excellent" : activityScore >= 60 ? "good" : activityScore >= 40 ? "fair" : "needs attention",
        date: activityRecord ? `Updated ${formatDistanceToNow(new Date(activityRecord.recordedAt), { addSuffix: true })}` : "Track daily activity",
      },
      {
        title: "Health Score",
        value: activeScore ? `${activeScore.overall}/100` : "Calculating...",
        change: "Based on all factors",
        trend: "stable",
        icon: Heart,
        score: activeScore?.overall || 0,
        status: (activeScore?.overall ?? 0) >= 80 ? "excellent" : (activeScore?.overall ?? 0) >= 60 ? "good" : (activeScore?.overall ?? 0) >= 40 ? "fair" : "needs attention",
        date: "Updated now",
      },
      {
        title: "Alerts",
        value: petAlerts.length > 0 ? `${petAlerts.length} active` : "All clear",
        change: petAlerts.length > 0 ? "Needs attention" : "No issues",
        trend: petAlerts.length > 0 ? "warning" : "good",
        icon: AlertCircle,
        score: petAlerts.length === 0 ? 100 : Math.max(0, 100 - petAlerts.length * 20),
        status: petAlerts.length === 0 ? "excellent" : petAlerts.length <= 2 ? "fair" : "needs attention",
        date: petAlerts.length > 0 ? "Review recommended" : "Keep monitoring",
      },
    ];
  }, [activePet, activeScore, petHealthRecords, petAlerts]);

  // Get vaccinations from health records
  const vaccinations = useMemo(() => {
    return petHealthRecords
      .filter(r => r.type === 'vaccination')
      .map(r => ({
        id: r.id,
        name: r.notes || 'Vaccination',
        date: format(new Date(r.recordedAt), 'MMMM d, yyyy'),
        status: 'Completed'
      }));
  }, [petHealthRecords]);

  // Get activity records
  const activityRecords = useMemo(() => {
    return petHealthRecords
      .filter(r => r.type === 'activity')
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        date: format(new Date(r.recordedAt), 'MMMM d, yyyy'),
        duration: `${r.value} ${r.unit}`,
        type: r.notes || 'Activity',
        distance: null
      }));
  }, [petHealthRecords]);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-500 mx-auto"
            />
            <p className="mt-4 text-sm text-gray-500">Loading health dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <Link href="/dashboard" className="text-xs sm:text-sm text-blue-600 hover:underline inline-flex items-center">
          <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Health Dashboard</h1>
        <div className="flex gap-2 sm:gap-3">
          <Link href="/dashboard/health/add-record" className="w-full sm:w-auto">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 w-full sm:w-auto text-sm sm:text-base">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Add Health Record
            </Button>
          </Link>
        </div>
      </div>

      {pets.length === 0 ? (
        <Card className="border border-dashed shadow-sm">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-blue-50 p-6">
                <Heart className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold">No Pets Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Add a pet first to start tracking their health metrics
            </p>
            <Link href="/dashboard/pets/new">
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                Add Your First Pet
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pet Selector */}
          {pets.length > 1 && (
            <div className="mb-6">
              <Surface variant="glass" className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="font-medium text-slate-600">Select Pet:</div>
                  <div className="flex flex-wrap gap-3">
                    {pets.map((pet) => {
                      const score = petScores.get(pet.id);
                      return (
                        <button
                          key={pet.id}
                          onClick={() => setSelectedPetId(pet.id)}
                          className={cn(
                            "flex items-center px-4 py-2 rounded-2xl transition-all",
                            activePetId === pet.id
                              ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                              : "bg-white/80 hover:bg-white border border-slate-200 text-slate-700"
                          )}
                        >
                          <div className="relative mr-2 h-8 w-8 overflow-hidden rounded-full bg-slate-100">
                            {pet.image ? (
                              <Image
                                src={pet.image}
                                alt={pet.name}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Heart className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{pet.name}</span>
                          {score && (
                            <span className={cn(
                              "ml-2 text-xs px-2 py-0.5 rounded-full",
                              activePetId === pet.id ? "bg-white/20" : "bg-slate-100"
                            )}>
                              {score.overall}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Surface>
            </div>
          )}

          {/* Health Score Hero */}
          {activePet && activeScore && (
            <Surface variant="glass" className="p-6 mb-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative h-32 w-32 flex-shrink-0">
                  <ProgressRing
                    progress={activeScore.overall}
                    size={128}
                    strokeWidth={8}
                    color={getScoreColor(activeScore.overall)}
                    showPercentage={false}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900">{activeScore.overall}</span>
                    <span className="text-xs uppercase tracking-widest text-slate-400">/100</span>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Overall Health Score</p>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{activePet.name}</h2>
                  <p className="text-slate-600 mb-4">
                    {activeScore.overall >= 80
                      ? "Excellent health! Keep up the great care."
                      : activeScore.overall >= 60
                      ? "Good health with room for improvement."
                      : activeScore.overall >= 40
                      ? "Fair health - consider addressing some concerns."
                      : "Needs attention - please review alerts and recommendations."}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {activeScore.components?.weight !== undefined && (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        activeScore.components.weight >= 80 ? "bg-green-100 text-green-700" :
                        activeScore.components.weight >= 60 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        Weight: {activeScore.components.weight}
                      </span>
                    )}
                    {activeScore.components?.activity !== undefined && (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        activeScore.components.activity >= 80 ? "bg-green-100 text-green-700" :
                        activeScore.components.activity >= 50 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        Activity: {activeScore.components.activity}
                      </span>
                    )}
                    {activeScore.components?.medical !== undefined && (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        activeScore.components.medical >= 80 ? "bg-green-100 text-green-700" :
                        activeScore.components.medical >= 50 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        Medical: {activeScore.components.medical}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => router.push(`/dashboard/pets/${activePet.id}`)}
                  >
                    View Full Profile <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Surface>
          )}

          <Tabs defaultValue="overview" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="vaccinations" className="text-xs sm:text-sm">Vaccinations</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {/* Health Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                {healthMetrics.map((metric, index) => (
                  <motion.div
                    key={metric.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Surface variant="glass" className="p-4 sm:p-5 h-full">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "rounded-2xl p-3 flex-shrink-0",
                          metric.status === "excellent" || metric.status === "optimal" ? "bg-green-100" :
                          metric.status === "good" ? "bg-blue-100" :
                          metric.status === "fair" ? "bg-yellow-100" :
                          "bg-red-100"
                        )}>
                          <metric.icon className={cn(
                            "h-5 w-5",
                            metric.status === "excellent" || metric.status === "optimal" ? "text-green-600" :
                            metric.status === "good" ? "text-blue-600" :
                            metric.status === "fair" ? "text-yellow-600" :
                            "text-red-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">{metric.title}</p>
                          <p className="text-xl font-bold text-slate-900 truncate">{metric.value}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {metric.trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                            {metric.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                            <p className="text-xs text-slate-500">{metric.date}</p>
                          </div>
                        </div>
                      </div>
                    </Surface>
                  </motion.div>
                ))}
              </div>

              {/* Alerts Section */}
              {petAlerts.length > 0 && (
                <Surface variant="glass" className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Active Alerts ({petAlerts.length})
                  </h3>
                  <div className="space-y-3">
                    {petAlerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-4 rounded-xl border-l-4",
                          alert.severity === 'high' ? "bg-red-50 border-red-500" :
                          alert.severity === 'medium' ? "bg-amber-50 border-amber-500" :
                          "bg-blue-50 border-blue-500"
                        )}
                      >
                        <p className="font-medium text-slate-900">{alert.message}</p>
                        <p className="text-sm text-slate-600 mt-1">{alert.recommendation || "Review and address this concern."}</p>
                      </div>
                    ))}
                  </div>
                  {petAlerts.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => router.push('/dashboard/alerts')}
                    >
                      View All Alerts
                    </Button>
                  )}
                </Surface>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Surface variant="glass" className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => router.push(`/dashboard/health/add-record?petId=${activePetId}&type=weight`)}
                    >
                      <Weight className="h-4 w-4 mr-2" /> Log Weight
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => router.push(`/dashboard/health/add-record?petId=${activePetId}&type=activity`)}
                    >
                      <Activity className="h-4 w-4 mr-2" /> Log Activity
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => router.push(`/dashboard/health/add-record?petId=${activePetId}&type=vaccination`)}
                    >
                      <Syringe className="h-4 w-4 mr-2" /> Add Vaccination
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => router.push('/dashboard/appointments/new')}
                    >
                      <Calendar className="h-4 w-4 mr-2" /> Schedule Appointment
                    </Button>
                  </div>
                </Surface>

                <Surface variant="glass" className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Health Tips</h3>
                  <div className="space-y-3">
                    {activeScore?.components?.weight !== undefined && activeScore.components.weight < 70 && (
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Weight:</strong> Consider adjusting portion sizes or consulting your vet about a healthy weight plan.
                        </p>
                      </div>
                    )}
                    {activeScore?.components?.activity !== undefined && activeScore.components.activity < 70 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Activity:</strong> Try adding an extra 15-minute walk or play session daily.
                        </p>
                      </div>
                    )}
                    {activeScore?.components?.medical !== undefined && activeScore.components.medical < 80 && (
                      <div className="p-3 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-indigo-800">
                          <strong>Medical Care:</strong> Check if vaccinations or vet visits are due.
                        </p>
                      </div>
                    )}
                    {activeScore && activeScore.overall >= 80 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Great job!</strong> {activePet?.name} is in excellent health. Keep up the routine!
                        </p>
                      </div>
                    )}
                  </div>
                </Surface>
              </div>
            </TabsContent>

            <TabsContent value="vaccinations" className="space-y-6">
              <Surface variant="glass" className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Vaccination History</h3>
                  <Link href={`/dashboard/health/add-record?petId=${activePetId}&type=vaccination`}>
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vaccination
                    </Button>
                  </Link>
                </div>
                {vaccinations.length > 0 ? (
                  <div className="space-y-3">
                    {vaccinations.map((vax) => (
                      <div key={vax.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Syringe className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{vax.name}</p>
                            <p className="text-sm text-slate-500">{vax.date}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          {vax.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="rounded-full bg-blue-50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Syringe className="h-6 w-6 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-medium mb-2">No Vaccination Records</h4>
                    <p className="text-slate-500 mb-4">Keep track of vaccinations by adding records.</p>
                    <Link href={`/dashboard/health/add-record?petId=${activePetId}&type=vaccination`}>
                      <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Vaccination
                      </Button>
                    </Link>
                  </div>
                )}
              </Surface>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Surface variant="glass" className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Activity History</h3>
                  <Link href={`/dashboard/health/add-record?petId=${activePetId}&type=activity`}>
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </Link>
                </div>
                {activityRecords.length > 0 ? (
                  <div className="space-y-3">
                    {activityRecords.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-white/50 rounded-xl">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Activity className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900">{activity.type}</p>
                            <p className="text-sm text-slate-500">{activity.date}</p>
                          </div>
                          <p className="text-slate-600 mt-1">
                            Duration: <span className="font-medium">{activity.duration}</span>
                            {activity.distance && <span> • Distance: <span className="font-medium">{activity.distance}</span></span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="rounded-full bg-green-50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <h4 className="text-lg font-medium mb-2">No Activity Records</h4>
                    <p className="text-slate-500 mb-4">Track exercise and activity by adding records.</p>
                    <Link href={`/dashboard/health/add-record?petId=${activePetId}&type=activity`}>
                      <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Activity
                      </Button>
                    </Link>
                  </div>
                )}
              </Surface>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
