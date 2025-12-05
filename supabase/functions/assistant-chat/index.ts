import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  userId: string;
  petId?: string;
  message: string;
}

interface PetData {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, petId, message } = await req.json() as RequestBody;

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: "userId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch context data
    let petContext = "";
    let sources: Array<{ type: string; content: string; petName?: string }> = [];

    if (petId) {
      // Get specific pet data
      const { data: pet } = await supabase
        .from("pets")
        .select("*")
        .eq("id", petId)
        .eq("user_id", userId)
        .single();

      if (pet) {
        petContext = `You are helping with ${pet.name}, a ${pet.age} year old ${pet.breed} ${pet.species} weighing ${pet.weight}kg.`;
        sources.push({ type: "pet_profile", content: `${pet.name}'s profile`, petName: pet.name });

        // Get recent health records
        const { data: records } = await supabase
          .from("health_records")
          .select("*")
          .eq("pet_id", petId)
          .order("recorded_at", { ascending: false })
          .limit(5);

        if (records?.length) {
          petContext += ` Recent health records: ${records.map(r => `${r.type}: ${r.value}${r.unit}`).join(", ")}.`;
          sources.push({ type: "health_records", content: "Recent health records", petName: pet.name });
        }

        // Get active alerts
        const { data: alerts } = await supabase
          .from("alerts")
          .select("*")
          .eq("pet_id", petId)
          .eq("resolved", false);

        if (alerts?.length) {
          petContext += ` Active alerts: ${alerts.map(a => `${a.severity}: ${a.message}`).join("; ")}.`;
          sources.push({ type: "alerts", content: "Active health alerts", petName: pet.name });
        }

        // Get health score
        const { data: scores } = await supabase
          .from("health_scores")
          .select("*")
          .eq("pet_id", petId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (scores?.length) {
          const score = scores[0];
          petContext += ` Current health score: ${score.score}/100 (components: ${JSON.stringify(score.components)}).`;
          sources.push({ type: "health_score", content: "Current health score", petName: pet.name });
        }
      }
    } else {
      // Get all user's pets for general queries
      const { data: pets } = await supabase
        .from("pets")
        .select("*")
        .eq("user_id", userId);

      if (pets?.length) {
        petContext = `User has ${pets.length} pets: ${pets.map((p: PetData) => `${p.name} (${p.species})`).join(", ")}.`;
      }
    }

    // Build system prompt
    const systemPrompt = `You are a helpful pet health assistant. You provide general advice about pet care, diet, exercise, and wellness. ${petContext}

Important guidelines:
- Always recommend consulting a veterinarian for medical concerns
- Be supportive and encouraging
- Provide specific, actionable advice when possible
- If discussing weight, reference breed-specific healthy ranges
- Keep responses concise but informative`;

    let responseMessage: string;

    // Try OpenAI if key is available
    if (openaiKey) {
      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        const aiData = await openaiResponse.json();
        responseMessage = aiData.choices?.[0]?.message?.content || generateFallbackResponse(message, petContext);
      } catch (aiError) {
        console.error("OpenAI error:", aiError);
        responseMessage = generateFallbackResponse(message, petContext);
      }
    } else {
      // No OpenAI key - use rule-based response
      responseMessage = generateFallbackResponse(message, petContext);
    }

    // Store the conversation
    await supabase.from("assistant_messages").insert([
      { user_id: userId, pet_id: petId, role: "user", content: message },
      { user_id: userId, pet_id: petId, role: "assistant", content: responseMessage },
    ]);

    return new Response(
      JSON.stringify({
        message: responseMessage,
        sources: sources.length > 0 ? sources : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackResponse(message: string, context: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("weight") || lowerMessage.includes("diet")) {
    return `For weight management, I recommend regular monitoring and consulting with your veterinarian. ${context ? "Based on the data I have, " : ""}a healthy weight varies by breed, age, and activity level. Consider tracking meals and exercise to identify patterns. Would you like specific guidance?`;
  }

  if (lowerMessage.includes("appointment") || lowerMessage.includes("vet")) {
    return `Regular veterinary checkups are essential for preventive care. Most pets benefit from annual wellness exams, with more frequent visits for seniors or those with health conditions. ${context ? "I can see the pet's appointment history. " : ""}Is there a specific concern you'd like to address at your next visit?`;
  }

  if (lowerMessage.includes("alert") || lowerMessage.includes("concern") || lowerMessage.includes("worry")) {
    return `I understand your concern. ${context ? "I can see there are some active alerts to monitor. " : ""}For any health concerns, it's always best to consult with your veterinarian, especially for sudden changes in behavior, appetite, or energy levels. What specific symptoms are you noticing?`;
  }

  if (lowerMessage.includes("activity") || lowerMessage.includes("exercise")) {
    return `Regular activity is essential for your pet's physical and mental health. Dogs typically need 30-60+ minutes of daily exercise depending on breed and age. Cats benefit from interactive play sessions. ${context ? "Based on the activity records, " : ""}consistency is key. Would you like breed-specific recommendations?`;
  }

  if (lowerMessage.includes("food") || lowerMessage.includes("nutrition") || lowerMessage.includes("eat")) {
    return `Proper nutrition is fundamental to pet health. The ideal diet depends on age, breed, activity level, and any health conditions. ${context ? "Given the health data available, " : ""}I'd recommend consulting your vet for personalized dietary advice. Are you considering any diet changes?`;
  }

  return `I'm here to help with your pet's health and wellness! ${context ? "I have access to health records, alerts, and scores for your pets. " : ""}You can ask me about weight management, activity recommendations, appointment scheduling, nutrition, or general health concerns. For specific medical advice, please consult your veterinarian.`;
}
