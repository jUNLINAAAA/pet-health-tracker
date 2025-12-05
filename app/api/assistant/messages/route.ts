import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/assistant/messages
 * Get chat messages for a user (optionally filtered by pet)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const petId = searchParams.get('petId');
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
      .from('assistant_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (petId) {
      query = query.eq('pet_id', petId);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      messages: messages || [],
      count: messages?.length || 0,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/assistant/messages
 * Delete specific messages or clear chat history
 *
 * Body options:
 * - { userId, messageIds: string[] } - Delete specific messages
 * - { userId, petId? } - Delete all messages (optionally for specific pet)
 * - { userId, olderThanDays: number } - Delete messages older than X days
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, messageIds, petId, olderThanDays } = body;

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

    let deletedCount = 0;

    // Option 1: Delete specific messages by ID
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      const { data, error } = await supabase
        .from('assistant_messages')
        .delete()
        .eq('user_id', userId)
        .in('id', messageIds)
        .select('id');

      if (error) {
        console.error('Error deleting messages:', error);
        return NextResponse.json(
          { error: 'Failed to delete messages' },
          { status: 500, headers: corsHeaders }
        );
      }

      deletedCount = data?.length || 0;

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} message(s)`,
      }, { headers: corsHeaders });
    }

    // Option 2: Delete messages older than X days
    if (olderThanDays && typeof olderThanDays === 'number') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let query = supabase
        .from('assistant_messages')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query.select('id');

      if (error) {
        console.error('Error deleting old messages:', error);
        return NextResponse.json(
          { error: 'Failed to delete old messages' },
          { status: 500, headers: corsHeaders }
        );
      }

      deletedCount = data?.length || 0;

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} message(s) older than ${olderThanDays} days`,
      }, { headers: corsHeaders });
    }

    // Option 3: Delete all messages (for user or specific pet)
    let query = supabase
      .from('assistant_messages')
      .delete()
      .eq('user_id', userId);

    if (petId) {
      query = query.eq('pet_id', petId);
    }

    const { data, error } = await query.select('id');

    if (error) {
      console.error('Error deleting all messages:', error);
      return NextResponse.json(
        { error: 'Failed to delete messages' },
        { status: 500, headers: corsHeaders }
      );
    }

    deletedCount = data?.length || 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: petId
        ? `Deleted all ${deletedCount} message(s) for this pet`
        : `Deleted all ${deletedCount} message(s)`,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in delete messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
