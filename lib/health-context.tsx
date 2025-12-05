"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { type UnifiedHealthScore } from './unified-health-system';
import { loadPetHealthData, type PetHealthData } from '@/lib/pets/health-data';
import { PetService } from '@/lib/services';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// Pet type
export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  image?: string;
  userId?: string;
  createdAt?: string;
}

// Simplified Alert type
export interface Alert {
  id: string;
  petId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation?: string;
  status?: string;
  resolved?: boolean;
  resolvedAt?: string;
  createdAt: string;
}

// Simplified Appointment type
export interface Appointment {
  id: string;
  petId: string;
  title: string;
  date: string;
  time?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  location?: string;
  veterinarian?: string;
  notes?: string;
  completed?: boolean;
  createdAt?: string;
}

interface HealthContextType {
  pets: Pet[];
  alerts: Alert[];
  appointments: Appointment[];
  petScores: Map<string, UnifiedHealthScore>;
  petDetails: Map<string, PetHealthData>;
  loading: boolean;
  isConnected: boolean;
  reload: () => Promise<void>;
  updateAlert: (alert: Alert) => void;
  removeAlert: (alertId: string) => void;
}

const HealthContext = createContext<HealthContextType | null>(null);

/**
 * Create a fallback health score when API is unavailable.
 * This is only used when the API fails - production should always use API.
 */
function createFallbackScore(): UnifiedHealthScore {
  return {
    overall: 75,
    components: {
      weight: 75,
      activity: 70,
      vitals: 80,
      medical: 70,
      alerts: 100,
      aiInsights: 80,
      age: 85,
    },
    confidence: 0.3,
    status: 'fair',
    severityLevel: 'normal',
    insights: ['Score calculated with limited data - please refresh'],
    algorithm: 'fallback',
    computed_at: new Date().toISOString(),
  } as UnifiedHealthScore;
}

async function resolvePets(): Promise<Pet[]> {
  // Use service layer - automatically routes to demo or production
  return await PetService.getPets();
}

// Transform database alert to frontend format
function transformAlert(dbAlert: any): Alert {
  return {
    id: dbAlert.id,
    petId: dbAlert.pet_id,
    type: dbAlert.type,
    severity: dbAlert.severity,
    message: dbAlert.message,
    recommendation: dbAlert.recommendation,
    resolved: dbAlert.resolved,
    resolvedAt: dbAlert.resolved_at,
    createdAt: dbAlert.created_at,
  };
}

