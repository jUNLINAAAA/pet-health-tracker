import { NextRequest, NextResponse } from 'next/server';
import { AIScoreVerificationService } from '@/lib/services/production/ai-score-verification-service';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petId, calculatedScore, components } = body;

    if (!petId || calculatedScore === undefined || !components) {
      return NextResponse.json(
        { error: 'petId, calculatedScore, and components are required' },
        { status: 400 }
      );
    }

    // Fetch pet context for verification
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get pet data
    const { data: pet } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (!pet) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404 }
      );
    }

    // Get recent alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('type, severity, message')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent health records
    const { data: healthRecords } = await supabase
      .from('health_records')
      .select('type, value, unit')
      .eq('pet_id', petId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    // Get AI insights
    const { data: aiInsights } = await supabase
      .from('ai_health_insights')
      .select('insight_type, severity, message')
      .eq('pet_id', petId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context for AI verification
    const petContext = {
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age,
      weight: pet.weight,
      recentAlerts: (alerts || []).map(a => ({
        type: a.type,
        severity: a.severity,
        message: a.message,
      })),
      recentHealthRecords: (healthRecords || []).map(r => ({
        type: r.type,
        value: r.value,
        unit: r.unit,
      })),
      aiInsights: (aiInsights || []).map(i => ({
        type: i.insight_type,
        severity: i.severity,
        message: i.message,
      })),
    };

    // Perform AI verification
    const verification = await AIScoreVerificationService.verifyScore(
      petId,
      calculatedScore,
      components,
      petContext
    );

    if (!verification) {
      return NextResponse.json(
        { error: 'Score verification failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verification,
      summary: {
        calculatedScore,
        aiVerifiedScore: verification.aiVerifiedScore,
        finalScore: verification.finalScore,
        agreementStatus: verification.agreementStatus,
        confidence: verification.aiConfidence,
        recommendations: verification.aiRecommendations,
      },
    });

  } catch (error) {
    console.error('Score verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify score' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const petId = searchParams.get('petId');

  if (!petId) {
    return NextResponse.json(
      { error: 'petId is required' },
      { status: 400 }
    );
  }

  try {
    const [verifications, stats] = await Promise.all([
      AIScoreVerificationService.getRecentVerifications(petId, 5),
      AIScoreVerificationService.getAgreementStats(petId),
    ]);

    return NextResponse.json({
      verifications,
      stats,
    });

  } catch (error) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}
