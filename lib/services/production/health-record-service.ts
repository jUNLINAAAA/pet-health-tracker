/**
 * PRODUCTION HEALTH RECORD SERVICE (Supabase)
 *
 * This is the production implementation. Keep it free of demo logic.
 */

import type { HealthRecord, HealthRecordCreateInput } from '../types';
import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

const HEALTH_RECORDS_TABLE = 'health_records';

function mapHealthRecord(row: any): HealthRecord {
  // Parse value as number - Supabase returns numeric columns as strings
  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  };

  return {
    id: row.id,
    petId: row.pet_id ?? row.petId,
    type: row.type,
    value: parseNumber(row.value),
    unit: row.unit,
    notes: row.notes ?? undefined,
    recordedAt: row.recorded_at ?? row.recordedAt,
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
  const supabase = requireClient()!;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Unable to resolve Supabase user; ensure auth session exists.');
  }
  return data.user.id;
}

export async function getHealthRecords(petId?: string): Promise<HealthRecord[]> {
  const supabase = requireClient(false);
  if (!supabase) return [];
  const query = supabase.from(HEALTH_RECORDS_TABLE).select('*').order('recorded_at', { ascending: false });

  if (petId) {
    query.eq('pet_id', petId);
  }

  const userId = typeof window !== 'undefined' ? (await supabase.auth.getUser()).data.user?.id : null;
  if (userId) {
    query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase getHealthRecords error', error);
    throw error;
  }

  return (data ?? []).map(mapHealthRecord);
}

export async function createHealthRecord(data: HealthRecordCreateInput): Promise<HealthRecord> {
  const supabase = requireClient()!;
  const userId = await requireUserId();
  const payload = {
    pet_id: data.petId,
    type: data.type,
    value: data.value,
    unit: data.unit,
    notes: data.notes,
    recorded_at: data.recordedAt || new Date().toISOString(),
    user_id: userId,
  };

  const { data: newRecord, error } = await supabase
    .from(HEALTH_RECORDS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase createHealthRecord error', error);
    throw error;
  }

  return mapHealthRecord(newRecord);
}

export async function updateHealthRecord(id: string, data: Partial<HealthRecordCreateInput>): Promise<HealthRecord> {
  const supabase = requireClient()!;
  const userId = await requireUserId();

  const payload: any = {};
  if (data.type !== undefined) payload.type = data.type;
  if (data.value !== undefined) payload.value = data.value;
  if (data.unit !== undefined) payload.unit = data.unit;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.recordedAt !== undefined) payload.recorded_at = data.recordedAt;

  const { data: updated, error } = await supabase
    .from(HEALTH_RECORDS_TABLE)
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateHealthRecord error', error);
    throw error;
  }

  return mapHealthRecord(updated);
}

export async function deleteHealthRecord(id: string): Promise<void> {
  const supabase = requireClient()!;
  const userId = await requireUserId();
  const { error } = await supabase.from(HEALTH_RECORDS_TABLE).delete().eq('id', id).eq('user_id', userId);

  if (error) {
    console.error('Supabase deleteHealthRecord error', error);
    throw error;
  }
}

/**
 * Create health record with service role (for API/AI usage)
 * This bypasses auth and uses user_id directly
 */
export async function createHealthRecordForUser(userId: string, data: HealthRecordCreateInput): Promise<HealthRecord> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('Service role client not available');
  }

  const payload = {
    pet_id: data.petId,
    type: data.type,
    value: data.value,
    unit: data.unit,
    notes: data.notes,
    recorded_at: data.recordedAt || new Date().toISOString(),
    user_id: userId,
  };

  const { data: newRecord, error } = await supabase
    .from(HEALTH_RECORDS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase createHealthRecordForUser error', error);
    throw error;
  }

  return mapHealthRecord(newRecord);
}
