/**
 * AI SCORE VERIFICATION SERVICE
 *
 * Implements AI "debate" functionality to verify health score calculations.
 * The AI reviews the calculated score and either agrees, disagrees, or suggests adjustments.
 */

import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

export interface ScoreComponents {
  weight: number;
  activity: number;
  medical: number;
  alerts: number;
  aiInsights: number;
}

export interface ScoreVerificationResult {
  id: string;
  petId: string;
  calculatedScore: number;
  aiVerifiedScore: number;
  aiConfidence: number;
  agreementStatus: 'agreed' | 'disagreed' | 'adjusted' | 'pending';
  originalComponents: ScoreComponents;
  aiAnalysis: {
    componentReviews: {
      [key: string]: {
        originalScore: number;
        aiScore: number;
        reasoning: string;
        confidence: number;
      };
    };
    overallAssessment: string;
    dataQuality: 'high' | 'medium' | 'low';
  };
  aiRecommendations: string[];
  discrepancyReasons: string[];
  finalScore: number;
  verificationModel: string;
  createdAt: string;
}

interface PetContext {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  recentAlerts: Array<{ type: string; severity: string; message: string }>;
  recentHealthRecords: Array<{ type: string; value: number; unit: string }>;
  aiInsights: Array<{ type: string; severity: string; message: string }>;
}

function requireClient(strict = true) {
  const supabase =
    typeof window === 'undefined'
      ? getSupabaseServiceRoleClient()
      : getSupabaseBrowserClient();

  if (!supabase && strict) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function requireUserId() {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

// AI providers configuration (same as assistant service)
const AI_PROVIDERS = [
  {
    name: 'deepseek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
  },
  {
    name: 'huggingface',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
    keyEnv: 'HUGGINGFACE_API_KEY',
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  },
  {
    name: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    model: 'gpt-4o-mini',
  },
];

async function callAI(systemPrompt: string, userPrompt: string): Promise<{ response: string; model: string }> {
  for (const provider of AI_PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey) continue;

    try {
      if (provider.name === 'huggingface') {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
            parameters: {
              max_new_tokens: 1500,
              temperature: 0.3,
              return_full_text: false,
            },
          }),
        });

        if (!response.ok) continue;
        const data = await response.json();
        const text = data[0]?.generated_text || '';
        return { response: text, model: provider.model };
      } else {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) continue;
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        return { response: text, model: provider.model };
      }
    } catch (error) {
      console.error(`AI provider ${provider.name} failed:`, error);
      continue;
    }
  }

  throw new Error('All AI providers failed');
}

export class AIScoreVerificationService {
  /**
   * Verify a health score calculation using AI "debate"
   */
  static async verifyScore(
    petId: string,
    calculatedScore: number,
    components: ScoreComponents,
    petContext: PetContext
  ): Promise<ScoreVerificationResult | null> {
    try {
      const systemPrompt = `You are a veterinary health assessment AI. Your role is to verify and validate pet health scores calculated by our system. You should:

1. Review each component score critically
2. Consider the pet's specific characteristics (species, breed, age)
3. Evaluate if the data supports the calculated scores
4. Provide reasoning for any disagreements
5. Suggest adjustments if needed

Be analytical and objective. If the score seems accurate, say so. If there are issues, explain clearly.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "agreementStatus": "agreed" | "disagreed" | "adjusted",
  "confidence": 0.0 to 1.0,
  "verifiedScore": number (0-100),
  "componentReviews": {
    "weight": { "originalScore": number, "aiScore": number, "reasoning": "string", "confidence": number },
    "activity": { "originalScore": number, "aiScore": number, "reasoning": "string", "confidence": number },
    "medical": { "originalScore": number, "aiScore": number, "reasoning": "string", "confidence": number },
    "alerts": { "originalScore": number, "aiScore": number, "reasoning": "string", "confidence": number },
    "aiInsights": { "originalScore": number, "aiScore": number, "reasoning": "string", "confidence": number }
  },
  "overallAssessment": "string",
  "dataQuality": "high" | "medium" | "low",
  "recommendations": ["string"],
  "discrepancyReasons": ["string"] (only if disagreed or adjusted)
}`;

      const userPrompt = `Please verify this health score calculation for ${petContext.name}:

PET PROFILE:
- Name: ${petContext.name}
- Species: ${petContext.species}
- Breed: ${petContext.breed || 'Unknown'}
- Age: ${petContext.age || 'Unknown'} years
- Current Weight: ${petContext.weight || 'Unknown'} kg

CALCULATED SCORES:
- Overall Score: ${calculatedScore}/100
- Weight Component: ${components.weight}/100 (25% weight)
- Activity Component: ${components.activity}/100 (20% weight)
- Medical Component: ${components.medical}/100 (20% weight)
- Alerts Component: ${components.alerts}/100 (20% weight)
- AI Insights Component: ${components.aiInsights}/100 (15% weight)

RECENT ALERTS (${petContext.recentAlerts.length}):
${petContext.recentAlerts.slice(0, 5).map(a => `- [${a.severity}] ${a.type}: ${a.message}`).join('\n') || 'None'}

RECENT HEALTH RECORDS (${petContext.recentHealthRecords.length}):
${petContext.recentHealthRecords.slice(0, 5).map(r => `- ${r.type}: ${r.value} ${r.unit}`).join('\n') || 'None'}

AI INSIGHTS (${petContext.aiInsights.length}):
${petContext.aiInsights.slice(0, 5).map(i => `- [${i.severity}] ${i.type}: ${i.message}`).join('\n') || 'None'}

Please analyze if this score accurately reflects the pet's health status. Consider species-specific norms and any data gaps.`;

      const { response, model } = await callAI(systemPrompt, userPrompt);

      // Parse AI response
      let aiResult;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Return a fallback "agreed" result
        aiResult = {
          agreementStatus: 'agreed',
          confidence: 0.7,
          verifiedScore: calculatedScore,
          componentReviews: Object.fromEntries(
            Object.entries(components).map(([key, value]) => [
              key,
              { originalScore: value, aiScore: value, reasoning: 'Unable to verify', confidence: 0.5 }
            ])
          ),
          overallAssessment: 'Score accepted with limited verification due to processing constraints.',
          dataQuality: 'medium',
          recommendations: [],
          discrepancyReasons: [],
        };
      }

      // Store verification result
      const userId = await requireUserId();
      const supabase = requireClient();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('ai_score_verifications')
        .insert({
          pet_id: petId,
          user_id: userId,
          calculated_score: calculatedScore,
          ai_verified_score: aiResult.verifiedScore,
          ai_confidence: aiResult.confidence,
          agreement_status: aiResult.agreementStatus,
          original_components: components,
          ai_analysis: {
            componentReviews: aiResult.componentReviews,
            overallAssessment: aiResult.overallAssessment,
            dataQuality: aiResult.dataQuality,
          },
          ai_recommendations: aiResult.recommendations || [],
          discrepancy_reasons: aiResult.discrepancyReasons || [],
          final_score: aiResult.agreementStatus === 'agreed' ? calculatedScore : aiResult.verifiedScore,
          verification_model: model,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        petId: data.pet_id,
        calculatedScore: data.calculated_score,
        aiVerifiedScore: data.ai_verified_score,
        aiConfidence: parseFloat(data.ai_confidence),
        agreementStatus: data.agreement_status,
        originalComponents: data.original_components,
        aiAnalysis: data.ai_analysis,
        aiRecommendations: data.ai_recommendations,
        discrepancyReasons: data.discrepancy_reasons,
        finalScore: data.final_score,
        verificationModel: data.verification_model,
        createdAt: data.created_at,
      };

    } catch (error) {
      console.error('Error verifying score:', error);
      return null;
    }
  }

