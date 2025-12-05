/**
 * SERVICE LAYER TYPE DEFINITIONS
 *
 * These interfaces define the contract that BOTH demo and production services must implement.
 * This ensures we can swap between demo and production without changing ANY component code.
 */

// Import and re-export from health-data for consistency
import type {
  Pet,
  Alert,
  Appointment,
  HealthRecord,
  PetHealthData,
} from '@/lib/pets/health-data';

export type { Pet, Alert, Appointment, HealthRecord, PetHealthData };

/**
 * Pet Service Interface
 * Handles all pet-related data operations
 */
export interface IPetService {
  /**
   * Get all pets for current user
   */
  getPets(): Promise<Pet[]>;

  /**
   * Get a single pet by ID
   */
  getPet(id: string): Promise<Pet | null>;

  /**
   * Create a new pet
   */
  createPet(data: PetCreateInput): Promise<Pet>;

  /**
   * Update an existing pet
   */
  updatePet(id: string, data: PetUpdateInput): Promise<Pet>;

  /**
   * Delete a pet
   */
  deletePet(id: string): Promise<void>;
}

/**
 * Alert Service Interface
 * Handles health alerts and notifications
 */
export interface IAlertService {
  /**
   * Get all alerts, optionally filtered by pet
   */
  getAlerts(petId?: string): Promise<Alert[]>;

  /**
   * Create a new health alert
   */
  createAlert(data: AlertCreateInput): Promise<Alert>;

  /**
   * Mark an alert as resolved
   */
  resolveAlert(id: string): Promise<void>;

  /**
   * Delete an alert
   */
  deleteAlert(id: string): Promise<void>;
}

/**
 * Appointment Service Interface
 * Handles veterinary appointments
 */
export interface IAppointmentService {
  /**
   * Get all appointments, optionally filtered by pet
   */
  getAppointments(petId?: string): Promise<Appointment[]>;

  /**
   * Create a new appointment
   */
  createAppointment(data: AppointmentCreateInput): Promise<Appointment>;

  /**
   * Update an appointment
   */
  updateAppointment(id: string, data: AppointmentUpdateInput): Promise<Appointment>;

  /**
   * Mark an appointment as completed
   */
  completeAppointment(id: string): Promise<void>;

  /**
   * Delete an appointment
   */
  deleteAppointment(id: string): Promise<void>;
}

/**
 * Health Record Service Interface
 * Handles weight, measurements, and other health records
 */
export interface IHealthRecordService {
  /**
   * Get health records for a pet
   */
  getRecords(petId: string): Promise<HealthRecord[]>;

  /**
   * Add a new health record
   */
  addRecord(data: HealthRecordCreateInput): Promise<HealthRecord>;

  /**
   * Delete a health record
   */
  deleteRecord(id: string): Promise<void>;
}

// ============================================================================
// INPUT TYPE DEFINITIONS
// ============================================================================

export interface PetCreateInput {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  image?: string;
}

export interface PetUpdateInput {
  name?: string;
  species?: string;
  breed?: string;
  age?: number;
  weight?: number;
  image?: string;
  activityMinutes?: number;
}

export interface AlertCreateInput {
  petId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation?: string;
}

export interface AppointmentCreateInput {
  petId: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  veterinarian?: string;
  notes?: string;
}

export interface AppointmentUpdateInput {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  veterinarian?: string;
  notes?: string;
  completed?: boolean;
}

export interface HealthRecordCreateInput {
  petId: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  recordedAt?: string;
}

// Note: Pet, Alert, Appointment, HealthRecord are re-exported from @/lib/pets/health-data above
