/**
 * SERVICE FACTORY - PRODUCTION ONLY
 *
 * Components should import from here. All calls go through production services.
 */
import type {
  Pet,
  Alert,
  Appointment,
  HealthRecord,
  PetCreateInput,
  PetUpdateInput,
  AlertCreateInput,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  HealthRecordCreateInput,
} from './types';

import * as ProductionPetService from './production/pet-service';
import * as ProductionHealthRecordService from './production/health-record-service';
import * as ProductionAlertService from './production/alert-service';
import * as ProductionAppointmentService from './production/appointment-service';
import * as ProductionHealthScoreService from './production/health-score-service';
import * as ProductionStorageService from './production/storage-service';
import * as ProductionAssistantService from './production/assistant-service';
import * as ProductionConversationService from './production/conversation-service';
import { AIHealthInsightsService } from './production/ai-health-insights-service';
import { ClinicLocationService } from './production/clinic-location-service';
import { AIScoreVerificationService } from './production/ai-score-verification-service';
import { PetLearningService } from './production/pet-learning-service';

/**
 * PET SERVICE - Production
 */
export const PetService = {
  async getPets(): Promise<Pet[]> {
    return ProductionPetService.getPets();
  },

  async getPet(id: string): Promise<Pet | null> {
    return ProductionPetService.getPet(id);
  },

  async createPet(data: PetCreateInput): Promise<Pet> {
    return ProductionPetService.createPet(data);
  },

  async updatePet(id: string, data: PetUpdateInput): Promise<Pet> {
    return ProductionPetService.updatePet(id, data);
  },

  async deletePet(id: string): Promise<void> {
    return ProductionPetService.deletePet(id);
  },
};

/**
 * ALERT SERVICE - Production
 */
export const AlertService = {
  async getAlerts(petId?: string): Promise<Alert[]> {
    return ProductionAlertService.getAlerts(petId);
  },

  async createAlert(data: AlertCreateInput): Promise<Alert> {
    return ProductionAlertService.createAlert(data);
  },

  async resolveAlert(id: string): Promise<void> {
    return ProductionAlertService.resolveAlert(id);
  },

  async deleteAlert(id: string): Promise<void> {
    return ProductionAlertService.deleteAlert(id);
  },
};

/**
 * APPOINTMENT SERVICE - Production
 */
export const AppointmentService = {
  async getAppointments(petId?: string): Promise<Appointment[]> {
    return ProductionAppointmentService.getAppointments(petId);
  },

  async createAppointment(data: AppointmentCreateInput): Promise<Appointment> {
    return ProductionAppointmentService.createAppointment(data);
  },

  async updateAppointment(id: string, data: AppointmentUpdateInput): Promise<Appointment> {
    return ProductionAppointmentService.updateAppointment(id, data);
  },

  async completeAppointment(id: string): Promise<void> {
    return ProductionAppointmentService.completeAppointment(id);
  },

  async deleteAppointment(id: string): Promise<void> {
    return ProductionAppointmentService.deleteAppointment(id);
  },
};

/**
 * HEALTH RECORD SERVICE - Production
 */
export const HealthRecordService = {
  async getHealthRecords(petId?: string): Promise<HealthRecord[]> {
    return ProductionHealthRecordService.getHealthRecords(petId);
  },

  async createHealthRecord(data: HealthRecordCreateInput): Promise<HealthRecord> {
    return ProductionHealthRecordService.createHealthRecord(data);
  },

  async updateHealthRecord(id: string, data: Partial<HealthRecordCreateInput>): Promise<HealthRecord> {
    return ProductionHealthRecordService.updateHealthRecord(id, data);
  },

  async deleteHealthRecord(id: string): Promise<void> {
    return ProductionHealthRecordService.deleteHealthRecord(id);
  },

  async createHealthRecordForUser(userId: string, data: HealthRecordCreateInput): Promise<HealthRecord> {
    return ProductionHealthRecordService.createHealthRecordForUser(userId, data);
  },
};

/**
 * HEALTH SCORE SERVICE - Production
 * Computes and caches pet health scores using Supabase RPC
 */
export const HealthScoreService = {
  async computeHealthScore(petId: string) {
    return ProductionHealthScoreService.computeHealthScore(petId);
  },

  async getHealthScore(petId: string) {
    return ProductionHealthScoreService.getHealthScore(petId);
  },

  async refreshAllHealthScores() {
    return ProductionHealthScoreService.refreshAllHealthScores();
  },

  async getHealthScoreHistory(petId: string, limit?: number) {
    return ProductionHealthScoreService.getHealthScoreHistory(petId, limit);
  },
};

