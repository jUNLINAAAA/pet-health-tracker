"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, Check, Filter, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { AlertService, PetService } from '@/lib/services';
import type { Alert as ServiceAlert, Pet as ServicePet } from '@/lib/services/types';

type Alert = ServiceAlert & {
  recommendation?: string;
  status?: 'active' | 'resolved';
  resolvedAt?: string;
  userId?: string;
};

type Pet = ServicePet & { breed?: string };

// Helper function to check if an alert is resolved
const isAlertResolved = (alert: Alert): boolean => {
  // Check both status and resolved fields for compatibility
  return alert.status === 'resolved' || alert.resolved === true;
};

const alertInsights = (alert: Alert, pet?: Pet) => {
  const items: { title: string; detail: string }[] = [];

  items.push({
    title: 'Severity',
    detail: alert.severity === 'high'
      ? 'Critical threshold breached—monitor closely or call your vet.'
      : alert.severity === 'medium'
        ? 'Moderate issue detected—address soon.'
        : 'Minor signal—keep an eye on it.',
  });

  if (pet?.species) {
    items.push({
      title: 'Species context',
      detail: `${pet.species}${pet.breed ? ` (${pet.breed})` : ''} ranges drive this alert.`,
    });
  }

  if (alert.type) {
    items.push({
      title: 'Trigger',
      detail: `Raised for ${alert.type.replace(/_/g, ' ')} based on your saved records.`,
    });
  }

  if (alert.recommendation) {
    items.push({
      title: 'Next step',
      detail: alert.recommendation,
    });
  }

  return items;
};

