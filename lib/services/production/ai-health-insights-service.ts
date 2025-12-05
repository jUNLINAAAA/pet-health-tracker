import { getSupabaseServiceRoleClient } from '@/lib/supabase/client';

export interface AIHealthInsight {
  id: string;
  petId: string;
  userId: string;
  insightType:
    | 'symptom_reported'
    | 'behavior_change'
    | 'diet_concern'
    | 'activity_update'
    | 'weight_update'
    | 'medication_info'
    | 'vet_recommendation'
    | 'health_improvement'
    | 'health_concern';
  message: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  conversationId?: string;
  sourceMessage?: string;
  scoreImpact: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DBInsight {
  id: string;
  pet_id: string;
  user_id: string;
  insight_type: string;
  message: string;
  severity: string;
  confidence: number;
  conversation_id?: string;
  source_message?: string;
  score_impact: number;
  acknowledged: boolean;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

function mapFromDB(db: DBInsight): AIHealthInsight {
  return {
    id: db.id,
    petId: db.pet_id,
    userId: db.user_id,
    insightType: db.insight_type as AIHealthInsight['insightType'],
    message: db.message,
    severity: db.severity as 'low' | 'medium' | 'high',
    confidence: db.confidence,
    conversationId: db.conversation_id,
    sourceMessage: db.source_message,
    scoreImpact: db.score_impact,
    acknowledged: db.acknowledged,
    resolved: db.resolved,
    resolvedAt: db.resolved_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export class AIHealthInsightsService {
  /**
   * Get all health insights for a pet
   */
  static async getInsightsForPet(petId: string): Promise<AIHealthInsight[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('ai_health_insights')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI health insights:', error);
      return [];
    }

    return (data || []).map(mapFromDB);
  }

  /**
   * Get unresolved insights for health score calculation
   */
  static async getUnresolvedInsights(petId: string): Promise<AIHealthInsight[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('ai_health_insights')
      .select('*')
      .eq('pet_id', petId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unresolved insights:', error);
      return [];
    }

    return (data || []).map(mapFromDB);
  }

  /**
   * Get recent insights (last 30 days) for health score calculation
   */
  static async getRecentInsights(petId: string, days: number = 30): Promise<AIHealthInsight[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('ai_health_insights')
      .select('*')
      .eq('pet_id', petId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recent insights:', error);
      return [];
    }

    return (data || []).map(mapFromDB);
  }

  /**
   * Create a new health insight from AI conversation
   */
  static async createInsight(insight: {
    petId: string;
    userId: string;
    insightType: AIHealthInsight['insightType'];
    message: string;
    severity?: 'low' | 'medium' | 'high';
    confidence?: number;
    conversationId?: string;
    sourceMessage?: string;
    scoreImpact?: number;
  }): Promise<AIHealthInsight | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    // Calculate score impact based on type and severity
    let scoreImpact = insight.scoreImpact ?? 0;
    if (scoreImpact === 0) {
      const severity = insight.severity || 'low';
      switch (insight.insightType) {
        case 'symptom_reported':
        case 'health_concern':
          scoreImpact = severity === 'high' ? -15 : severity === 'medium' ? -10 : -5;
          break;
        case 'behavior_change':
        case 'diet_concern':
          scoreImpact = severity === 'high' ? -10 : severity === 'medium' ? -5 : -2;
          break;
        case 'vet_recommendation':
          scoreImpact = -8;
          break;
        case 'health_improvement':
          scoreImpact = severity === 'high' ? 10 : severity === 'medium' ? 5 : 3;
          break;
        case 'activity_update':
        case 'weight_update':
        case 'medication_info':
          scoreImpact = 0; // Neutral - just informational
          break;
      }
    }

    const { data, error } = await supabase
      .from('ai_health_insights')
      .insert({
        pet_id: insight.petId,
        user_id: insight.userId,
        insight_type: insight.insightType,
        message: insight.message,
        severity: insight.severity || 'low',
        confidence: insight.confidence || 0.80,
        conversation_id: insight.conversationId,
        source_message: insight.sourceMessage,
        score_impact: scoreImpact,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating AI health insight:', error);
      return null;
    }

    return mapFromDB(data);
  }

  /**
   * Mark an insight as resolved
   */
  static async resolveInsight(insightId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('ai_health_insights')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', insightId);

    if (error) {
      console.error('Error resolving insight:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark an insight as acknowledged
   */
  static async acknowledgeInsight(insightId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('ai_health_insights')
      .update({ acknowledged: true })
      .eq('id', insightId);

    if (error) {
      console.error('Error acknowledging insight:', error);
      return false;
    }

    return true;
  }

  /**
   * Calculate total score impact from AI insights for a pet
   */
  static async calculateScoreImpact(petId: string): Promise<number> {
    const insights = await this.getUnresolvedInsights(petId);

    // Sum up all score impacts, but cap the total negative impact
    let totalImpact = 0;
    for (const insight of insights) {
      totalImpact += insight.scoreImpact;
    }

    // Cap negative impact at -30 and positive at +15
    return Math.max(-30, Math.min(15, totalImpact));
  }
}
