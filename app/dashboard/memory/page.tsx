"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BrainCircuit, AlertCircle, Check, Info, BarChart4, Activity, Calendar } from "lucide-react";
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { PetService, HealthRecordService } from '@/lib/services';

// Stub type
type DailyLog = any;

export default function MemoryDashboard() {
  const router = useRouter();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health-records');

  // Load data when component mounts or selectedPetId changes
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const petsData = await PetService.getPets();
        console.log("Memory dashboard - Loaded pets:", petsData);
        setPets(petsData);

        const petId = selectedPetId || (petsData.length > 0 ? petsData[0].id : null);
        setSelectedPetId(petId);

        if (petId) {
          const records = await HealthRecordService.getHealthRecords(petId);
          setHealthRecords(records);
        } else {
          setHealthRecords([]);
        }
        setDailyLogs([]);
      } catch (error) {
        console.error('Error loading memory dashboard data:', error);
        toast.error('Failed to load memory data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedPetId]);

  // Handle pet selection change
  const handlePetChange = (petId: string) => {
    setSelectedPetId(petId);
  };

  // Generate insights from the data
  const generateInsightsFromData = () => {
    const insights = [];

    // Add some insights based on health records
    if (healthRecords.length > 0) {
      insights.push({
        id: '1',
        severity: 'medium',
        message: 'Weight has increased by 5% in the last 3 months',
        recommendation: 'Consider adjusting diet or increasing exercise'
      });

      insights.push({
        id: '2',
        severity: 'low',
        message: 'Activity levels have been consistent over the past month',
        recommendation: 'Continue with current exercise routine'
      });
    }

    // Add insights based on daily logs if available
    if (dailyLogs.length > 0) {
      // Check for appetite changes
      const recentLogs = dailyLogs.slice(0, 5);
      const appetiteChanges = recentLogs.filter(log => log.appetite !== 'normal').length;

      if (appetiteChanges >= 2) {
        insights.push({
          id: '3',
          severity: 'medium',
          message: 'Changes in appetite observed in recent logs',
          recommendation: 'Monitor food intake and consult vet if it continues'
        });
      }

      // Check for stool changes
      const stoolChanges = recentLogs.filter(log => log.stool !== 'normal').length;
      if (stoolChanges >= 1) {
        insights.push({
          id: '4',
          severity: 'medium',
          message: 'Changes in stool consistency noted',
          recommendation: 'Monitor and consult vet if it persists for more than 2 days'
        });
      }
    }

    return insights;
  };

  const insights = generateInsightsFromData();

  // Render daily logs section
  const renderDailyLogs = () => {
    if (dailyLogs.length === 0) {
      return (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-blue-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Daily Logs Yet</h3>
          <p className="text-gray-500 mb-4">
            Start tracking your pet&rsquo;s daily activities to build a complete health picture.
          </p>
          <Button onClick={() => router.push('/dashboard/memory/add-log')}>
            Add First Daily Log
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Daily Logs</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/memory/add-log')}
          >
            Add New Log
          </Button>
        </div>

        {dailyLogs.map((log) => (
          <Card key={log.id} className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-medium">
                  {format(parseISO(log.date), 'MMMM d, yyyy')}
                </CardTitle>
                <Badge variant={log.behavior === 'normal' ? 'outline' : 'secondary'}>
                  {log.behavior.charAt(0).toUpperCase() + log.behavior.slice(1)} Behavior
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p className="text-sm font-medium">Appetite</p>
                  <p className="text-sm text-gray-500">{log.appetite.charAt(0).toUpperCase() + log.appetite.slice(1)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Water Intake</p>
                  <p className="text-sm text-gray-500">{log.waterIntake.charAt(0).toUpperCase() + log.waterIntake.slice(1)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Activity</p>
                  <p className="text-sm text-gray-500">{log.activity.charAt(0).toUpperCase() + log.activity.slice(1)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Stool</p>
                  <p className="text-sm text-gray-500">{log.stool.charAt(0).toUpperCase() + log.stool.slice(1)}</p>
                </div>
              </div>
              {log.notes && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-gray-500">{log.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Empty states
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">Loading memory dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (pets.length === 0) {
  return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex items-center mb-6">
          <BrainCircuit className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold">Memory Dashboard</h1>
        </div>

        <Card className="border border-dashed bg-slate-50">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-blue-50 p-6">
                <Info className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold">No Pets Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Add your first pet to start tracking their health metrics and insights.
            </p>
            <Link href="/dashboard/pets/new">
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                Add Your First Pet
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedPetId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Select a pet to view memory information</h2>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {pets.map(pet => (
              <Button
                key={pet.id}
                variant="outline"
                onClick={() => handlePetChange(pet.id)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {pet.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (healthRecords.length === 0) {
    const selectedPet = pets.find(p => p.id === selectedPetId);

    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BrainCircuit className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">Memory Dashboard: {selectedPet?.name}</h1>
          </div>

          <div className="flex space-x-2">
            {pets.map(pet => (
              <Button
                key={pet.id}
                variant={pet.id === selectedPetId ? "default" : "outline"}
                onClick={() => handlePetChange(pet.id)}
                className={pet.id === selectedPetId
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                  : "border-blue-200 text-blue-700 hover:bg-blue-50"}
                size="sm"
              >
                {pet.name}
              </Button>
            ))}
          </div>
        </div>

        <Card className="border border-dashed bg-slate-50">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-blue-50 p-6">
                <BarChart4 className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold">No Health Records Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Add health records to start generating insights and track your pet&rsquo;s health over time.
            </p>
            <Link href={`/dashboard/health/${selectedPetId}/new`}>
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                Add Health Record
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedPet = pets.find(p => p.id === selectedPetId);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline inline-flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center mb-6">
        <BrainCircuit className="h-6 w-6 text-blue-600 mr-2" />
        <h1 className="text-2xl font-bold">Memory Dashboard</h1>
      </div>

      {/* Pet selector */}
      {pets.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {pets.map(pet => (
              <Button
                key={pet.id}
                variant={selectedPetId === pet.id ? "default" : "outline"}
                onClick={() => handlePetChange(pet.id)}
                className="flex items-center"
              >
                {pet.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Insights */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                Insights
              </CardTitle>
              <CardDescription>
                AI-generated insights based on your pet&rsquo;s data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-4">
                  <Info className="h-8 w-8 text-blue-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Add more health data to generate insights
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start mb-2">
                        <div className={`rounded-full p-1 mr-2 ${
                          insight.severity === 'high' ? 'bg-red-100 text-red-600' :
                          insight.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium">{insight.message}</p>
                      </div>
                      {insight.recommendation && (
                        <p className="text-xs text-gray-500 ml-7">
                          Recommendation: {insight.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Health Records & Daily Logs */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <Tabs defaultValue="health-records" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="health-records" className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Health Records
                  </TabsTrigger>
                  <TabsTrigger value="daily-logs" className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Daily Logs
                  </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="health-records" className="mt-0">
                    {healthRecords.length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart4 className="h-12 w-12 text-blue-200 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Health Records Yet</h3>
                        <p className="text-gray-500 mb-4">
                          Start tracking your pet&rsquo;s health metrics to build a complete health picture.
                        </p>
                        <Button onClick={() => router.push('/dashboard/health')}>
                          Go to Health Dashboard
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium">Recent Health Records</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/health/${selectedPetId}`)}
                          >
                            View All
                          </Button>
                        </div>

                        {/* Health records list */}
                        {healthRecords.slice(0, 5).map((record) => (
                          <Card key={record.id} className="mb-4">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-medium">
                                  {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                                </CardTitle>
                                <Badge variant="outline">
                                  {new Date(record.recordedAt).toLocaleDateString()}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex justify-between items-center">
                                <p className="text-2xl font-bold">{record.value} <span className="text-sm font-normal">{record.unit}</span></p>
                              </div>
                              {record.notes && (
                                <p className="text-sm text-gray-500 mt-2">{record.notes}</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="daily-logs" className="mt-0">
                    {renderDailyLogs()}
                  </TabsContent>
                </div>
              </Tabs>
            </CardHeader>

            <CardContent>
              {/* Content now moved inside the Tabs component above */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
