/**
 * PRODUCTION PET SERVICE
 *
 * This service uses Supabase for real data with proper authentication.
 * All operations require an authenticated user.
 * Automatically generates health alerts when pets are created/updated.
 */

import type { Pet, PetCreateInput, PetUpdateInput } from '../types';
import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';
import { generateComprehensiveAlerts, Pet as HealthPet, HealthRecord as UnifiedHealthRecord } from '@/lib/unified-health-system';

const PETS_TABLE = 'pets';

function mapPet(row: any): Pet {
  // Parse weight and age as numbers - Supabase returns numeric columns as strings
  const parseNumber = (val: any): number | undefined => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  };

  return {
    id: row.id,
    name: row.name ?? '',
    species: row.species ?? '',
    breed: row.breed ?? undefined,
    age: parseNumber(row.age),
    weight: parseNumber(row.weight),
    image: row.image ?? row.image_url ?? undefined,
    userId: row.user_id ?? row.userId ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? undefined,
  };
}

function requireClient(strict = true) {
  // Prefer service role on the server (API routes / middleware), browser client otherwise
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

/**
 * Generate and save health alerts for a pet
 * Uses rule-based algorithm (no AI API calls) for accuracy and speed
 * Analyzes ALL health metrics: weight, activity, appetite, temperature, heart rate, clinical summaries
 */
async function generateAndSaveAlerts(pet: Pet, userId: string): Promise<number> {
  const supabase = requireClient(false);
  if (!supabase) return 0;

  // Fetch recent health records (last 30 days) for comprehensive analysis
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: allHealthRecords } = await supabase
    .from('health_records')
    .select('*')
    .eq('pet_id', pet.id)
    .gte('recorded_at', thirtyDaysAgo.toISOString())
    .order('recorded_at', { ascending: false });

  // Transform to unified health record format
  const healthRecords: UnifiedHealthRecord[] = (allHealthRecords ?? []).map(r => ({
    id: r.id,
    petId: r.pet_id,
    type: r.type,
    value: typeof r.value === 'string' ? parseFloat(r.value) : r.value,
    unit: r.unit,
    notes: r.notes,
    recordedAt: r.recorded_at,
    createdAt: r.created_at,
  }));

  // Calculate activity minutes for the week (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activityMinutesThisWeek = healthRecords
    .filter(r => r.type === 'activity' && new Date(r.recordedAt) >= sevenDaysAgo)
    .reduce((sum, r) => sum + (isNaN(r.value) ? 0 : r.value), 0);

  // Find last vaccination date
  const lastVaccination = healthRecords.find(r => r.type === 'vaccination');
  const lastVaccinationDate = lastVaccination ? new Date(lastVaccination.recordedAt) : undefined;

  // Convert to health system Pet type
  const healthPet: HealthPet = {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    age: pet.age,
    weight: pet.weight,
  };

  // Generate comprehensive alerts using ALL health data
  // Analyzes: weight, activity, appetite, temperature, heart rate, vaccinations, clinical summaries
  const alerts = generateComprehensiveAlerts({
    pet: healthPet,
    healthRecords,
    activityMinutesThisWeek: activityMinutesThisWeek > 0 ? activityMinutesThisWeek : undefined,
    lastVaccinationDate,
  });

  if (alerts.length === 0) {
    console.log(`No health alerts for ${pet.name}`);
    return 0;
  }

  // Clear existing unresolved alerts of these types to avoid duplicates
  const alertTypes = alerts.map(a => a.type);
  await supabase
    .from('alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('pet_id', pet.id)
    .eq('user_id', userId)
    .eq('resolved', false)
    .in('type', alertTypes);

  // Insert new alerts
  let created = 0;
  for (const alert of alerts) {
    const { error } = await supabase.from('alerts').insert({
      pet_id: pet.id,
      user_id: userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      recommendation: alert.recommendation,
      resolved: false,
    });

    if (!error) {
      created++;
      console.log(`Alert created for ${pet.name}: ${alert.type} (${alert.severity})`);
    } else {
      console.error('Failed to create alert:', error);
    }
  }

  return created;
}

export async function getPets(): Promise<Pet[]> {
  const supabase = requireClient(false);
  if (!supabase) return [];

  // Use getSession() instead of getUser() - faster, reads from local storage
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user?.id) {
    console.warn('getPets: No authenticated session');
    return [];
  }

  const { data, error } = await supabase
    .from(PETS_TABLE)
    .select('*')
    .eq('user_id', sessionData.session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase getPets error', error);
    throw error;
  }

  return (data ?? []).map(mapPet);
}

