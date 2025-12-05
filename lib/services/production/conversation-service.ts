/**
 * CONVERSATION SERVICE
 *
 * Manages multiple chat conversations like a real AI assistant app.
 * Supports creating, listing, switching, renaming, and deleting conversations.
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface Conversation {
  id: string;
  userId: string;
  petId?: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  messageCount: number;
  lastMessageAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  petId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    petId: row.pet_id,
    title: row.title,
    description: row.description,
    status: row.status,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    petId: row.pet_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(petId?: string): Promise<Conversation[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (petId) {
    query = query.eq('pet_id', petId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  return (data || []).map(mapConversation);
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }

  return mapConversation(data);
}

/**
 * Create a new conversation
 */
export async function createConversation(
  title: string = 'New Chat',
  petId?: string
): Promise<Conversation | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      pet_id: petId,
      title,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  return mapConversation(data);
}

/**
 * Update conversation title or metadata
 */
export async function updateConversation(
  id: string,
  updates: { title?: string; description?: string; metadata?: Record<string, any> }
): Promise<Conversation | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('conversations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating conversation:', error);
    return null;
  }

  return mapConversation(data);
}

/**
 * Archive a conversation (soft delete)
 */
export async function archiveConversation(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('conversations')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error archiving conversation:', error);
    return false;
  }

  return true;
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  // First delete all messages in the conversation
  const { error: messagesError } = await supabase
    .from('assistant_messages')
    .delete()
    .eq('conversation_id', id);

  if (messagesError) {
    console.error('Error deleting conversation messages:', messagesError);
  }

  // Then delete the conversation
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }

  return true;
}

/**
 * Get messages for a specific conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('assistant_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversation messages:', error);
    return [];
  }

  return (data || []).map(mapMessage);
}

/**
 * Add a message to a conversation
 */
export async function addMessageToConversation(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  petId?: string,
  metadata?: Record<string, any>
): Promise<ConversationMessage | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('assistant_messages')
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      pet_id: petId,
      role,
      content,
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding message to conversation:', error);
    return null;
  }

  // Auto-update conversation title if this is the first user message
  const conversation = await getConversation(conversationId);
  if (conversation && conversation.messageCount <= 1 && role === 'user') {
    const title = content.length > 50 ? content.substring(0, 47) + '...' : content;
    await updateConversation(conversationId, { title });
  }

  return mapMessage(data);
}

/**
 * Clear all messages in a conversation (but keep the conversation)
 */
export async function clearConversationMessages(conversationId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error: messagesError } = await supabase
    .from('assistant_messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (messagesError) {
    console.error('Error clearing conversation messages:', messagesError);
    return false;
  }

  // Reset message count
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      message_count: 0,
      last_message_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (updateError) {
    console.error('Error resetting conversation:', updateError);
    return false;
  }

  return true;
}

/**
 * Get or create the default conversation for a pet
 */
export async function getOrCreateDefaultConversation(petId?: string): Promise<Conversation | null> {
  const conversations = await getConversations(petId);

  if (conversations.length > 0) {
    return conversations[0]; // Return most recent
  }

  // Create a new default conversation
  return createConversation('New Chat', petId);
}

/**
 * Search conversations by title or content
 */
export async function searchConversations(query: string): Promise<Conversation[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('status', 'active')
    .ilike('title', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error searching conversations:', error);
    return [];
  }

  return (data || []).map(mapConversation);
}
