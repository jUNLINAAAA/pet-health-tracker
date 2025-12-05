import { PetService, AlertService, AppointmentService, HealthRecordService } from '@/lib/services';
import { type UnifiedHealthScore } from '@/lib/unified-health-system';

// Type definitions matching health-context
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
  activityMinutes?: number;
}

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

export interface HealthRecord {
  id: string;
  petId: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  recordedAt: string;
  createdAt: string;
}

export interface PetHealthData {
  pet: Pet;
  alerts: Alert[];
  appointments: Appointment[];
  healthRecords: HealthRecord[];
  healthScore: UnifiedHealthScore;
}

/**
 * Fetch health score from API (calls Edge Function or Python backend)
 * This ensures consistent scoring using the V4 algorithm from the server.
 */
async function fetchHealthScoreFromAPI(petId: string): Promise<UnifiedHealthScore | null> {
  try {
    const response = await fetch(`/api/health-score?petId=${petId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Health score API returned non-OK status:', response.status);
      return null;
    }

    const result = await response.json();
    return result as UnifiedHealthScore;
  } catch (error) {
    console.error('Error fetching health score from API:', error);
    return null;
  }
}

/**
 * Load pet health context using the unified health scoring system.
 * Guarantees consistent data for dashboard, pet detail, and health pages.
 * Uses API to get scores from Edge Function (single source of truth).
 */
export async function loadPetHealthData(petId: string): Promise<PetHealthData | null> {
  if (!petId) return null;

  // Use production service layer
  const pet = await PetService.getPet(petId);

  if (!pet) {
    return null;
  }

  // Use service layer for all data fetching
  const alerts = await AlertService.getAlerts(pet.id);
  const appointments = await AppointmentService.getAppointments(pet.id);
  const healthRecords = await HealthRecordService.getHealthRecords(pet.id);

  // Fetch health score from API (Edge Function or Python backend)
  // This ensures V4 algorithm is used consistently
  let healthScore = await fetchHealthScoreFromAPI(pet.id);

  // Fallback: Create default score if API fails
  if (!healthScore) {
    console.warn('Using fallback health score for pet', pet.id);
    healthScore = {
      overall: 75,
      components: {
        weight: 75,
        activity: 70,
        vitals: 80,
        medical: 70,
        alerts: alerts.length === 0 ? 100 : Math.max(0, 100 - alerts.length * 25),
        aiInsights: 80,
        age: 85,
      },
      confidence: 0.5,
      status: 'fair',
      severityLevel: 'normal',
      insights: ['Score calculated with limited data'],
      algorithm: 'fallback',
      computed_at: new Date().toISOString(),
    } as UnifiedHealthScore;
  }

  return {
    pet,
    alerts,
    appointments,
    healthRecords,
    healthScore,
  };
}
