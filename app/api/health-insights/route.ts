import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('ai_health_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (petId) {
      query = query.eq('pet_id', petId);
    }

    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true');
    }

    const { data: insights, error } = await query;

    if (error) {
      console.error('Error fetching health insights:', error);
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      );
    }

    // Transform to camelCase for frontend
    const transformedInsights = (insights || []).map(insight => ({
      id: insight.id,
      petId: insight.pet_id,
      userId: insight.user_id,
      insightType: insight.insight_type,
      message: insight.message,
      severity: insight.severity,
      confidence: insight.confidence,
      conversationId: insight.conversation_id,
      sourceMessage: insight.source_message,
      scoreImpact: insight.score_impact,
      acknowledged: insight.acknowledged,
      resolved: insight.resolved,
      resolvedAt: insight.resolved_at,
      recommendation: insight.recommendation,
      dataPoints: insight.data_points,
      createdAt: insight.created_at,
      updatedAt: insight.updated_at,
    }));

    return NextResponse.json({ insights: transformedInsights });
  } catch (error) {
    console.error('Health insights API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      petId,
      insightType,
      message,
      severity = 'low',
      confidence = 0.80,
      recommendation,
      dataPoints,
      scoreImpact,
    } = body;

    if (!petId || !insightType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: petId, insightType, message' },
        { status: 400 }
      );
    }

    // Calculate score impact if not provided
    let calculatedScoreImpact = scoreImpact ?? 0;
    if (calculatedScoreImpact === 0) {
      switch (insightType) {
        case 'symptom_reported':
        case 'health_concern':
          calculatedScoreImpact = severity === 'high' ? -15 : severity === 'medium' ? -10 : -5;
          break;
        case 'behavior_change':
        case 'diet_concern':
          calculatedScoreImpact = severity === 'high' ? -10 : severity === 'medium' ? -5 : -2;
          break;
        case 'vet_recommendation':
          calculatedScoreImpact = -8;
          break;
        case 'health_improvement':
        case 'positive_health':
        case 'positive_trend':
          calculatedScoreImpact = severity === 'high' ? 10 : severity === 'medium' ? 5 : 3;
          break;
        default:
          calculatedScoreImpact = 0;
      }
    }

    const { data: insight, error } = await supabase
      .from('ai_health_insights')
      .insert({
        pet_id: petId,
        user_id: user.id,
        insight_type: insightType,
        message,
        severity,
        confidence,
        recommendation,
        data_points: dataPoints || [],
        score_impact: calculatedScoreImpact,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating health insight:', error);
      return NextResponse.json(
        { error: 'Failed to create insight' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      insight: {
        id: insight.id,
        petId: insight.pet_id,
        userId: insight.user_id,
        insightType: insight.insight_type,
        message: insight.message,
        severity: insight.severity,
        confidence: insight.confidence,
        recommendation: insight.recommendation,
        dataPoints: insight.data_points,
        scoreImpact: insight.score_impact,
        acknowledged: insight.acknowledged,
        resolved: insight.resolved,
        createdAt: insight.created_at,
        updatedAt: insight.updated_at,
      },
    });
  } catch (error) {
    console.error('Health insights API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { insightId, action } = body;

    if (!insightId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: insightId, action' },
        { status: 400 }
      );
    }

    let updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'acknowledge':
        updateData.acknowledged = true;
        break;
      case 'resolve':
        updateData.resolved = true;
        updateData.resolved_at = new Date().toISOString();
        break;
      case 'unresolve':
        updateData.resolved = false;
        updateData.resolved_at = null;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: acknowledge, resolve, unresolve' },
          { status: 400 }
        );
    }

    const { data: insight, error } = await supabase
      .from('ai_health_insights')
      .update(updateData)
      .eq('id', insightId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating health insight:', error);
      return NextResponse.json(
        { error: 'Failed to update insight' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      insight: {
        id: insight.id,
        petId: insight.pet_id,
        userId: insight.user_id,
        insightType: insight.insight_type,
        message: insight.message,
        severity: insight.severity,
        confidence: insight.confidence,
        acknowledged: insight.acknowledged,
        resolved: insight.resolved,
        resolvedAt: insight.resolved_at,
        createdAt: insight.created_at,
        updatedAt: insight.updated_at,
      },
    });
  } catch (error) {
    console.error('Health insights API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
