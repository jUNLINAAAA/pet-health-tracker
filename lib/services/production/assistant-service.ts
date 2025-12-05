/**
 * PRODUCTION ASSISTANT SERVICE
 * Handles AI-powered pet health assistant interactions
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  petId?: string;
  createdAt: string;
}

export interface AssistantResponse {
  message: string;
  sources?: Array<{
    type: string;
    content: string;
    petName?: string;
  }>;
}

function requireClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function requireUserId(): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

/**
 * Get recent conversation messages
 */
export async function getMessages(petId?: string, limit: number = 20): Promise<AssistantMessage[]> {
  const supabase = requireClient();
  const userId = await requireUserId();

  let query = supabase
    .from('assistant_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (petId) {
    query = query.eq('pet_id', petId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assistant messages:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    petId: row.pet_id,
    createdAt: row.created_at,
  })).reverse(); // Reverse to get chronological order
}

/**
 * Save a message to the conversation history
 */
export async function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  petId?: string
): Promise<AssistantMessage> {
  const supabase = requireClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('assistant_messages')
    .insert({
      user_id: userId,
      pet_id: petId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving assistant message:', error);
    throw error;
  }

  return {
    id: data.id,
    role: data.role,
    content: data.content,
    petId: data.pet_id,
    createdAt: data.created_at,
  };
}

/**
 * Send a message to the AI assistant
 * This calls the local API route first, then Edge Function as fallback
 */
export async function sendMessage(
  message: string,
  petId?: string
): Promise<AssistantResponse> {
  const supabase = requireClient();
  const userId = await requireUserId();

  // Try local API route first (for development with HF_TOKEN in .env)
  try {
    const localResponse = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        petId,
        message,
      }),
    });

    if (localResponse.ok) {
      const data = await localResponse.json();
      return {
        message: data.message,
        sources: data.sources,
      };
    }
  } catch (localError) {
    console.warn('Local API failed, trying Edge Function:', localError);
  }

  // Fall back to Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('assistant-chat', {
      body: {
        userId,
        petId,
        message,
      },
    });

    if (!error && data?.message) {
      return {
        message: data.message,
        sources: data.sources,
      };
    }
  } catch (edgeError) {
    console.warn('Edge Function failed:', edgeError);
  }

  // Final fallback to local response generation
  const fallbackResponse = await generateLocalResponse(message, petId);
  await saveMessage('assistant', fallbackResponse.message, petId);
  return fallbackResponse;
}

/**
 * Generate a local response when Edge Function is unavailable
 * This provides basic functionality without OpenAI
 */
async function generateLocalResponse(
  message: string,
  petId?: string
): Promise<AssistantResponse> {
  const supabase = requireClient();
  const lowerMessage = message.toLowerCase();

  // Fetch pet data for context
  let petContext = '';
  if (petId) {
    const { data: pet } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (pet) {
      petContext = `For ${pet.name} (${pet.species}, ${pet.breed}): `;
    }
  }

  // Simple keyword-based responses
  if (lowerMessage.includes('weight') || lowerMessage.includes('diet')) {
    return {
      message: `${petContext}For weight management, I recommend regular monitoring and consulting with your veterinarian. A healthy weight varies by breed, age, and activity level. Consider tracking meals and exercise in the health records section.`,
    };
  }

  if (lowerMessage.includes('appointment') || lowerMessage.includes('vet')) {
    return {
      message: `${petContext}Regular veterinary checkups are important for preventive care. You can schedule appointments in the Appointments section. Most pets benefit from annual wellness exams, with more frequent visits for seniors or those with health conditions.`,
    };
  }

  if (lowerMessage.includes('alert') || lowerMessage.includes('concern')) {
    return {
      message: `${petContext}If you have health concerns, please check the Alerts section for any active notifications. For urgent issues, always consult your veterinarian directly. The health dashboard provides an overview of key metrics.`,
    };
  }

  if (lowerMessage.includes('activity') || lowerMessage.includes('exercise')) {
    return {
      message: `${petContext}Regular activity is essential for your pet's health. Dogs typically need 30-60+ minutes of daily exercise depending on breed. Cats benefit from interactive play sessions. Track activity in the health records to monitor trends.`,
    };
  }

  // Default response
  return {
    message: `${petContext}I'm here to help with your pet's health! You can ask me about weight management, activity recommendations, appointment scheduling, or general health concerns. For specific medical advice, please consult your veterinarian.`,
  };
}

/**
 * Clear conversation history
 */
export async function clearMessages(petId?: string): Promise<void> {
  const supabase = requireClient();
  const userId = await requireUserId();

  let query = supabase
    .from('assistant_messages')
    .delete()
    .eq('user_id', userId);

  if (petId) {
    query = query.eq('pet_id', petId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error clearing assistant messages:', error);
    throw error;
  }
}

/**
 * Generate embeddings for user's pet data (for RAG)
 * This should be called periodically to update context
 */
export async function updatePetEmbeddings(petId: string): Promise<void> {
  const supabase = requireClient();
  const userId = await requireUserId();

  // Fetch pet data
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', petId)
    .single();

  if (!pet) return;

  // Fetch related data
  const [
    { data: healthRecords },
    { data: alerts },
    { data: appointments },
  ] = await Promise.all([
    supabase.from('health_records').select('*').eq('pet_id', petId).order('recorded_at', { ascending: false }).limit(10),
    supabase.from('alerts').select('*').eq('pet_id', petId).eq('resolved', false),
    supabase.from('appointments').select('*').eq('pet_id', petId).order('date', { ascending: false }).limit(5),
  ]);

  // Create content summaries for embedding
  const contentItems = [
    {
      type: 'pet_profile',
      content: `Pet Profile: ${pet.name} is a ${pet.age} year old ${pet.breed} ${pet.species}. Current weight: ${pet.weight}kg.`,
    },
  ];

  if (healthRecords?.length) {
    contentItems.push({
      type: 'health_records',
      content: `Recent health records for ${pet.name}: ${healthRecords.map(r => `${r.type}: ${r.value} ${r.unit} on ${r.recorded_at}`).join('; ')}`,
    });
  }

  if (alerts?.length) {
    contentItems.push({
      type: 'alerts',
      content: `Active alerts for ${pet.name}: ${alerts.map(a => `${a.severity} - ${a.message}`).join('; ')}`,
    });
  }

  if (appointments?.length) {
    contentItems.push({
      type: 'appointments',
      content: `Appointments for ${pet.name}: ${appointments.map(a => `${a.title} on ${a.date} (${a.status})`).join('; ')}`,
    });
  }

  // Store embeddings (without actual vector - would need OpenAI call)
  // For now, just store the content for retrieval
  for (const item of contentItems) {
    const { error } = await supabase
      .from('assistant_embeddings')
      .upsert({
        user_id: userId,
        pet_id: petId,
        content: item.content,
        metadata: { type: item.type },
      }, {
        onConflict: 'user_id,pet_id',
      });

    if (error) {
      console.error('Error upserting embedding:', error);
    }
  }
}
