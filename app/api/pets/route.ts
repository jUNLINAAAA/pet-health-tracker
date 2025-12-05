import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/client';
import {
  generateHealthAlerts,
  generateComprehensiveAlerts,
  Pet,
  ComprehensiveAlertInput
} from '@/lib/unified-health-system';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/pets
 * Get all pets for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    const { data: pets, error } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pets' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ pets: pets || [] }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in pets API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/pets
 * Create a new pet with automatic health alert generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, species, breed, age, weight, image } = body;

    if (!userId || !name || !species) {
      return NextResponse.json(
        { error: 'userId, name, and species are required' },
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

    // Create the pet
    const payload = {
      user_id: userId,
      name,
      species,
      breed: breed || null,
      age: age ? Number(age) : null,
      weight: weight ? Number(weight) : null,
      image: image || null,
    };

    const { data: newPet, error } = await supabase
      .from('pets')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating pet:', error);
      return NextResponse.json(
        { error: 'Failed to create pet' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate health alerts based on pet data
    const petForAlerts: Pet = {
      id: newPet.id,
      name: newPet.name,
      species: newPet.species,
      breed: newPet.breed || undefined,
      age: newPet.age || undefined,
      weight: newPet.weight || undefined,
    };

    const generatedAlerts = generateHealthAlerts(petForAlerts);
    const alertsCreated: string[] = [];

    // Insert generated alerts into database
    for (const alert of generatedAlerts) {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          pet_id: newPet.id,
          user_id: userId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          recommendation: alert.recommendation,
          resolved: false,
        });

      if (!alertError) {
        alertsCreated.push(alert.type);
      } else {
        console.warn('Failed to create alert:', alertError);
      }
    }

    console.log(`Pet created: ${name} (${species}), alerts: ${alertsCreated.length}`);

    return NextResponse.json({
      success: true,
      pet: newPet,
      alertsCreated: alertsCreated.length,
      alerts: generatedAlerts,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in create pet API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/pets
 * Update a pet with automatic health alert generation
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, petId, name, species, breed, age, weight, image } = body;

    if (!userId || !petId) {
      return NextResponse.json(
        { error: 'userId and petId are required' },
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

    // Build update payload
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) payload.name = name;
    if (species !== undefined) payload.species = species;
    if (breed !== undefined) payload.breed = breed || null;
    if (age !== undefined) payload.age = age ? Number(age) : null;
    if (weight !== undefined) payload.weight = weight ? Number(weight) : null;
    if (image !== undefined) payload.image = image || null;

    const { data: updatedPet, error } = await supabase
      .from('pets')
      .update(payload)
      .eq('id', petId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pet:', error);
      return NextResponse.json(
        { error: 'Failed to update pet' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Clear old unresolved alerts of the same types we're about to regenerate
    const petForAlerts: Pet = {
      id: updatedPet.id,
      name: updatedPet.name,
      species: updatedPet.species,
      breed: updatedPet.breed || undefined,
      age: updatedPet.age || undefined,
      weight: updatedPet.weight || undefined,
    };

    const generatedAlerts = generateHealthAlerts(petForAlerts);
    const newAlertTypes = generatedAlerts.map(a => a.type);

    // Resolve old alerts that will be regenerated (same types)
    if (newAlertTypes.length > 0) {
      await supabase
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('pet_id', petId)
        .eq('user_id', userId)
        .eq('resolved', false)
        .in('type', newAlertTypes);
    }

    // Insert new alerts
    const alertsCreated: string[] = [];
    for (const alert of generatedAlerts) {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          pet_id: petId,
          user_id: userId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          recommendation: alert.recommendation,
          resolved: false,
        });

      if (!alertError) {
        alertsCreated.push(alert.type);
      } else {
        console.warn('Failed to create alert:', alertError);
      }
    }

    console.log(`Pet updated: ${updatedPet.name}, alerts regenerated: ${alertsCreated.length}`);

    return NextResponse.json({
      success: true,
      pet: updatedPet,
      alertsCreated: alertsCreated.length,
      alerts: generatedAlerts,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in update pet API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/pets
 * Delete a pet
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, petId } = body;

    if (!userId || !petId) {
      return NextResponse.json(
        { error: 'userId and petId are required' },
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

    // Delete related records first (cascade might handle this, but being explicit)
    await supabase.from('alerts').delete().eq('pet_id', petId).eq('user_id', userId);
    await supabase.from('health_records').delete().eq('pet_id', petId).eq('user_id', userId);
    await supabase.from('appointments').delete().eq('pet_id', petId).eq('user_id', userId);

    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', petId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting pet:', error);
      return NextResponse.json(
        { error: 'Failed to delete pet' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pet deleted successfully',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in delete pet API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
