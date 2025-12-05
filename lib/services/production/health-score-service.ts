/**
 * PRODUCTION HEALTH SCORE SERVICE
 * Interfaces with Supabase RPC functions for health score computation
 */
import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

export interface HealthScoreResult {
  score: number;
  components: {
    weight: number;
    activity: number;
    medical: number;
    alerts: number;
  };
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  insights: string[];
  recommendations: string[];
}

export interface CachedHealthScore {
  score: number;
  components: {
    weight: number;
    activity: number;
    medical: number;
    alerts: number;
  };
  createdAt: string;
}

function requireClient() {
  const supabase =
    typeof window === 'undefined'
      ? getSupabaseServiceRoleClient()
      : getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

/**
 * Compute (or recompute) health score for a pet
 * This calls the database function and caches the result
 */
export async function computeHealthScore(petId: string): Promise<HealthScoreResult> {
  const supabase = requireClient();

  const { data, error } = await supabase.rpc('compute_health_score', {
    p_pet_id: petId,
  });

  if (error) {
    console.error('Error computing health score:', error);
    throw new Error('Failed to compute health score');
  }

  if (!data || data.length === 0) {
    throw new Error('No health score returned');
  }

  const result = data[0];
  return {
    score: result.score,
    components: result.components,
    status: result.status,
    insights: result.insights || [],
    recommendations: result.recommendations || [],
  };
}

/**
 * Get the most recent cached health score for a pet
 */
export async function getHealthScore(petId: string): Promise<CachedHealthScore | null> {
  const supabase = requireClient();

  const { data, error } = await supabase.rpc('get_health_score', {
    p_pet_id: petId,
  });

  if (error) {
    console.error('Error getting health score:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const result = data[0];
  return {
    score: result.score,
    components: result.components,
    createdAt: result.created_at,
  };
}

/**
 * Refresh all health scores for the current user
 */
export async function refreshAllHealthScores(): Promise<number> {
  const supabase = requireClient();

  const { data, error } = await supabase.rpc('refresh_all_health_scores');

  if (error) {
    console.error('Error refreshing health scores:', error);
    throw new Error('Failed to refresh health scores');
  }

  return data ?? 0;
}

/**
 * Get health score history for a pet (last N scores)
 */
export async function getHealthScoreHistory(
  petId: string,
  limit: number = 30
): Promise<CachedHealthScore[]> {
  const supabase = requireClient();

  const { data, error } = await supabase
    .from('health_scores')
    .select('score, components, created_at')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching health score history:', error);
    return [];
  }

  return (data || []).map((row) => ({
    score: row.score,
    components: row.components as CachedHealthScore['components'],
    createdAt: row.created_at,
  }));
}