export default function AlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const alertId = searchParams?.get('id');
  
  // State
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingAlert, setResolvingAlert] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'resolved'>('all');
  
  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [petsData, alertsData] = await Promise.all([
          PetService.getPets(),
          AlertService.getAlerts(),
        ]);

        setPets(petsData);
        setAlerts(alertsData);

        if (alertId) {
          const initial = alertsData.find((alert) => alert.id === alertId);
          if (initial) {
            setSelectedAlert(initial);
          }
        }
      } catch (error) {
        console.error('Error loading alerts data:', error);
        toast.error('Failed to load alerts');
      } finally {
      setLoading(false);
      }
    }
    
    loadData();
  }, [alertId]);
  
  // Add a refreshAlerts function to reload alerts from all sources
  const refreshAlerts = async () => {
    console.log("Refreshing alerts in Alerts page");
    try {
      const refreshedAlerts = await AlertService.getAlerts();
      
      if (Array.isArray(refreshedAlerts)) {
        setAlerts(refreshedAlerts);
        
        // Update selected alert if it exists in the refreshed data
        if (selectedAlert) {
          const updatedSelectedAlert = refreshedAlerts.find(a => a.id === selectedAlert.id);
          if (updatedSelectedAlert) {
            setSelectedAlert(updatedSelectedAlert);
          }
        }
      } else {
        console.error("getAlerts did not return an array:", refreshedAlerts);
      }
      
    } catch (error) {
      console.error("Error refreshing alerts:", error);
    }
  };
  
  // Handle resolving an alert
  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlert(alertId);

    // Helper function to find alert by ID
    const findAlertById = (id: string) => alerts.find(a => a.id === id);
    const alertToResolve = findAlertById(alertId);

    if (!alertToResolve) {
      console.error("Cannot resolve alert: Alert not found in current state", alertId);
      toast.error('Alert not found');
      setResolvingAlert(null);
      return;
    }

    console.log("Starting alert resolution for:", alertToResolve);

    try {
      // Remove the alert from the list immediately for instant feedback
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));

      // Clear selected alert if it was the one being resolved
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }

      await AlertService.resolveAlert(alertId);
      toast.success('Alert resolved successfully');
    } catch (error) {
      console.error('Error resolving alert:', error);
      // On error, restore the alert to the list
      setAlerts(prevAlerts => [...prevAlerts, alertToResolve]);
      toast.error('Error saving to database: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setResolvingAlert(null);
    }
  };
  
  // Get the pet for an alert
  const getPetForAlert = (alert: Alert) => {
    return pets.find(pet => pet.id === alert.petId);
  };
  
  // Filter alerts based on activeFilter
  const filteredAlerts = alerts.filter(alert => {
    if (activeFilter === 'active') return !isAlertResolved(alert);
    if (activeFilter === 'resolved') return isAlertResolved(alert);
    return true; // 'all'
  });
  
  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">Loading alerts...</p>
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 mr-1.5 sm:mr-2" />
          <h1 className="text-xl sm:text-2xl font-bold">Health Alerts</h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className={`text-xs sm:text-sm ${activeFilter === 'all'
              ? "bg-gradient-to-r from-blue-500 to-indigo-600"
              : "border-blue-200 text-blue-700 hover:bg-blue-50"}`}
          >
            All Alerts
          </Button>
          <Button
            variant={activeFilter === 'active' ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter('active')}
            className={`text-xs sm:text-sm ${activeFilter === 'active'
              ? "bg-gradient-to-r from-blue-500 to-indigo-600"
              : "border-blue-200 text-blue-700 hover:bg-blue-50"}`}
          >
            Active
          </Button>
          <Button
            variant={activeFilter === 'resolved' ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter('resolved')}
            className={`text-xs sm:text-sm ${activeFilter === 'resolved'
              ? "bg-gradient-to-r from-blue-500 to-indigo-600"
              : "border-blue-200 text-blue-700 hover:bg-blue-50"}`}
          >
            Resolved
          </Button>
        </div>
      </div>

      {selectedAlert ? (
        // Detailed view of a single alert
        <div className="space-y-6">
          <Card className={`shadow-sm ${
            selectedAlert.severity === 'high' ? 'border-l-4 border-l-red-500' :
            selectedAlert.severity === 'medium' ? 'border-l-4 border-l-amber-500' :
            'border-l-4 border-l-blue-500'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className={`h-5 w-5 mr-2 ${
                    selectedAlert.severity === 'high' ? 'text-red-500' :
                    selectedAlert.severity === 'medium' ? 'text-amber-500' :
                    'text-blue-500'
                  }`} />
                  <CardTitle>{selectedAlert.message}</CardTitle>
                </div>
                <Badge variant={
                  selectedAlert.severity === 'high' ? 'destructive' :
                  selectedAlert.severity === 'medium' ? 'default' :
                  'outline'
                }>
                  {selectedAlert.severity.charAt(0).toUpperCase() + selectedAlert.severity.slice(1)}
                </Badge>
              </div>
              <CardDescription>
                Alert for {getPetForAlert(selectedAlert)?.name || 'Unknown Pet'} • 
                {isAlertResolved(selectedAlert) ? ' Resolved' : ' Active'} • 
                Created on {new Date(selectedAlert.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Recommendation</h3>
                  <p className="text-sm">{selectedAlert.recommendation || 'No specific recommendation provided.'}</p>
            </div>
                
                  <div>
                    <h3 className="text-sm font-medium mb-1">Pet Information</h3>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm font-medium">{getPetForAlert(selectedAlert)?.name || 'Unknown Pet'}</p>
                      <p className="text-xs text-muted-foreground">
                        {getPetForAlert(selectedAlert)?.species || 'Unknown Species'}
                        {getPetForAlert(selectedAlert)?.breed ? ` • ${getPetForAlert(selectedAlert)?.breed}` : ''}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-1">Quick insights</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {alertInsights(selectedAlert, getPetForAlert(selectedAlert)).map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-100 bg-white/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.title}</p>
                          <p className="text-sm text-slate-700 mt-1 leading-snug">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                
                {isAlertResolved(selectedAlert) && selectedAlert.resolvedAt && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Resolution</h3>
                    <div className="bg-green-50 p-3 rounded-lg flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <p className="text-sm text-green-700">
                        Resolved on {new Date(selectedAlert.resolvedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedAlert(null)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Back to All Alerts
              </Button>
              
              {!isAlertResolved(selectedAlert) && (
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  onClick={() => handleResolveAlert(selectedAlert.id)}
                  disabled={resolvingAlert === selectedAlert.id}
                >
                  {resolvingAlert === selectedAlert.id ? 'Resolving...' : 'Mark as Resolved'}
                </Button>
              )}
            </CardFooter>
        </Card>
      </div>
      ) : (
        // List of all alerts
        <div className="space-y-6">
          {filteredAlerts.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-green-100 p-6">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold">No Alerts Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  {activeFilter === 'active' 
                    ? "Great! You don&rsquo;t have any active health alerts." 
                    : activeFilter === 'resolved'
                      ? "You haven&rsquo;t resolved any alerts yet."
                      : "No health alerts were found."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAlerts.map(alert => {
                const pet = getPetForAlert(alert);
                
                return (
                  <Card 
                    key={alert.id} 
                    className={`shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                      isAlertResolved(alert) ? 'opacity-75' : ''
                    } ${
                      alert.severity === 'high' ? 'border-l-4 border-l-red-500' :
                      alert.severity === 'medium' ? 'border-l-4 border-l-amber-500' :
                      'border-l-4 border-l-blue-500'
                    }`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            alert.severity === 'high' ? 'bg-red-100' :
                            alert.severity === 'medium' ? 'bg-amber-100' :
                            'bg-blue-100'
                          }`}>
                            {isAlertResolved(alert) ? (
                              <Check className={`h-5 w-5 ${
                                alert.severity === 'high' ? 'text-red-500' :
                                alert.severity === 'medium' ? 'text-amber-500' :
                                'text-blue-500'
                              }`} />
                            ) : (
                              <AlertCircle className={`h-5 w-5 ${
                                alert.severity === 'high' ? 'text-red-500' :
                                alert.severity === 'medium' ? 'text-amber-500' :
                                'text-blue-500'
                              }`} />
                            )}
              </div>
            </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <h3 className="font-medium">{pet?.name || 'Unknown Pet'}</h3>
                              <Badge variant={
                                alert.severity === 'high' ? 'destructive' :
                                alert.severity === 'medium' ? 'default' :
                                'outline'
                              } className="ml-2">
                                {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                              </Badge>
                              {isAlertResolved(alert) && (
                                <Badge variant="outline" className="ml-2">
                                  Resolved
                                </Badge>
                              )}
          </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleDateString()}
                            </p>
      </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                          {!isAlertResolved(alert) && (
                            <div className="mt-3 flex justify-end">
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();  // Prevent the card click event
                                  handleResolveAlert(alert.id);
                                }}
                                disabled={resolvingAlert === alert.id}
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                              >
                                {resolvingAlert === alert.id ? 'Resolving...' : 'Resolve'}
                              </Button>
                </div>
                          )}
                  </div>
                </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </div>
      )}
    </div>
  );
}
