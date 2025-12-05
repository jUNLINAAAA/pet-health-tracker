import { NextRequest, NextResponse } from 'next/server';
import { PetService } from '@/lib/services';

// Mark this route as dynamic to allow search params
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * UNIFIED HEALTH SCORE API
 *
 * Single source of truth: Uses the health-score-unified Edge Function
 * which implements comprehensive scoring with ALL metrics:
 * - Weight (20%): Gaussian probability vs breed norms
 * - Activity (20%): Time-decay weighted vs target
 * - Medical (25%): Vaccination + appointments + clinical/OCR
 * - Alerts (15%): Logarithmic penalty by severity
 * - AI Insights (10%): Pattern detection from conversations
 * - Age (10%): Life-stage adjusted baseline
 * - Appetite (bonus 10%): When data exists
 *
 * Fallback: TypeScript implementation if Edge Function unavailable
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const petId = searchParams.get('petId');

    if (!petId) {
      return NextResponse.json(
        { error: 'Missing required parameter: petId' },
        { status: 400 }
      );
    }

    // PRIMARY: Use unified Edge Function (single source of truth)
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
          const pet = await PetService.getPet(petId);

          return NextResponse.json({
            ...result,
            petId,
            petName: pet?.name || 'Unknown',
            timestamp: new Date().toISOString(),
          });
        }

        console.warn('Edge Function returned non-OK status, falling back to TypeScript');
      } catch (edgeError) {
        console.warn('Edge Function error, falling back to TypeScript:', edgeError);
      }
    }

    // Edge Function failed - return error (no local fallback to ensure single source of truth)
    console.error('Edge Function unavailable - check Supabase configuration');
    return NextResponse.json(
      {
        error: 'Health score service unavailable',
        message: 'Edge Function not responding. Check Supabase configuration.',
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error in health-score API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
