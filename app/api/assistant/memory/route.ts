import { NextRequest, NextResponse } from 'next/server';
import { AIMemoryService } from '@/lib/services/production/ai-memory-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/assistant/memory
 * Get conversation statistics and memory info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const petId = searchParams.get('petId') || undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const stats = await AIMemoryService.getConversationStats(userId, petId);

    return NextResponse.json({
      stats,
      recommendations: getRecommendations(stats),
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error getting memory stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/assistant/memory
 * Perform memory operations: compact, clear, optimize
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, petId, action, options } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    let result: any;

    switch (action) {
      case 'compact':
        // Compact old conversations into summaries
        result = await AIMemoryService.compactConversations(
          userId,
          petId,
          options?.olderThanDays || 7
        );
        return NextResponse.json({
          success: true,
          action: 'compact',
          result,
          message: `Compacted ${result.compactedMessages} messages, created ${result.memoriesCreated} memories, saved ~${result.tokensReduced} tokens`,
        }, { headers: corsHeaders });

      case 'clear':
        // Clear chat history
        result = await AIMemoryService.clearChatHistory(userId, {
          petId,
          olderThanDays: options?.olderThanDays,
          keepSummaries: options?.keepSummaries ?? true,
          keepMemories: options?.keepMemories ?? true,
        });
        return NextResponse.json({
          success: true,
          action: 'clear',
          result,
          message: `Cleared ${result.messagesDeleted} messages`,
        }, { headers: corsHeaders });

      case 'clear_all':
        // Clear everything (messages, summaries, and temporary memories)
        result = await AIMemoryService.clearChatHistory(userId, {
          petId,
          keepSummaries: false,
          keepMemories: false,
        });
        return NextResponse.json({
          success: true,
          action: 'clear_all',
          result,
          message: `Cleared ${result.messagesDeleted} messages, ${result.summariesDeleted} summaries, ${result.memoriesDeleted} memories`,
        }, { headers: corsHeaders });

      case 'optimize':
        // Run full optimization: compact old + extract learnings
        const compactResult = await AIMemoryService.compactConversations(
          userId,
          petId,
          options?.olderThanDays || 14
        );

        // Get current context to see improvement
        const context = await AIMemoryService.getOptimizedContext(userId, petId);

        return NextResponse.json({
          success: true,
          action: 'optimize',
          result: {
            ...compactResult,
            currentContext: context.contextStats,
          },
          message: `Optimized context: ${compactResult.compactedMessages} messages compacted, ${context.contextStats.memoriesIncluded} memories available`,
        }, { headers: corsHeaders });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error) {
    console.error('Error performing memory operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Generate recommendations based on stats
 */
function getRecommendations(stats: {
  totalMessages: number;
  messagesThisWeek: number;
  memoriesCount: number;
  summariesCount: number;
  estimatedTokensUsed: number;
}): string[] {
  const recommendations: string[] = [];

  if (stats.totalMessages > 100) {
    recommendations.push('Consider compacting old conversations to improve response speed');
  }

  if (stats.estimatedTokensUsed > 5000) {
    recommendations.push('High token usage detected. Running optimization can reduce costs');
  }

  if (stats.totalMessages > 50 && stats.memoriesCount < 5) {
    recommendations.push('Enable auto-learning to help the AI remember important details about your pets');
  }

  if (stats.messagesThisWeek > 50) {
    recommendations.push('You are an active user! Great for building AI knowledge about your pets');
  }

  if (stats.totalMessages === 0) {
    recommendations.push('Start chatting with Dr. Paws to build personalized knowledge about your pets');
  }

  return recommendations;
}
