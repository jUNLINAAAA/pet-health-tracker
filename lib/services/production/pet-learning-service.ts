/**
 * PET LEARNING SERVICE
 *
 * Stores and manages learned patterns about pets from AI conversations.
 * This enables the AI to build knowledge about each pet over time.
 */

import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

export type LearningDataType =
  | 'behavior_pattern'
  | 'dietary_preference'
  | 'health_tendency'
  | 'activity_pattern'
  | 'symptom_history'
  | 'medication_response'
  | 'seasonal_pattern'
  | 'social_behavior'
  | 'anxiety_trigger';

export type LearningSource = 'ai_conversation' | 'user_input' | 'health_record' | 'inference';

export interface PetLearning {
  id: string;
  petId: string;
  dataType: LearningDataType;
  key: string;
  value: string;
  confidence: number;
  source: LearningSource;
  sourceId?: string;
  occurrenceCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  expiresAt?: string;
  isVerified: boolean;
}

export interface LearningContext {
  behaviors: PetLearning[];
  dietary: PetLearning[];
  health: PetLearning[];
  activity: PetLearning[];
  symptoms: PetLearning[];
  medications: PetLearning[];
  seasonal: PetLearning[];
  social: PetLearning[];
  anxiety: PetLearning[];
}

function requireClient(strict = true) {
  const supabase =
    typeof window === 'undefined'
      ? getSupabaseServiceRoleClient()
      : getSupabaseBrowserClient();

  if (!supabase && strict) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function requireUserId() {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

function mapFromDB(row: any): PetLearning {
  return {
    id: row.id,
    petId: row.pet_id,
    dataType: row.data_type,
    key: row.key,
    value: row.value,
    confidence: parseFloat(row.confidence),
    source: row.source,
    sourceId: row.source_id,
    occurrenceCount: row.occurrence_count,
    firstObservedAt: row.first_observed_at,
    lastObservedAt: row.last_observed_at,
    expiresAt: row.expires_at,
    isVerified: row.is_verified,
  };
}

export class PetLearningService {
  /**
   * Get all learned data for a pet
   */
  static async getLearningData(petId: string): Promise<PetLearning[]> {
    const supabase = requireClient(false);
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('pet_learning_data')
        .select('*')
        .eq('pet_id', petId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('confidence', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapFromDB);

    } catch (error) {
      console.error('Error fetching learning data:', error);
      return [];
    }
  }

  /**
   * Get learning data organized by category for AI context
   */
  static async getLearningContext(petId: string): Promise<LearningContext> {
    const allData = await this.getLearningData(petId);

    return {
      behaviors: allData.filter(d => d.dataType === 'behavior_pattern'),
      dietary: allData.filter(d => d.dataType === 'dietary_preference'),
      health: allData.filter(d => d.dataType === 'health_tendency'),
      activity: allData.filter(d => d.dataType === 'activity_pattern'),
      symptoms: allData.filter(d => d.dataType === 'symptom_history'),
      medications: allData.filter(d => d.dataType === 'medication_response'),
      seasonal: allData.filter(d => d.dataType === 'seasonal_pattern'),
      social: allData.filter(d => d.dataType === 'social_behavior'),
      anxiety: allData.filter(d => d.dataType === 'anxiety_trigger'),
    };
  }

  /**
   * Get high-confidence learnings for summary
   */
  static async getHighConfidenceLearnings(petId: string, minConfidence: number = 0.7): Promise<PetLearning[]> {
    const supabase = requireClient(false);
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('pet_learning_data')
        .select('*')
        .eq('pet_id', petId)
        .gte('confidence', minConfidence)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('confidence', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map(mapFromDB);

    } catch (error) {
      console.error('Error fetching high confidence learnings:', error);
      return [];
    }
  }

  /**
   * Record or update a learned pattern
   */
  static async recordLearning(data: {
    petId: string;
    dataType: LearningDataType;
    key: string;
    value: string;
    confidence?: number;
    source: LearningSource;
    sourceId?: string;
    expiresInDays?: number;
  }): Promise<PetLearning | null> {
    const supabase = requireClient();
    if (!supabase) return null;

    try {
      const userId = await requireUserId();

      // Calculate expiry if specified
      let expiresAt: string | null = null;
      if (data.expiresInDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + data.expiresInDays);
        expiresAt = expiry.toISOString();
      }

      // Try to upsert (update if exists, insert if not)
      const { data: existing } = await supabase
        .from('pet_learning_data')
        .select('id, confidence, occurrence_count')
        .eq('pet_id', data.petId)
        .eq('data_type', data.dataType)
        .eq('key', data.key)
        .single();

      if (existing) {
        // Update existing - increase confidence based on repetition
        const newConfidence = Math.min(
          0.99,
          existing.confidence + (1 - existing.confidence) * 0.1
        );

        const { data: updated, error } = await supabase
          .from('pet_learning_data')
          .update({
            value: data.value,
            confidence: data.confidence ?? newConfidence,
            source: data.source,
            source_id: data.sourceId,
            expires_at: expiresAt,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return mapFromDB(updated);

      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from('pet_learning_data')
          .insert({
            pet_id: data.petId,
            user_id: userId,
            data_type: data.dataType,
            key: data.key,
            value: data.value,
            confidence: data.confidence ?? 0.5,
            source: data.source,
            source_id: data.sourceId,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (error) throw error;
        return mapFromDB(inserted);
      }

    } catch (error) {
      console.error('Error recording learning:', error);
      return null;
    }
  }

  /**
   * Batch record multiple learnings from a conversation
   */
  static async recordLearningsFromConversation(
    petId: string,
    conversationId: string,
    learnings: Array<{
      dataType: LearningDataType;
      key: string;
      value: string;
      confidence?: number;
    }>
  ): Promise<number> {
    let recorded = 0;

    for (const learning of learnings) {
      const result = await this.recordLearning({
        petId,
        dataType: learning.dataType,
        key: learning.key,
        value: learning.value,
        confidence: learning.confidence,
        source: 'ai_conversation',
        sourceId: conversationId,
      });

      if (result) recorded++;
    }

    return recorded;
  }

  /**
   * Verify a learning (user confirms it's accurate)
   */
  static async verifyLearning(learningId: string): Promise<boolean> {
    const supabase = requireClient();
    if (!supabase) return false;

    try {
      const userId = await requireUserId();

      const { error } = await supabase
        .from('pet_learning_data')
        .update({
          is_verified: true,
          confidence: 0.95, // High confidence after user verification
        })
        .eq('id', learningId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error verifying learning:', error);
      return false;
    }
  }

  /**
   * Delete a learning (user indicates it's wrong)
   */
  static async deleteLearning(learningId: string): Promise<boolean> {
    const supabase = requireClient();
    if (!supabase) return false;

    try {
      const userId = await requireUserId();

      const { error } = await supabase
        .from('pet_learning_data')
        .delete()
        .eq('id', learningId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error deleting learning:', error);
      return false;
    }
  }

  /**
   * Get learning summary for AI context (formatted as text)
   */
  static async getLearningContextText(petId: string): Promise<string> {
    const context = await this.getLearningContext(petId);
    const parts: string[] = [];

    if (context.behaviors.length > 0) {
      parts.push('BEHAVIOR PATTERNS:');
      context.behaviors.slice(0, 5).forEach(b => {
        parts.push(`- ${b.key}: ${b.value} (confidence: ${Math.round(b.confidence * 100)}%)`);
      });
    }

    if (context.dietary.length > 0) {
      parts.push('\nDIETARY PREFERENCES:');
      context.dietary.slice(0, 5).forEach(d => {
        parts.push(`- ${d.key}: ${d.value} (confidence: ${Math.round(d.confidence * 100)}%)`);
      });
    }

    if (context.health.length > 0) {
      parts.push('\nHEALTH TENDENCIES:');
      context.health.slice(0, 5).forEach(h => {
        parts.push(`- ${h.key}: ${h.value} (confidence: ${Math.round(h.confidence * 100)}%)`);
      });
    }

    if (context.symptoms.length > 0) {
      parts.push('\nSYMPTOM HISTORY:');
      context.symptoms.slice(0, 5).forEach(s => {
        parts.push(`- ${s.key}: ${s.value} (confidence: ${Math.round(s.confidence * 100)}%)`);
      });
    }

    if (context.medications.length > 0) {
      parts.push('\nMEDICATION RESPONSES:');
      context.medications.slice(0, 5).forEach(m => {
        parts.push(`- ${m.key}: ${m.value} (confidence: ${Math.round(m.confidence * 100)}%)`);
      });
    }

    if (context.activity.length > 0) {
      parts.push('\nACTIVITY PATTERNS:');
      context.activity.slice(0, 5).forEach(a => {
        parts.push(`- ${a.key}: ${a.value} (confidence: ${Math.round(a.confidence * 100)}%)`);
      });
    }

    if (context.anxiety.length > 0) {
      parts.push('\nANXIETY TRIGGERS:');
      context.anxiety.slice(0, 5).forEach(a => {
        parts.push(`- ${a.key}: ${a.value} (confidence: ${Math.round(a.confidence * 100)}%)`);
      });
    }

    if (context.social.length > 0) {
      parts.push('\nSOCIAL BEHAVIORS:');
      context.social.slice(0, 5).forEach(s => {
        parts.push(`- ${s.key}: ${s.value} (confidence: ${Math.round(s.confidence * 100)}%)`);
      });
    }

    return parts.length > 0
      ? parts.join('\n')
      : 'No learned patterns yet for this pet.';
  }

  /**
   * Extract learnings from AI conversation text
   * Returns structured data that can be recorded
   */
  static extractLearningsFromText(text: string, petName: string): Array<{
    dataType: LearningDataType;
    key: string;
    value: string;
    confidence: number;
  }> {
    const learnings: Array<{
      dataType: LearningDataType;
      key: string;
      value: string;
      confidence: number;
    }> = [];

    const lowerText = text.toLowerCase();

    // Dietary patterns
    const dietaryPatterns = [
      { pattern: /allergic to (\w+)/gi, key: 'food_allergy', confidence: 0.8 },
      { pattern: /loves? eating (\w+)/gi, key: 'favorite_food', confidence: 0.7 },
      { pattern: /won't eat (\w+)/gi, key: 'food_aversion', confidence: 0.7 },
      { pattern: /sensitive to (\w+)/gi, key: 'food_sensitivity', confidence: 0.75 },
    ];

    dietaryPatterns.forEach(({ pattern, key, confidence }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        learnings.push({
          dataType: 'dietary_preference',
          key,
          value: match[1],
          confidence,
        });
      }
    });

    // Behavior patterns
    const behaviorPatterns = [
      { pattern: /afraid of (\w+)/gi, key: 'fear', confidence: 0.75 },
      { pattern: /scared of (\w+)/gi, key: 'fear', confidence: 0.75 },
      { pattern: /loves? (\w+ing)/gi, key: 'favorite_activity', confidence: 0.65 },
      { pattern: /hates? (\w+)/gi, key: 'dislikes', confidence: 0.7 },
      { pattern: /gets anxious (when|around|during) (.+?)(?:\.|,|$)/gi, key: 'anxiety_trigger', confidence: 0.8 },
    ];

    behaviorPatterns.forEach(({ pattern, key, confidence }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[2] || match[1];
        learnings.push({
          dataType: key === 'anxiety_trigger' ? 'anxiety_trigger' : 'behavior_pattern',
          key,
          value,
          confidence,
        });
      }
    });

    // Health tendencies
    const healthPatterns = [
      { pattern: /prone to (\w+)/gi, key: 'health_tendency', confidence: 0.7 },
      { pattern: /history of (\w+)/gi, key: 'medical_history', confidence: 0.85 },
      { pattern: /had (\w+) surgery/gi, key: 'surgery_history', confidence: 0.9 },
      { pattern: /taking (\w+) medication/gi, key: 'current_medication', confidence: 0.85 },
    ];

    healthPatterns.forEach(({ pattern, key, confidence }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        learnings.push({
          dataType: 'health_tendency',
          key,
          value: match[1],
          confidence,
        });
      }
    });

    // Activity patterns
    const activityPatterns = [
      { pattern: /walks? (\d+) times? (?:a|per) day/gi, key: 'walks_per_day', confidence: 0.85 },
      { pattern: /exercises? (\d+) (?:minutes?|hours?)/gi, key: 'exercise_duration', confidence: 0.8 },
      { pattern: /sleeps? (\d+) hours?/gi, key: 'sleep_hours', confidence: 0.75 },
    ];

    activityPatterns.forEach(({ pattern, key, confidence }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        learnings.push({
          dataType: 'activity_pattern',
          key,
          value: match[1],
          confidence,
        });
      }
    });

    return learnings;
  }
}
