/**
 * PRODUCTION ALERT SERVICE (Supabase)
 *
 * This is the production implementation for alerts. Keep it free of demo logic.
 */

import type { Alert, AlertCreateInput } from '../types';
import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

const ALERTS_TABLE = 'alerts';

function mapAlert(row: any): Alert {
  return {
    id: row.id,
    petId: row.pet_id ?? row.petId,
    type: row.type,
    severity: row.severity,
    message: row.message,
    recommendation: row.recommendation ?? undefined,
    resolved: row.resolved ?? false,
    resolvedAt: row.resolved_at ?? row.resolvedAt ?? undefined,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function requireClient(strict = true) {
  const supabase =
    typeof window === 'undefined'
      ? getSupabaseServiceRoleClient()
      : getSupabaseBrowserClient();

  if (!supabase) {
    if (strict) {
      throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
    console.warn('Supabase not configured; falling back to empty result.');
  }
  return supabase;
}

async function requireUserId() {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Unable to resolve Supabase user; ensure auth session exists.');
  }
  return data.user.id;
}

export async function getAlerts(petId?: string): Promise<Alert[]> {
  const supabase = requireClient(false);
  if (!supabase) return [];

  let query = supabase
    .from(ALERTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (petId) {
    query = query.eq('pet_id', petId);
  }

  const userId = typeof window !== 'undefined' ? (await supabase.auth.getUser()).data.user?.id : null;
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase getAlerts error', error);
    throw error;
  }

  return (data ?? []).map(mapAlert);
}

export async function createAlert(data: AlertCreateInput): Promise<Alert> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  const payload = {
    pet_id: data.petId,
    type: data.type,
    severity: data.severity,
    message: data.message,
    recommendation: data.recommendation,
    user_id: userId,
    resolved: false,
  };

  const { data: newAlert, error } = await supabase
    .from(ALERTS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase createAlert error', error);
    throw error;
  }

  return mapAlert(newAlert);
}

export async function resolveAlert(id: string): Promise<void> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  const { error } = await supabase
    .from(ALERTS_TABLE)
    .update({
      resolved: true,
      resolved_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase resolveAlert error', error);
    throw error;
  }
}

export async function deleteAlert(id: string): Promise<void> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  const { error } = await supabase
    .from(ALERTS_TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase deleteAlert error', error);
    throw error;
  }
}