export async function getPet(id: string): Promise<Pet | null> {
  const supabase = requireClient(false);
  if (!supabase) return null;

  // Use getSession() instead of getUser() - faster, reads from local storage
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user?.id) {
    console.warn('getPet: No authenticated session');
    return null;
  }

  const { data, error } = await supabase
    .from(PETS_TABLE)
    .select('*')
    .eq('id', id)
    .eq('user_id', sessionData.session.user.id)
    .maybeSingle();

  if (error) {
    // PGRST116 means "no rows found" - return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Supabase getPet error', error);
    throw error;
  }

  return data ? mapPet(data) : null;
}

export async function createPet(data: PetCreateInput): Promise<Pet> {
  const supabase = requireClient();
  const userId = await requireUserId();
  const payload = {
    name: data.name,
    species: data.species,
    breed: data.breed,
    age: data.age,
    weight: data.weight,
    image: data.image,
    user_id: userId,
  };

  const { data: newPet, error } = await supabase
    .from(PETS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase createPet error', error);
    throw error;
  }

  const pet = mapPet(newPet);

  // Auto-create initial health records when pet has weight
  // This ensures the dashboard has data to display immediately
  try {
    const now = new Date().toISOString();
    const healthRecords: any[] = [];

    // Create initial weight record if weight is provided
    if (pet.weight && pet.weight > 0) {
      healthRecords.push({
        pet_id: pet.id,
        user_id: userId,
        type: 'weight',
        value: pet.weight,
        unit: 'kg',
        notes: 'Initial weight recorded at pet registration',
        recorded_at: now,
        created_at: now,
      });
    }

    // Create initial activity estimate (baseline 30 min/day for new pets)
    healthRecords.push({
      pet_id: pet.id,
      user_id: userId,
      type: 'activity',
      value: 30,
      unit: 'minutes',
      notes: 'Initial activity estimate',
      recorded_at: now,
      created_at: now,
    });

    if (healthRecords.length > 0) {
      const { error: hrError } = await supabase
        .from('health_records')
        .insert(healthRecords);

      if (hrError) {
        console.warn('Failed to create initial health records:', hrError);
      } else {
        console.log(`Created ${healthRecords.length} initial health records for ${pet.name}`);
      }
    }
  } catch (hrErr) {
    console.error('Error creating initial health records:', hrErr);
    // Don't fail pet creation if health record creation fails
  }

  // Automatically generate health alerts based on pet data
  try {
    const alertsCreated = await generateAndSaveAlerts(pet, userId);
    console.log(`Pet ${pet.name} created with ${alertsCreated} health alerts`);
  } catch (alertError) {
    console.error('Failed to generate alerts:', alertError);
    // Don't fail pet creation if alert generation fails
  }

  return pet;
}

export async function updatePet(id: string, data: PetUpdateInput): Promise<Pet> {
  const supabase = requireClient();
  const userId = await requireUserId();
  const { data: updatedPet, error } = await supabase
    .from(PETS_TABLE)
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updatePet error', error);
    throw error;
  }

  const pet = mapPet(updatedPet);

  // Regenerate health alerts when pet data changes (especially age/weight)
  if (data.age !== undefined || data.weight !== undefined) {
    try {
      const alertsCreated = await generateAndSaveAlerts(pet, userId);
      console.log(`Pet ${pet.name} updated with ${alertsCreated} health alerts regenerated`);
    } catch (alertError) {
      console.error('Failed to regenerate alerts:', alertError);
    }
  }

  return pet;
}

export async function deletePet(id: string): Promise<void> {
  const supabase = requireClient();
  const userId = await requireUserId();
  const { error } = await supabase.from(PETS_TABLE).delete().eq('id', id).eq('user_id', userId);

  if (error) {
    console.error('Supabase deletePet error', error);
    throw error;
  }
}