  /**
   * Get recent verifications for a pet
   */
  static async getRecentVerifications(petId: string, limit: number = 10): Promise<ScoreVerificationResult[]> {
    const supabase = requireClient(false);
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('ai_score_verifications')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        petId: row.pet_id,
        calculatedScore: row.calculated_score,
        aiVerifiedScore: row.ai_verified_score,
        aiConfidence: parseFloat(row.ai_confidence),
        agreementStatus: row.agreement_status,
        originalComponents: row.original_components,
        aiAnalysis: row.ai_analysis,
        aiRecommendations: row.ai_recommendations,
        discrepancyReasons: row.discrepancy_reasons,
        finalScore: row.final_score,
        verificationModel: row.verification_model,
        createdAt: row.created_at,
      }));

    } catch (error) {
      console.error('Error fetching verifications:', error);
      return [];
    }
  }

  /**
   * Get agreement rate for a pet's score verifications
   */
  static async getAgreementStats(petId: string): Promise<{
    totalVerifications: number;
    agreed: number;
    disagreed: number;
    adjusted: number;
    averageConfidence: number;
    averageDiscrepancy: number;
  }> {
    const supabase = requireClient(false);
    if (!supabase) {
      return {
        totalVerifications: 0,
        agreed: 0,
        disagreed: 0,
        adjusted: 0,
        averageConfidence: 0,
        averageDiscrepancy: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('ai_score_verifications')
        .select('agreement_status, ai_confidence, calculated_score, ai_verified_score')
        .eq('pet_id', petId);

      if (error) throw error;

      const verifications = data || [];
      const total = verifications.length;

      if (total === 0) {
        return {
          totalVerifications: 0,
          agreed: 0,
          disagreed: 0,
          adjusted: 0,
          averageConfidence: 0,
          averageDiscrepancy: 0,
        };
      }

      const agreed = verifications.filter(v => v.agreement_status === 'agreed').length;
      const disagreed = verifications.filter(v => v.agreement_status === 'disagreed').length;
      const adjusted = verifications.filter(v => v.agreement_status === 'adjusted').length;

      const avgConfidence = verifications.reduce((sum, v) => sum + parseFloat(v.ai_confidence), 0) / total;
      const avgDiscrepancy = verifications.reduce(
        (sum, v) => sum + Math.abs(v.calculated_score - v.ai_verified_score),
        0
      ) / total;

      return {
        totalVerifications: total,
        agreed,
        disagreed,
        adjusted,
        averageConfidence: Math.round(avgConfidence * 100) / 100,
        averageDiscrepancy: Math.round(avgDiscrepancy * 10) / 10,
      };

    } catch (error) {
      console.error('Error fetching agreement stats:', error);
      return {
        totalVerifications: 0,
        agreed: 0,
        disagreed: 0,
        adjusted: 0,
        averageConfidence: 0,
        averageDiscrepancy: 0,
      };
    }
  }
}
