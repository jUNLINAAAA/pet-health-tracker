/**
 * PRODUCTION APPOINTMENT SERVICE (Supabase)
 *
 * This is the production implementation for appointments. Keep it free of demo logic.
 */

import type { Appointment, AppointmentCreateInput, AppointmentUpdateInput } from '../types';
import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

const APPOINTMENTS_TABLE = 'appointments';

function mapAppointment(row: any): Appointment {
  return {
    id: row.id,
    petId: row.pet_id ?? row.petId,
    title: row.title,
    date: row.date,
    time: row.time ?? undefined,
    status: (row.status ?? 'scheduled').toLowerCase() as Appointment['status'],
    location: row.location ?? undefined,
    veterinarian: row.veterinarian ?? undefined,
    notes: row.notes ?? undefined,
    completed: row.completed ?? row.status === 'completed' ?? false,
    createdAt: row.created_at ?? row.createdAt ?? undefined,
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

export async function getAppointments(petId?: string): Promise<Appointment[]> {
  const supabase = requireClient(false);
  if (!supabase) return [];

  let query = supabase
    .from(APPOINTMENTS_TABLE)
    .select('*')
    .order('date', { ascending: true });

  if (petId) {
    query = query.eq('pet_id', petId);
  }

  const userId = typeof window !== 'undefined' ? (await supabase.auth.getUser()).data.user?.id : null;
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase getAppointments error', error);
    throw error;
  }

  return (data ?? []).map(mapAppointment);
}

export async function createAppointment(data: AppointmentCreateInput): Promise<Appointment> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  const payload = {
    pet_id: data.petId,
    user_id: userId,
    title: data.title,
    date: data.date,
    time: data.time,
    location: data.location,
    veterinarian: data.veterinarian,
    notes: data.notes,
    status: 'scheduled',
    completed: false,
  };

  const { data: newAppointment, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase createAppointment error', error);
    throw error;
  }

  return mapAppointment(newAppointment);
}

export async function updateAppointment(id: string, data: AppointmentUpdateInput): Promise<Appointment> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  // Map camelCase to snake_case for database
  const payload: Record<string, any> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.date !== undefined) payload.date = data.date;
  if (data.time !== undefined) payload.time = data.time;
  if (data.location !== undefined) payload.location = data.location;
  if (data.veterinarian !== undefined) payload.veterinarian = data.veterinarian;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.completed !== undefined) {
    payload.completed = data.completed;
    payload.status = data.completed ? 'completed' : 'scheduled';
  }

  const { data: updatedAppointment, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateAppointment error', error);
    throw error;
  }

  return mapAppointment(updatedAppointment);
}

export async function completeAppointment(id: string): Promise<void> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  const { error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .update({
      completed: true,
      status: 'completed'
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase completeAppointment error', error);
    throw error;
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const userId = await requireUserId();

  const { error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase deleteAppointment error', error);
    throw error;
  }
}
