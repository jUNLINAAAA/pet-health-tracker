import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/client';
import {
  generateHealthAlerts,
  generateComprehensiveAlerts,
  Pet,
  HealthRecord,
  ComprehensiveAlertInput
} from '@/lib/unified-health-system';
import {
  validateHealthRecord,
  isValidUUID,
  sanitizeString,
  VALID_RECORD_TYPES
} from '@/lib/validation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Check if a health record value is abnormal and create an alert if needed
 */
async function checkAndCreateHealthAlerts(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  userId: string,
  petId: string,
  type: string,
  value: number,
  petData?: { species?: string; breed?: string; weight?: number; age?: number }
) {
  if (!supabase) return;

  // Get pet info if not provided
  let pet = petData;
  if (!pet) {
    const { data } = await supabase
      .from('pets')
      .select('species, breed, weight, age')
      .eq('id', petId)
      .single();
    pet = data || {};
  }

  const alerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
  }> = [];

  // Weight alerts
  if (type === 'weight') {
    const species = (pet?.species || '').toLowerCase();

    // Get previous weight for comparison
    const { data: prevRecords } = await supabase
      .from('health_records')
      .select('value, recorded_at')
      .eq('pet_id', petId)
      .eq('type', 'weight')
      .order('recorded_at', { ascending: false })
      .limit(2);

    if (prevRecords && prevRecords.length >= 2) {
      const prevWeight = prevRecords[1].value;
      const weightChange = ((value - prevWeight) / prevWeight) * 100;

      // Significant weight loss (>10%)
      if (weightChange < -10) {
        alerts.push({
          type: 'weight_loss',
          severity: weightChange < -15 ? 'high' : 'medium',
          message: `${pet?.species || 'Pet'} lost ${Math.abs(weightChange).toFixed(1)}% body weight`,
          recommendation: 'Significant weight loss detected. Consider scheduling a vet checkup to rule out health issues.',
        });
      }
      // Significant weight gain (>15%)
      else if (weightChange > 15) {
        alerts.push({
          type: 'weight_gain',
          severity: weightChange > 20 ? 'high' : 'medium',
          message: `${pet?.species || 'Pet'} gained ${weightChange.toFixed(1)}% body weight`,
          recommendation: 'Notable weight gain detected. Review diet and exercise routine.',
        });
      }
    }

    // Breed-specific weight checks for dogs
    if (species === 'dog') {
      const breed = (pet?.breed || '').toLowerCase();
      // Check if underweight or overweight based on breed
      if (breed.includes('chihuahua') && value > 4) {
        alerts.push({
          type: 'overweight',
          severity: 'medium',
          message: 'Weight may be above healthy range for a Chihuahua',
          recommendation: 'Chihuahuas should typically weigh 2-4 kg. Consider adjusting diet.',
        });
      } else if (breed.includes('golden retriever') && (value < 25 || value > 40)) {
        if (value < 25) {
          alerts.push({
            type: 'underweight',
            severity: 'medium',
            message: 'Weight may be below healthy range for a Golden Retriever',
            recommendation: 'Golden Retrievers should typically weigh 25-40 kg. Consider nutritional evaluation.',
          });
        } else {
          alerts.push({
            type: 'overweight',
            severity: 'medium',
            message: 'Weight may be above healthy range for a Golden Retriever',
            recommendation: 'Golden Retrievers should typically weigh 25-40 kg. Consider diet adjustment.',
          });
        }
      }
    }
  }

  // Temperature alerts (fever detection)
  if (type === 'temperature') {
    const species = (pet?.species || '').toLowerCase();
    // Normal dog temperature: 38.3-39.2°C
    // Normal cat temperature: 38.1-39.2°C
    if (species === 'dog') {
      if (value > 39.5) {
        alerts.push({
          type: 'fever',
          severity: value > 40.5 ? 'high' : 'medium',
          message: `Dog temperature ${value}°C is above normal range`,
          recommendation: value > 40.5
            ? 'URGENT: Temperature is critically high. Seek immediate veterinary care.'
            : 'Elevated temperature detected. Monitor closely and consult vet if it persists.',
        });
      } else if (value < 37.5) {
        alerts.push({
          type: 'hypothermia',
          severity: value < 36.5 ? 'high' : 'medium',
          message: `Dog temperature ${value}°C is below normal range`,
          recommendation: 'Low temperature may indicate hypothermia or shock. Keep pet warm and consult vet.',
        });
      }
    } else if (species === 'cat') {
      if (value > 39.5) {
        alerts.push({
          type: 'fever',
          severity: value > 40.5 ? 'high' : 'medium',
          message: `Cat temperature ${value}°C is above normal range`,
          recommendation: value > 40.5
            ? 'URGENT: Temperature is critically high. Seek immediate veterinary care.'
            : 'Elevated temperature detected. Monitor closely and consult vet if it persists.',
        });
      }
    }
  }

  // Heart rate alerts
  if (type === 'heart_rate') {
    const species = (pet?.species || '').toLowerCase();
    // Normal dog resting heart rate: 60-140 bpm (smaller dogs higher)
    // Normal cat resting heart rate: 140-220 bpm
    if (species === 'dog') {
      if (value > 160) {
        alerts.push({
          type: 'high_heart_rate',
          severity: value > 180 ? 'high' : 'medium',
          message: `Dog heart rate ${value} bpm is elevated`,
          recommendation: 'Elevated heart rate at rest could indicate stress, pain, or health issues.',
        });
      } else if (value < 50) {
        alerts.push({
          type: 'low_heart_rate',
          severity: 'medium',
          message: `Dog heart rate ${value} bpm is low`,
          recommendation: 'Low heart rate (bradycardia) may require veterinary evaluation.',
        });
      }
    } else if (species === 'cat') {
      if (value > 240) {
        alerts.push({
          type: 'high_heart_rate',
          severity: 'high',
          message: `Cat heart rate ${value} bpm is elevated`,
          recommendation: 'Very elevated heart rate in cats needs veterinary attention.',
        });
      } else if (value < 120) {
        alerts.push({
          type: 'low_heart_rate',
          severity: 'medium',
          message: `Cat heart rate ${value} bpm is low`,
          recommendation: 'Low heart rate in cats may indicate a health issue.',
        });
      }
    }
  }

  // Activity alerts (too little activity)
  if (type === 'activity') {
    // Get weekly activity total
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: weeklyActivity } = await supabase
      .from('health_records')
      .select('value')
      .eq('pet_id', petId)
      .eq('type', 'activity')
      .gte('recorded_at', oneWeekAgo.toISOString());

    if (weeklyActivity) {
      const totalMinutes = weeklyActivity.reduce((sum, r) => sum + r.value, 0);
      const species = (pet?.species || '').toLowerCase();

      // Dogs need at least 30-60 min daily, cats need at least 15-30 min
      const minWeeklyMinutes = species === 'dog' ? 210 : 105; // 30 min/day for dogs, 15 min/day for cats

      if (totalMinutes < minWeeklyMinutes && weeklyActivity.length >= 3) {
        alerts.push({
          type: 'low_activity',
          severity: 'low',
          message: `Only ${totalMinutes} minutes of activity recorded this week`,
          recommendation: `${species === 'dog' ? 'Dogs' : 'Cats'} benefit from regular exercise. Try to increase activity levels.`,
        });
      }
    }
  }

  // Insert alerts
  for (const alert of alerts) {
    await supabase.from('alerts').insert({
      pet_id: petId,
      user_id: userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      recommendation: alert.recommendation,
      resolved: false,
    });
  }

  return alerts;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Recalculate health score after adding a new record
 * Uses unified Edge Function (single source of truth)
 */
