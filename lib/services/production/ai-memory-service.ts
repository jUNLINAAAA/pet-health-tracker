/**
 * AI MEMORY & CONTEXT OPTIMIZATION SERVICE
 *
 * Handles:
 * 1. Conversation compaction (summarizing long histories)
 * 2. Long-term memory storage
 * 3. Progressive learning from conversations
 * 4. Chat history cleanup
 * 5. Context window optimization
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase/client';

// Memory types for different retention periods
export type MemoryType =
  | 'short_term'      // Recent conversation context (24h)
  | 'working_memory'  // Current session info
  | 'long_term'       // Persistent pet facts
  | 'episodic'        // Specific memorable events
  | 'semantic';       // General knowledge learned

export interface AIMemory {
  id: string;
  userId: string;
  petId?: string;
  memoryType: MemoryType;
  category: string;
  content: string;
  importance: number; // 0-1, higher = more important
  accessCount: number;
  lastAccessedAt: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  petId?: string;
  messageCount: number;
  summary: string;
  keyTopics: string[];
  healthInsightsExtracted: number;
  learningsExtracted: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface ContextOptimizationResult {
  compactedMessages: number;
  memoriesCreated: number;
  learningsExtracted: number;
  tokensReduced: number;
}

export class AIMemoryService {
  /**
   * Get optimized context for AI prompt
   * Combines recent messages, memories, and summaries efficiently
   */
  static async getOptimizedContext(
    userId: string,
    petId?: string,
    maxTokens: number = 2000
  ): Promise<{
    recentMessages: Array<{ role: string; content: string }>;
    memories: AIMemory[];
    summaries: ConversationSummary[];
    contextStats: {
      totalMessages: number;
      includedMessages: number;
      memoriesIncluded: number;
      estimatedTokens: number;
    };
  }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return {
        recentMessages: [],
        memories: [],
        summaries: [],
        contextStats: { totalMessages: 0, includedMessages: 0, memoriesIncluded: 0, estimatedTokens: 0 }
      };
    }

    try {
      // 1. Get recent messages (last 20)
      let messagesQuery = supabase
        .from('assistant_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (petId) {
        messagesQuery = messagesQuery.eq('pet_id', petId);
      }

      const { data: messages } = await messagesQuery;

      // 2. Get relevant memories (high importance, recently accessed)
      let memoriesQuery = supabase
        .from('ai_memories')
        .select('*')
        .eq('user_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('importance', { ascending: false })
        .order('last_accessed_at', { ascending: false })
        .limit(15);

      if (petId) {
        memoriesQuery = memoriesQuery.or(`pet_id.is.null,pet_id.eq.${petId}`);
      }

      const { data: memories } = await memoriesQuery;

      // 3. Get recent conversation summaries
      let summariesQuery = supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (petId) {
        summariesQuery = summariesQuery.eq('pet_id', petId);
      }

      const { data: summaries } = await summariesQuery;

      // 4. Calculate token budget and select optimal content
      const recentMessages = (messages || [])
        .reverse()
        .map(m => ({ role: m.role, content: m.content }));

      // Estimate tokens (rough: 4 chars = 1 token)
      let estimatedTokens = recentMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);

      // Filter memories to fit within budget
      const includedMemories: AIMemory[] = [];
      for (const mem of (memories || [])) {
        const memTokens = Math.ceil(mem.content.length / 4);
        if (estimatedTokens + memTokens < maxTokens * 0.8) {
          includedMemories.push({
            id: mem.id,
            userId: mem.user_id,
            petId: mem.pet_id,
            memoryType: mem.memory_type,
            category: mem.category,
            content: mem.content,
            importance: mem.importance,
            accessCount: mem.access_count,
            lastAccessedAt: mem.last_accessed_at,
            expiresAt: mem.expires_at,
            createdAt: mem.created_at,
          });
          estimatedTokens += memTokens;
        }
      }

      // Update access count for used memories
      if (includedMemories.length > 0) {
        await supabase
          .from('ai_memories')
          .update({
            last_accessed_at: new Date().toISOString(),
            // Note: For proper increment, you'd use an RPC function
            // This is a simplified version that just updates the timestamp
          })
          .in('id', includedMemories.map(m => m.id));
      }

      return {
        recentMessages,
        memories: includedMemories,
        summaries: (summaries || []).map(s => ({
          id: s.id,
          userId: s.user_id,
          petId: s.pet_id,
          messageCount: s.message_count,
          summary: s.summary,
          keyTopics: s.key_topics || [],
          healthInsightsExtracted: s.health_insights_extracted,
          learningsExtracted: s.learnings_extracted,
          periodStart: s.period_start,
          periodEnd: s.period_end,
          createdAt: s.created_at,
        })),
        contextStats: {
          totalMessages: messages?.length || 0,
          includedMessages: recentMessages.length,
          memoriesIncluded: includedMemories.length,
          estimatedTokens,
        }
      };
    } catch (error) {
      console.error('Error getting optimized context:', error);
      return {
        recentMessages: [],
        memories: [],
        summaries: [],
        contextStats: { totalMessages: 0, includedMessages: 0, memoriesIncluded: 0, estimatedTokens: 0 }
      };
    }
  }

  /**
   * Store a new memory from conversation
   */
  static async storeMemory(data: {
    userId: string;
    petId?: string;
    memoryType: MemoryType;
    category: string;
    content: string;
    importance?: number;
    expiresInDays?: number;
  }): Promise<AIMemory | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    try {
      let expiresAt: string | null = null;
      if (data.expiresInDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + data.expiresInDays);
        expiresAt = expiry.toISOString();
      }

      // Default expiry by memory type
      if (!expiresAt) {
        switch (data.memoryType) {
          case 'short_term':
            const shortExpiry = new Date();
            shortExpiry.setDate(shortExpiry.getDate() + 1);
            expiresAt = shortExpiry.toISOString();
            break;
          case 'working_memory':
            const workingExpiry = new Date();
            workingExpiry.setHours(workingExpiry.getHours() + 4);
            expiresAt = workingExpiry.toISOString();
            break;
          // long_term, episodic, semantic don't expire
        }
      }

      const { data: inserted, error } = await supabase
        .from('ai_memories')
        .insert({
          user_id: data.userId,
          pet_id: data.petId || null,
          memory_type: data.memoryType,
          category: data.category,
          content: data.content,
          importance: data.importance ?? 0.5,
          access_count: 0,
          last_accessed_at: new Date().toISOString(),
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: inserted.id,
        userId: inserted.user_id,
        petId: inserted.pet_id,
        memoryType: inserted.memory_type,
        category: inserted.category,
        content: inserted.content,
        importance: inserted.importance,
        accessCount: inserted.access_count,
        lastAccessedAt: inserted.last_accessed_at,
        expiresAt: inserted.expires_at,
        createdAt: inserted.created_at,
      };
    } catch (error) {
      console.error('Error storing memory:', error);
      return null;
    }
  }

  /**
   * Compact old conversations into summaries
   * This reduces token usage while preserving important information
   */
  static async compactConversations(
    userId: string,
    petId?: string,
    olderThanDays: number = 7
  ): Promise<ContextOptimizationResult> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return { compactedMessages: 0, memoriesCreated: 0, learningsExtracted: 0, tokensReduced: 0 };
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get old messages to compact
      let query = supabase
        .from('assistant_messages')
        .select('*')
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data: oldMessages } = await query;

      if (!oldMessages || oldMessages.length < 10) {
        return { compactedMessages: 0, memoriesCreated: 0, learningsExtracted: 0, tokensReduced: 0 };
      }

      // Group messages by week
      const weekGroups: Record<string, any[]> = {};
      oldMessages.forEach(msg => {
        const date = new Date(msg.created_at);
        const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
        if (!weekGroups[weekKey]) weekGroups[weekKey] = [];
        weekGroups[weekKey].push(msg);
      });

      let totalCompacted = 0;
      let memoriesCreated = 0;
      let learningsExtracted = 0;
      let tokensReduced = 0;

      for (const [weekKey, messages] of Object.entries(weekGroups)) {
        if (messages.length < 5) continue; // Skip small groups

        // Extract key information from messages
        const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
        const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);

        // Create summary (simplified - in production, you'd use AI for this)
        const keyTopics = this.extractKeyTopics(userMessages);
        const healthMentions = this.extractHealthMentions([...userMessages, ...assistantMessages]);

        // Calculate original tokens
        const originalTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);

        // Create conversation summary
        const summary = `Week ${weekKey}: ${messages.length} messages. Topics: ${keyTopics.join(', ')}. ${healthMentions.length > 0 ? `Health mentions: ${healthMentions.join(', ')}` : ''}`;

        const { error: summaryError } = await supabase
          .from('conversation_summaries')
          .insert({
            user_id: userId,
            pet_id: petId || null,
            message_count: messages.length,
            summary,
            key_topics: keyTopics,
            health_insights_extracted: healthMentions.length,
            learnings_extracted: 0,
            period_start: messages[0].created_at,
            period_end: messages[messages.length - 1].created_at,
          });

        if (!summaryError) {
          // Extract and store important memories
          for (const mention of healthMentions) {
            const memoryResult = await this.storeMemory({
              userId,
              petId: petId || undefined,
              memoryType: 'episodic',
              category: 'health_event',
              content: mention,
              importance: 0.7,
            });
            if (memoryResult) memoriesCreated++;
          }

          // Delete old messages
          const messageIds = messages.map(m => m.id);
          await supabase
            .from('assistant_messages')
            .delete()
            .in('id', messageIds);

          totalCompacted += messages.length;
          tokensReduced += originalTokens - Math.ceil(summary.length / 4);
          learningsExtracted += healthMentions.length;
        }
      }

      return {
        compactedMessages: totalCompacted,
        memoriesCreated,
        learningsExtracted,
        tokensReduced,
      };
    } catch (error) {
      console.error('Error compacting conversations:', error);
      return { compactedMessages: 0, memoriesCreated: 0, learningsExtracted: 0, tokensReduced: 0 };
    }
  }

  /**
   * Clear chat history for a user (with optional pet filter)
   */
  static async clearChatHistory(
    userId: string,
    options: {
      petId?: string;
      olderThanDays?: number;
      keepSummaries?: boolean;
      keepMemories?: boolean;
    } = {}
  ): Promise<{
    messagesDeleted: number;
    summariesDeleted: number;
    memoriesDeleted: number;
  }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return { messagesDeleted: 0, summariesDeleted: 0, memoriesDeleted: 0 };
    }

    try {
      let result = { messagesDeleted: 0, summariesDeleted: 0, memoriesDeleted: 0 };

      // Build date filter if specified
      let dateFilter: string | null = null;
      if (options.olderThanDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - options.olderThanDays);
        dateFilter = cutoff.toISOString();
      }

      // Delete messages
      let messagesQuery = supabase
        .from('assistant_messages')
        .delete()
        .eq('user_id', userId);

      if (options.petId) {
        messagesQuery = messagesQuery.eq('pet_id', options.petId);
      }
      if (dateFilter) {
        messagesQuery = messagesQuery.lt('created_at', dateFilter);
      }

      const { data: deletedMessages } = await messagesQuery.select('id');
      result.messagesDeleted = deletedMessages?.length || 0;

      // Delete summaries if not keeping
      if (!options.keepSummaries) {
        let summariesQuery = supabase
          .from('conversation_summaries')
          .delete()
          .eq('user_id', userId);

        if (options.petId) {
          summariesQuery = summariesQuery.eq('pet_id', options.petId);
        }
        if (dateFilter) {
          summariesQuery = summariesQuery.lt('created_at', dateFilter);
        }

        const { data: deletedSummaries } = await summariesQuery.select('id');
        result.summariesDeleted = deletedSummaries?.length || 0;
      }

      // Delete memories if not keeping
      if (!options.keepMemories) {
        let memoriesQuery = supabase
          .from('ai_memories')
          .delete()
          .eq('user_id', userId)
          .in('memory_type', ['short_term', 'working_memory']); // Only clear temporary memories

        if (options.petId) {
          memoriesQuery = memoriesQuery.eq('pet_id', options.petId);
        }

        const { data: deletedMemories } = await memoriesQuery.select('id');
        result.memoriesDeleted = deletedMemories?.length || 0;
      }

      return result;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return { messagesDeleted: 0, summariesDeleted: 0, memoriesDeleted: 0 };
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(userId: string, petId?: string): Promise<{
    totalMessages: number;
    messagesThisWeek: number;
    memoriesCount: number;
    summariesCount: number;
    oldestMessage?: string;
    estimatedTokensUsed: number;
  }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return {
        totalMessages: 0,
        messagesThisWeek: 0,
        memoriesCount: 0,
        summariesCount: 0,
        estimatedTokensUsed: 0,
      };
    }

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get message counts
      let messagesQuery = supabase
        .from('assistant_messages')
        .select('id, created_at, content')
        .eq('user_id', userId);

      if (petId) {
        messagesQuery = messagesQuery.eq('pet_id', petId);
      }

      const { data: messages } = await messagesQuery;

      // Get memory count
      let memoriesQuery = supabase
        .from('ai_memories')
        .select('id')
        .eq('user_id', userId);

      if (petId) {
        memoriesQuery = memoriesQuery.or(`pet_id.is.null,pet_id.eq.${petId}`);
      }

      const { data: memories } = await memoriesQuery;

      // Get summary count
      let summariesQuery = supabase
        .from('conversation_summaries')
        .select('id')
        .eq('user_id', userId);

      if (petId) {
        summariesQuery = summariesQuery.eq('pet_id', petId);
      }

      const { data: summaries } = await summariesQuery;

      const allMessages = messages || [];
      const weekMessages = allMessages.filter(m => new Date(m.created_at) > weekAgo);
      const estimatedTokens = allMessages.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 4), 0);

      return {
        totalMessages: allMessages.length,
        messagesThisWeek: weekMessages.length,
        memoriesCount: memories?.length || 0,
        summariesCount: summaries?.length || 0,
        oldestMessage: allMessages.length > 0
          ? allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]?.created_at
          : undefined,
        estimatedTokensUsed: estimatedTokens,
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalMessages: 0,
        messagesThisWeek: 0,
        memoriesCount: 0,
        summariesCount: 0,
        estimatedTokensUsed: 0,
      };
    }
  }

  /**
   * Extract key topics from messages (simple keyword extraction)
   */
  private static extractKeyTopics(messages: string[]): string[] {
    const allText = messages.join(' ').toLowerCase();
    const topics: string[] = [];

    const topicPatterns: Record<string, RegExp> = {
      'weight': /weight|pounds?|kg|kilograms?|overweight|underweight|diet/i,
      'food': /food|eat|eating|appetite|hungry|feeding|meal/i,
      'exercise': /exercise|walk|run|play|activity|active/i,
      'health': /health|sick|ill|symptom|vet|doctor|checkup/i,
      'behavior': /behavior|behav|acting|mood|anxious|scared|aggressive/i,
      'medication': /medicine|medication|pills?|treatment|prescription/i,
      'grooming': /groom|bath|brush|nail|fur|coat|shed/i,
      'training': /train|command|obedience|trick|learn/i,
      'vaccination': /vaccin|shot|immuniz|booster/i,
      'dental': /teeth|dental|mouth|breath|chew/i,
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(allText)) {
        topics.push(topic);
      }
    }

    return topics.slice(0, 5); // Max 5 topics
  }

  /**
   * Extract health-related mentions from messages
   */
  private static extractHealthMentions(messages: string[]): string[] {
    const mentions: string[] = [];
    const allText = messages.join(' ');

    const healthPatterns = [
      /(?:started|stopped|began) (?:vomiting|limping|coughing|sneezing)/gi,
      /diagnosed with \w+/gi,
      /(?:vet|doctor) (?:said|recommended|prescribed) .+?(?:\.|$)/gi,
      /(?:allergy|allergic) to \w+/gi,
      /surgery (?:for|on) \w+/gi,
      /weight (?:is now|changed to) \d+/gi,
      /started (?:new )?medication/gi,
      /recovered from \w+/gi,
    ];

    for (const pattern of healthPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        if (!mentions.includes(match[0])) {
          mentions.push(match[0].trim());
        }
      }
    }

    return mentions.slice(0, 10); // Max 10 mentions
  }

  /**
   * Auto-extract and store learnings from a conversation
   */
  static async extractAndStoreLearnings(
    userId: string,
    petId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<number> {
    const userContent = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const learningPatterns: Array<{
      pattern: RegExp;
      memoryType: MemoryType;
      category: string;
      importance: number;
    }> = [
      // Pet preferences
      { pattern: /(?:loves?|enjoys?|likes?) (\w+ ?\w*)/gi, memoryType: 'long_term', category: 'preference', importance: 0.6 },
      { pattern: /(?:hates?|dislikes?|avoids?) (\w+ ?\w*)/gi, memoryType: 'long_term', category: 'aversion', importance: 0.6 },

      // Health information
      { pattern: /allergic to (\w+)/gi, memoryType: 'long_term', category: 'allergy', importance: 0.9 },
      { pattern: /diagnosed with (\w+ ?\w*)/gi, memoryType: 'long_term', category: 'diagnosis', importance: 0.95 },
      { pattern: /taking (\w+) (?:medication|medicine)/gi, memoryType: 'long_term', category: 'medication', importance: 0.9 },

      // Routine information
      { pattern: /(?:walks?|walked) (\d+) times?/gi, memoryType: 'semantic', category: 'routine', importance: 0.5 },
      { pattern: /(?:feeds?|fed|eating) at (\d+(?::\d+)?(?:am|pm)?)/gi, memoryType: 'semantic', category: 'routine', importance: 0.5 },

      // Behavioral traits
      { pattern: /(?:always|usually|often) (\w+ ?\w* ?\w*) when/gi, memoryType: 'long_term', category: 'behavior', importance: 0.7 },
      { pattern: /afraid of (\w+ ?\w*)/gi, memoryType: 'long_term', category: 'fear', importance: 0.8 },
      { pattern: /anxious (?:about|around|when) (\w+ ?\w*)/gi, memoryType: 'long_term', category: 'anxiety', importance: 0.8 },
    ];

    let stored = 0;

    for (const { pattern, memoryType, category, importance } of learningPatterns) {
      let match;
      while ((match = pattern.exec(userContent)) !== null) {
        const content = match[0].trim();
        const result = await this.storeMemory({
          userId,
          petId,
          memoryType,
          category,
          content,
          importance,
        });
        if (result) stored++;
      }
    }

    return stored;
  }
}
