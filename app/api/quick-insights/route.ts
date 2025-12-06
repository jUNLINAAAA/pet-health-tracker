/**
 * Quick Insights API Endpoint
 *
 * Returns aggregated quick insights data for the authenticated user:
 * - Wellness Index (average of recent health scores)
 * - Pets count
 * - Alert statistics (total, resolved, active)
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface QuickInsightsResponse {
  wellnessIndex: number;
  petsCount: number;
  totalAlerts: number;
  resolvedAlerts: number;
  activeAlerts: number;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Get authenticated user - try getSession first (faster, reads cookies)
    // then fall back to getUser if needed
    let userId: string | undefined;
    let userEmail: string | undefined;

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[Quick Insights] Session check:', session ? `user: ${session.user.id}` : 'no session', sessionError ? `error: ${sessionError.message}` : '');

    if (session?.user) {
      userId = session.user.id;
      userEmail = session.user.email;
    } else {
      // Fallback to getUser() which makes network call
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[Quick Insights] getUser fallback:', user ? `user: ${user.id}` : 'no user', authError ? `error: ${authError.message}` : '');

      if (authError || !user) {
        console.log('[Quick Insights] Auth failed - returning 401');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
      userEmail = user.email;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Quick Insights] Authenticated - User ID:', userId, 'Email:', userEmail);

    // Calculate 7 days ago for alert filtering
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Fetch all data in parallel for performance
    const [petsResult, alertsTotalResult, alertsResolvedResult, scoresResult] = await Promise.all([
      // Count pets
      supabase
        .from('pets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Count total alerts (last 7 days only)
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoISO),

      // Count resolved alerts (last 7 days only)
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('resolved', true)
        .gte('created_at', sevenDaysAgoISO),

      // Get recent health scores for wellness index
      supabase
        .from('health_scores')
        .select('score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Handle any errors
    if (petsResult.error) {
      console.error('Error fetching pets count:', petsResult.error);
    }
    if (alertsTotalResult.error) {
      console.error('Error fetching total alerts:', alertsTotalResult.error);
    }
    if (alertsResolvedResult.error) {
      console.error('Error fetching resolved alerts:', alertsResolvedResult.error);
    }
    if (scoresResult.error) {
      console.error('Error fetching health scores:', scoresResult.error);
    }

    // Calculate values
    const petsCount = petsResult.count ?? 0;
    const totalAlerts = alertsTotalResult.count ?? 0;
    const resolvedAlerts = alertsResolvedResult.count ?? 0;
    const activeAlerts = Math.max(0, totalAlerts - resolvedAlerts);

    // Calculate wellness index from health scores
    let wellnessIndex = 0;
    if (scoresResult.data && scoresResult.data.length > 0) {
      const scores = scoresResult.data
        .map(s => s.score)
        .filter((s): s is number => typeof s === 'number');

      if (scores.length > 0) {
        wellnessIndex = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    }

    const response: QuickInsightsResponse = {
      wellnessIndex,
      petsCount,
      totalAlerts,
      resolvedAlerts,
      activeAlerts,
    };

    console.log('[Quick Insights] Response:', JSON.stringify(response));
    return NextResponse.json(response);
  } catch (error) {
    console.error('Quick Insights API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