/**
 * STORAGE SERVICE - Production
 * Handles pet image uploads to Supabase Storage
 */
export const StorageService = {
  async uploadPetImage(file: File, petId: string) {
    return ProductionStorageService.uploadPetImage(file, petId);
  },

  async deletePetImage(path: string) {
    return ProductionStorageService.deletePetImage(path);
  },

  async deleteAllPetImages(petId: string) {
    return ProductionStorageService.deleteAllPetImages(petId);
  },

  async uploadUserAvatar(file: File) {
    return ProductionStorageService.uploadUserAvatar(file);
  },

  async deleteUserAvatars() {
    return ProductionStorageService.deleteUserAvatars();
  },

  async uploadAppointmentAttachment(file: File, appointmentId: string) {
    return ProductionStorageService.uploadAppointmentAttachment(file, appointmentId);
  },

  async deleteAppointmentAttachments(appointmentId: string) {
    return ProductionStorageService.deleteAppointmentAttachments(appointmentId);
  },
};

/**
 * ASSISTANT SERVICE - Production
 * AI-powered pet health assistant
 */
export const AssistantService = {
  async getMessages(petId?: string, limit?: number) {
    return ProductionAssistantService.getMessages(petId, limit);
  },

  async sendMessage(message: string, petId?: string) {
    return ProductionAssistantService.sendMessage(message, petId);
  },

  async clearMessages(petId?: string) {
    return ProductionAssistantService.clearMessages(petId);
  },

  async updatePetEmbeddings(petId: string) {
    return ProductionAssistantService.updatePetEmbeddings(petId);
  },
};

/**
 * AI HEALTH INSIGHTS SERVICE - Production
 * Stores and retrieves AI-derived health insights from conversations
 */
export { AIHealthInsightsService };

/**
 * CLINIC LOCATION SERVICE - Production
 * Find nearby veterinary clinics using OpenStreetMap
 */
export { ClinicLocationService };

/**
 * AI SCORE VERIFICATION SERVICE - Production
 * AI "debate" to verify health score calculations
 */
export { AIScoreVerificationService };

/**
 * PET LEARNING SERVICE - Production
 * Stores and manages learned patterns about pets from AI conversations
 */
export { PetLearningService };

/**
 * CONVERSATION SERVICE - Production
 * Manages multiple chat conversations like a real AI assistant app
 */
export const ConversationService = {
  async getConversations(petId?: string) {
    return ProductionConversationService.getConversations(petId);
  },

  async getConversation(id: string) {
    return ProductionConversationService.getConversation(id);
  },

  async createConversation(title?: string, petId?: string) {
    return ProductionConversationService.createConversation(title, petId);
  },

  async updateConversation(id: string, updates: { title?: string; description?: string; metadata?: Record<string, any> }) {
    return ProductionConversationService.updateConversation(id, updates);
  },

  async archiveConversation(id: string) {
    return ProductionConversationService.archiveConversation(id);
  },

  async deleteConversation(id: string) {
    return ProductionConversationService.deleteConversation(id);
  },

  async getConversationMessages(conversationId: string, limit?: number) {
    return ProductionConversationService.getConversationMessages(conversationId, limit);
  },

  async addMessageToConversation(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    petId?: string,
    metadata?: Record<string, any>
  ) {
    return ProductionConversationService.addMessageToConversation(conversationId, role, content, petId, metadata);
  },

  async clearConversationMessages(conversationId: string) {
    return ProductionConversationService.clearConversationMessages(conversationId);
  },

  async getOrCreateDefaultConversation(petId?: string) {
    return ProductionConversationService.getOrCreateDefaultConversation(petId);
  },

  async searchConversations(query: string) {
    return ProductionConversationService.searchConversations(query);
  },
};

// Re-export types for convenience
export type {
  Pet,
  Alert,
  Appointment,
  HealthRecord,
  PetCreateInput,
  PetUpdateInput,
  AlertCreateInput,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  HealthRecordCreateInput,
} from './types';

export type { AIHealthInsight } from './production/ai-health-insights-service';
export type { ClinicLocation, VetHistory, UserLocation } from './production/clinic-location-service';
export type { ScoreVerificationResult, ScoreComponents } from './production/ai-score-verification-service';
export type { PetLearning, LearningContext, LearningDataType, LearningSource } from './production/pet-learning-service';
export type { Conversation, ConversationMessage } from './production/conversation-service';