async function recalculateHealthScore(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  petId: string
) {
  if (!supabase) return null;

  // PRIMARY: Use unified Edge Function
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/health-score-unified`;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ petId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Unified health score recalculated: ${result.overall} (${result.status})`);
        return result;
      }
    } catch (error) {
      console.warn('Unified Edge Function error, falling back to RPC:', error);
    }
  }

  // Fallback to RPC function
  const { data, error } = await supabase.rpc('compute_health_score', {
    p_pet_id: petId,
  });

  if (error) {
    console.warn('Could not recalculate health score:', error);
    return null;
  }

  return data;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/health-records
 * Get health records for a user/pet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const petId = searchParams.get('petId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    let query = supabase
      .from('health_records')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (petId) {
      query = query.eq('pet_id', petId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching health records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch health records' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      records: records || [],
      count: records?.length || 0,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in health records API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/health-records
 * Create a new health record
 *
 * Body:
 * {
 *   userId: string,
 *   petId: string,
 *   type: 'weight' | 'temperature' | 'heart_rate' | 'activity' | 'vaccination' | 'medication' | 'clinical_summary' | 'lab_result',
 *   value: number,
 *   unit: string,
 *   notes?: string,
 *   recordedAt?: string (ISO date)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, petId, type, value, unit, notes, recordedAt } = body;

    // Basic required fields validation
    if (!userId || !petId || !type || value === undefined || !unit) {
      return NextResponse.json(
        { error: 'userId, petId, type, value, and unit are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate UUID formats
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { error: 'Invalid userId format' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidUUID(petId)) {
      return NextResponse.json(
        { error: 'Invalid petId format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate record type
    if (!VALID_RECORD_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid record type: ${type}. Valid types: ${VALID_RECORD_TYPES.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get pet info for validation and alert generation
    const { data: petData } = await supabase
      .from('pets')
      .select('species, breed, weight, age, activity_minutes')
      .eq('id', petId)
      .single();

    // Validate the health record value against species-specific bounds
    const numericValue = Number(value);
    const validation = validateHealthRecord(type, numericValue, petData?.species);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize notes if provided
    const sanitizedNotes = notes ? sanitizeString(notes, 2000) : null;

    const payload = {
      user_id: userId,
      pet_id: petId,
      type,
      value: numericValue,
      unit: sanitizeString(unit, 50),
      notes: sanitizedNotes,
      recorded_at: recordedAt || new Date().toISOString(),
    };

    const { data: newRecord, error } = await supabase
      .from('health_records')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating health record:', error);
      return NextResponse.json(
        { error: 'Failed to create health record' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update pet profile based on record type
    let petUpdated = false;

    // If it's a weight record, also update the pet's weight
    if (type === 'weight') {
      const { error: petError } = await supabase
        .from('pets')
        .update({ weight: Number(value), updated_at: new Date().toISOString() })
        .eq('id', petId)
        .eq('user_id', userId);

      if (petError) {
        console.warn('Could not update pet weight:', petError);
      } else {
        petUpdated = true;
      }
    }

    // If it's an activity record, update pet's activity minutes
    if (type === 'activity') {
      const currentActivityMinutes = petData?.activity_minutes || 0;
      const newActivityMinutes = currentActivityMinutes + Number(value);
      const { error: petError } = await supabase
        .from('pets')
        .update({ activity_minutes: newActivityMinutes, updated_at: new Date().toISOString() })
        .eq('id', petId)
        .eq('user_id', userId);

      if (petError) {
        console.warn('Could not update pet activity:', petError);
      } else {
        petUpdated = true;
      }
    }

    // Check for health alerts based on the new record
    const alertsCreated = await checkAndCreateHealthAlerts(
      supabase,
      userId,
      petId,
      type,
      Number(value),
      petData || undefined
    );

    // Run comprehensive health alert analysis
    // This uses full health record history for trend analysis, activity, vaccination status
    let comprehensiveAlertsCreated = 0;
    if (petData) {
      // Fetch all health records for comprehensive analysis
      const { data: allRecords } = await supabase
        .from('health_records')
        .select('*')
        .eq('pet_id', petId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      // Get vaccination records
      const { data: vaccinationRecords } = await supabase
        .from('health_records')
        .select('recorded_at')
        .eq('pet_id', petId)
        .eq('type', 'vaccination')
        .order('recorded_at', { ascending: false })
        .limit(1);

      // Calculate weekly activity from records
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: weeklyActivityRecords } = await supabase
        .from('health_records')
        .select('value')
        .eq('pet_id', petId)
        .eq('type', 'activity')
        .gte('recorded_at', oneWeekAgo.toISOString());

      const activityMinutesThisWeek = weeklyActivityRecords
        ? weeklyActivityRecords.reduce((sum, r) => sum + (r.value || 0), 0)
        : undefined;

      // Convert DB records to HealthRecord type
      const healthRecords: HealthRecord[] = (allRecords || []).map(r => ({
        id: r.id,
        petId: r.pet_id,
        type: r.type,
        value: r.value,
        unit: r.unit,
        notes: r.notes,
        recordedAt: r.recorded_at,
        createdAt: r.created_at,
      }));

      const petForAlerts: Pet = {
        id: petId,
        name: petData.species || 'Pet',
        species: petData.species || 'Dog',
        breed: petData.breed || undefined,
        age: petData.age || undefined,
        weight: type === 'weight' ? Number(value) : petData.weight || undefined,
      };

      const comprehensiveInput: ComprehensiveAlertInput = {
        pet: petForAlerts,
        healthRecords,
        lastVaccinationDate: vaccinationRecords?.[0]?.recorded_at
          ? new Date(vaccinationRecords[0].recorded_at)
          : undefined,
        activityMinutesThisWeek,
      };

      const comprehensiveAlerts = generateComprehensiveAlerts(comprehensiveInput);

      // Insert alerts that don't already exist
      for (const alert of comprehensiveAlerts) {
        // Check if similar alert already exists (same type, unresolved)
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('pet_id', petId)
          .eq('type', alert.type)
          .eq('resolved', false)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase.from('alerts').insert({
            pet_id: petId,
            user_id: userId,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            recommendation: alert.recommendation,
            resolved: false,
          });
          if (!insertError) {
            comprehensiveAlertsCreated++;
            console.log(`Comprehensive alert created: ${alert.type} (${alert.severity})`);
          }
        }
      }
    }

    // Recalculate health score
    const newHealthScore = await recalculateHealthScore(supabase, petId);

    const totalAlerts = (alertsCreated?.length || 0) + comprehensiveAlertsCreated;
    console.log(`Health record created: type=${type}, value=${value}, petUpdated=${petUpdated}, alerts=${totalAlerts}`);

    return NextResponse.json({
      success: true,
      record: newRecord,
      message: `Health record (${type}) added successfully`,
      petUpdated,
      alertsCreated: totalAlerts,
      newHealthScore: newHealthScore,
    }, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store', // Don't cache POST responses
      }
    });

  } catch (error) {
    console.error('Error in create health record API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/health-records
 * Update a health record
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, recordId, type, value, unit, notes, recordedAt } = body;

    if (!userId || !recordId) {
      return NextResponse.json(
        { error: 'userId and recordId are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const payload: any = {};
    if (type !== undefined) payload.type = type;
    if (value !== undefined) payload.value = Number(value);
    if (unit !== undefined) payload.unit = unit;
    if (notes !== undefined) payload.notes = notes;
    if (recordedAt !== undefined) payload.recorded_at = recordedAt;

    const { data: updatedRecord, error } = await supabase
      .from('health_records')
      .update(payload)
      .eq('id', recordId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating health record:', error);
      return NextResponse.json(
        { error: 'Failed to update health record' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      message: 'Health record updated successfully',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in update health record API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/health-records
 * Delete a health record
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, recordId } = body;

    if (!userId || !recordId) {
      return NextResponse.json(
        { error: 'userId and recordId are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('health_records')
      .delete()
      .eq('id', recordId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting health record:', error);
      return NextResponse.json(
        { error: 'Failed to delete health record' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Health record deleted successfully',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in delete health record API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
