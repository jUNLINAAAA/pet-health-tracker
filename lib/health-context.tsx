"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { type UnifiedHealthScore } from './unified-health-system';
import { type PetHealthData } from '@/lib/pets/health-data';
import { PetService, AlertService, AppointmentService, HealthRecordService } from '@/lib/services';
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

// Health record type for sparklines
export interface HealthRecord {
  id: string;
  petId: string;
  type: string;
  value: number;
  unit?: string;
  notes?: string;
  recordedAt: string;
  createdAt?: string;
}

interface HealthContextType {
  pets: Pet[];
  alerts: Alert[];
  appointments: Appointment[];
  healthRecords: HealthRecord[];
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
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
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
    const startTime = Date.now();
    try {
      // Get supabase client and verify session exists before loading
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        console.warn('HealthContext loadData: No Supabase client');
        setLoading(false);
        return;
      }

      // Verify session is still valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.warn('HealthContext loadData: No session, skipping data load');
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      console.log('HealthContext loadData: Starting with userId =', userId);

      // Load pets from service layer
      const basePets = await resolvePets();
      console.log('HealthContext loadData: Got', basePets.length, 'pets');

      // CRITICAL FIX: Query alerts/appointments/health_records directly with known userId
      // This avoids race conditions with service layer's separate session checks
      const [alertsResult, appointmentsResult, healthRecordsResult] = await Promise.all([
        supabase
          .from('alerts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: true }),
        supabase
          .from('health_records')
          .select('*')
          .eq('user_id', userId)
          .order('recorded_at', { ascending: false }),
      ]);

      // Map results, handling any errors
      const allAlerts: Alert[] = (alertsResult.data ?? []).map((row: any) => ({
        id: row.id,
        petId: row.pet_id,
        type: row.type,
        severity: row.severity,
        message: row.message,
        recommendation: row.recommendation,
        resolved: row.resolved ?? false,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
      }));

      const allAppointments: Appointment[] = (appointmentsResult.data ?? []).map((row: any) => ({
        id: row.id,
        petId: row.pet_id,
        title: row.title,
        date: row.date,
        time: row.time,
        status: (row.status ?? 'scheduled').toLowerCase() as Appointment['status'],
        location: row.location,
        veterinarian: row.veterinarian,
        notes: row.notes,
        completed: row.completed ?? row.status === 'completed',
        createdAt: row.created_at,
      }));

      const allHealthRecords = (healthRecordsResult.data ?? []).map((row: any) => ({
        id: row.id,
        petId: row.pet_id,
        type: row.type,
        value: typeof row.value === 'string' ? parseFloat(row.value) : row.value,
        unit: row.unit,
        notes: row.notes,
        recordedAt: row.recorded_at,
        createdAt: row.created_at,
      }));

      if (alertsResult.error) console.error('HealthContext: Alerts query error:', alertsResult.error);
      if (appointmentsResult.error) console.error('HealthContext: Appointments query error:', appointmentsResult.error);
      if (healthRecordsResult.error) console.error('HealthContext: Health records query error:', healthRecordsResult.error);

      console.log(`HealthContext: Loaded ${basePets.length} pets, ${allAlerts.length} alerts, ${allAppointments.length} appointments in ${Date.now() - startTime}ms`);

      if (basePets.length === 0) {
        setPets([]);
        setAlerts([]);
        setAppointments([]);
        setPetScores(new Map());
        setPetDetails(new Map());
        return;
      }

      // Group data by petId for fast lookup
      const alertsByPet = new Map<string, Alert[]>();
      const appointmentsByPet = new Map<string, Appointment[]>();
      const recordsByPet = new Map<string, any[]>();

      allAlerts.forEach((a: any) => {
        const petId = a.petId || a.pet_id;
        if (!alertsByPet.has(petId)) alertsByPet.set(petId, []);
        alertsByPet.get(petId)!.push(a);
      });

      allAppointments.forEach((a: any) => {
        const petId = a.petId || a.pet_id;
        if (!appointmentsByPet.has(petId)) appointmentsByPet.set(petId, []);
        appointmentsByPet.get(petId)!.push(a);
      });

      allHealthRecords.forEach((r: any) => {
        const petId = r.petId || r.pet_id;
        if (!recordsByPet.has(petId)) recordsByPet.set(petId, []);
        recordsByPet.get(petId)!.push(r);
      });

      // Fetch health scores in parallel for all pets
      const scorePromises = basePets.map(async (pet) => {
        try {
          const response = await fetch(`/api/health-score?petId=${pet.id}`);
          if (response.ok) {
            const score = await response.json();
            return { petId: pet.id, score };
          }
        } catch (e) {
          console.warn('Failed to fetch health score for', pet.id);
        }
        return { petId: pet.id, score: createFallbackScore() };
      });

      const scoreResults = await Promise.all(scorePromises);
      const scoresMap = new Map(scoreResults.map(r => [r.petId, r.score]));

      // Build final data structures
      const scoreMap = new Map<string, UnifiedHealthScore>();
      const detailMap = new Map<string, PetHealthData>();

      basePets.forEach((pet) => {
        const petAlerts = alertsByPet.get(pet.id) || [];
        const petAppointments = appointmentsByPet.get(pet.id) || [];
        const petRecords = recordsByPet.get(pet.id) || [];
        const healthScore = scoresMap.get(pet.id) || createFallbackScore();

        scoreMap.set(pet.id, healthScore);
        detailMap.set(pet.id, {
          pet,
          alerts: petAlerts,
          appointments: petAppointments,
          healthRecords: petRecords,
          healthScore,
        } as PetHealthData);
      });

      console.log(`HealthContext: Data ready in ${Date.now() - startTime}ms`);

      setPets(basePets);
      setAlerts(allAlerts as Alert[]);
      setAppointments(allAppointments as Appointment[]);
      setHealthRecords(allHealthRecords as HealthRecord[]);
      setPetScores(scoreMap);
      setPetDetails(detailMap);
    } catch (error) {
      console.error('❌ HealthContext: Error loading data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscriptions and auth state listener
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.log('HealthContext: No Supabase client, loading data directly');
      loadData();
      return;
    }

    let hasLoadedData = false;

    // Try to get session immediately and load data
    // This handles the case where session is available but INITIAL_SESSION hasn't fired yet
    const tryLoadData = async () => {
      if (hasLoadedData) return;
      const { data: { session } } = await supabase.auth.getSession();
      console.log('HealthContext: Checking session...', session ? 'found' : 'none');
      if (session) {
        hasLoadedData = true;
        console.log('HealthContext: Session found, loading data');
        loadData();
      }
    };

    // Try immediately
    tryLoadData();

    // Also listen for auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('HealthContext: Auth event:', event, session ? 'with session' : 'no session');
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          if (!hasLoadedData) {
            hasLoadedData = true;
            console.log('HealthContext: Loading data from auth event');
            loadData();
          }
        } else if (event === 'SIGNED_OUT') {
          hasLoadedData = false;
          setPets([]);
          setAlerts([]);
          setAppointments([]);
          setPetScores(new Map());
          setPetDetails(new Map());
        }
      }
    );

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
            setAlerts(prev => {
              // Deduplicate to avoid double inserts from retries
              const withoutExisting = prev.filter(a => a.id !== newAlert.id);
              return [newAlert, ...withoutExisting];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAlert = transformAlert(payload.new);
            // Keep resolved alerts in list so dashboard can count them
            setAlerts(prev => {
              const exists = prev.some(a => a.id === updatedAlert.id);
              if (!exists) {
                return [updatedAlert, ...prev];
              }
              return prev.map(a => a.id === updatedAlert.id ? updatedAlert : a);
            });
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
      authSubscription.unsubscribe();
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
      healthRecords,
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