export function HealthProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [petScores, setPetScores] = useState<Map<string, UnifiedHealthScore>>(new Map());
  const [petDetails, setPetDetails] = useState<Map<string, PetHealthData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Update a single alert (for realtime updates)
  const updateAlert = useCallback((updatedAlert: Alert) => {
    setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
  }, []);

  // Remove an alert (for realtime updates when resolved)
  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const basePets = await resolvePets();

      if (basePets.length === 0) {
        setPets([]);
        setAlerts([]);
        setAppointments([]);
        setPetScores(new Map());
        setPetDetails(new Map());
        return;
      }

      const hydrated = await Promise.all(
        basePets.map(async (pet) => {
          try {
            const data = await loadPetHealthData(pet.id);
            if (data) return data;

            // Fallback: create minimal health data for the pet
            console.warn('Creating fallback health data for pet', pet.id);
            const fallbackScore = createFallbackScore();
            return {
              pet,
              alerts: [],
              appointments: [],
              healthRecords: [],
              healthScore: fallbackScore,
            } as PetHealthData;
          } catch (error) {
            console.error('Failed to load health data for pet', pet.id, error);
            // Even on error, return fallback data so the pet shows up
            const fallbackScore = createFallbackScore();
            return {
              pet,
              alerts: [],
              appointments: [],
              healthRecords: [],
              healthScore: fallbackScore,
            } as PetHealthData;
          }
        })
      );

      const validData = hydrated.filter((item): item is PetHealthData => item !== null);

      if (validData.length === 0) {
        // Even if all health data failed, still show the base pets
        console.warn('All health data loading failed, using base pets');
        const scoreMap = new Map<string, UnifiedHealthScore>();
        const detailMap = new Map<string, PetHealthData>();

        basePets.forEach((pet) => {
          const fallbackScore = createFallbackScore();
          scoreMap.set(pet.id, fallbackScore);
          detailMap.set(pet.id, {
            pet,
            alerts: [],
            appointments: [],
            healthRecords: [],
            healthScore: fallbackScore,
          } as PetHealthData);
        });

        setPets(basePets);
        setAlerts([]);
        setAppointments([]);
        setPetScores(scoreMap);
        setPetDetails(detailMap);
        return;
      }

      const scoreMap = new Map<string, UnifiedHealthScore>();
      const detailMap = new Map<string, PetHealthData>();
      const mergedAlerts: Alert[] = [];
      const mergedAppointments: Appointment[] = [];

      validData.forEach((entry) => {
        scoreMap.set(entry.pet.id, entry.healthScore);
        detailMap.set(entry.pet.id, entry);
        mergedAlerts.push(...entry.alerts);
        mergedAppointments.push(...entry.appointments);
      });

      setPets(validData.map((entry) => entry.pet));
      setAlerts(mergedAlerts);
      setAppointments(mergedAppointments);
      setPetScores(scoreMap);
      setPetDetails(detailMap);
    } catch (error) {
      console.error('❌ HealthContext: Error loading data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      loadData();
      return;
    }

    // Initial data load
    loadData();

    // Subscribe to alerts changes for realtime updates
    const alertsChannel = supabase
      .channel('alerts_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('Realtime alert update:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newAlert = transformAlert(payload.new);
            setAlerts(prev => [newAlert, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedAlert = transformAlert(payload.new);
            if (updatedAlert.resolved) {
              // Remove resolved alerts from the list
              setAlerts(prev => prev.filter(a => a.id !== updatedAlert.id));
            } else {
              setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
            }
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to appointments changes
    const appointmentsChannel = supabase
      .channel('appointments_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('Realtime appointment update:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newAppt: Appointment = {
              id: payload.new.id,
              petId: payload.new.pet_id,
              title: payload.new.title,
              date: payload.new.date,
              time: payload.new.time,
              status: payload.new.status,
              location: payload.new.location,
              veterinarian: payload.new.veterinarian,
              notes: payload.new.notes,
              completed: payload.new.completed,
              createdAt: payload.new.created_at,
            };
            setAppointments(prev => [newAppt, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedAppt: Appointment = {
              id: payload.new.id,
              petId: payload.new.pet_id,
              title: payload.new.title,
              date: payload.new.date,
              time: payload.new.time,
              status: payload.new.status,
              location: payload.new.location,
              veterinarian: payload.new.veterinarian,
              notes: payload.new.notes,
              completed: payload.new.completed,
              createdAt: payload.new.created_at,
            };
            setAppointments(prev => prev.map(a => a.id === updatedAppt.id ? updatedAppt : a));
          } else if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to health_scores changes
    const scoresChannel = supabase
      .channel('health_scores_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_scores',
        },
        (payload) => {
          console.log('Realtime health score update:', payload.eventType);
          // Trigger a reload to recalculate scores
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // For now, just reload - could be optimized to update specific pet score
            loadData();
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(scoresChannel);
    };
  }, [loadData]);

  return (
    <HealthContext.Provider value={{
      pets,
      alerts,
      appointments,
      petScores,
      petDetails,
      loading,
      isConnected,
      reload: loadData,
      updateAlert,
      removeAlert,
    }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within HealthProvider');
  }
  return context;
}

export function usePetScore(petId: string): UnifiedHealthScore | null {
  const { petScores } = useHealth();
  return petScores.get(petId) || null;
}

export function usePetHealthData(petId: string): PetHealthData | null {
  const { petDetails } = useHealth();
  return petDetails.get(petId) || null;
}
