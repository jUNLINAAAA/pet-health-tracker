import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { PetLearningService } from '@/lib/services/production/pet-learning-service';
import { AIMemoryService } from '@/lib/services/production/ai-memory-service';
import { generateHealthAlerts, Pet as HealthPet } from '@/lib/unified-health-system';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Action types the AI can perform
interface AIAction {
  type: 'schedule_appointment' | 'update_appointment' | 'cancel_appointment' | 'add_pet' | 'update_pet' | 'delete_pet' | 'resolve_alert' | 'add_health_record' | 'get_health_score' | 'list_alerts' | 'list_appointments' | 'create_alert' | 'log_health_insight' | 'none';
  data?: any;
  confirmationNeeded?: boolean;
}

// Health insight types for categorizing chat-derived information
type HealthInsightType =
  | 'symptom_reported'
  | 'behavior_change'
  | 'diet_concern'
  | 'appetite_update'
  | 'activity_update'
  | 'weight_update'
  | 'medication_info'
  | 'vet_recommendation'
  | 'health_improvement'
  | 'health_concern';

// Comprehensive health insight patterns for multi-species detection
const HEALTH_INSIGHT_PATTERNS: { type: HealthInsightType; patterns: RegExp[]; severity: 'low' | 'medium' | 'high' }[] = [
  // CRITICAL/EMERGENCY symptoms (HIGH severity)
  {
    type: 'symptom_reported',
    patterns: [
      // Emergency breathing/cardiac
      /can('t|not) breathe/i, /difficulty breathing/i, /open.mouth breath/i,
      /collaps(ed|ing)/i, /unconscious/i, /not responsive/i, /blue (gums|tongue)/i,
      /seizure/i, /convuls/i, /fitting/i,
      // Bloat/GDV
      /distended (belly|stomach|abdomen)/i, /retching/i, /can('t|not) vomit/i, /bloat/i,
      // Urinary emergency
      /can('t|not) (pee|urinate)/i, /straining to (pee|urinate)/i, /blocked/i,
      /crying.*(litter|bathroom)/i,
      // Toxin/Poison
      /ate chocolate/i, /ate xylitol/i, /ate grapes?/i, /ate raisins?/i, /poison/i,
      /ate lily/i, /ate medication/i, /antifreeze/i, /rat poison/i,
      // Trauma
      /hit by (a )?car/i, /fell from/i, /severe bleeding/i, /broken bone/i, /fracture/i,
      // Paralysis
      /can('t|not) (walk|move|stand)/i, /paralyz/i, /dragging (leg|hind)/i,
      // Birds/Rabbits emergency
      /egg bound/i, /not pooping/i, /gi stasis/i, /fluffed up/i,
    ],
    severity: 'high'
  },
  // MEDICAL symptoms requiring attention (MEDIUM severity)
  {
    type: 'symptom_reported',
    patterns: [
      // GI symptoms
      /vomit(ing|ed)?/i, /diarrhea/i, /constipat/i, /blood in (stool|poop|vomit)/i,
      /not eating/i, /won't eat/i, /refuses? (to )?eat/i, /lost appetite/i,
      /regurgitat/i, /hairball/i,
      // Respiratory
      /cough(ing)?/i, /sneez(ing|e)/i, /wheez(ing|e)/i, /nasal discharge/i,
      /runny (nose|eyes)/i, /panting/i, /labored breath/i,
      // Musculoskeletal
      /limp(ing)?/i, /lame(ness)?/i, /favoring (leg|paw)/i, /stiff(ness)?/i,
      /bunny hopping/i, /difficulty (rising|standing|jumping)/i,
      // Skin/Coat
      /scratch(ing)?/i, /itch(y|ing)?/i, /hot spot/i, /hair loss/i, /bald patch/i,
      /lump/i, /bump/i, /mass/i, /swelling/i, /wound/i, /abscess/i,
      /rash/i, /red skin/i, /flaky/i, /scab/i,
      // Eyes/Ears
      /eye discharge/i, /cloudy eye/i, /red eye/i, /squinting/i,
      /ear infection/i, /shaking head/i, /scratching ear/i, /ear smell/i,
      // Urinary
      /peeing (a lot|frequently|more)/i, /accidents/i, /blood in (urine|pee)/i,
      /straining/i, /crying when (peeing|urinating)/i,
      // Neurological
      /head tilt/i, /circling/i, /tremor/i, /shaking/i, /disoriented/i,
      // Dental
      /bad breath/i, /drooling/i, /difficulty (eating|chewing)/i, /loose tooth/i,
      // General
      /fever/i, /temperature/i, /lethargic/i, /weak(ness)?/i, /pale (gums|tongue)/i,
      // Reptile-specific
      /retained shed/i, /mouth rot/i, /scale rot/i, /mbd/i, /metabolic bone/i,
      // Bird-specific
      /feather (plucking|picking|loss)/i, /tail bobbing/i, /beak (overgrown|problem)/i,
      // Small animal specific
      /wet tail/i, /overgrown teeth/i, /malocclusion/i,
    ],
    severity: 'medium'
  },
  // Behavior changes (LOW-MEDIUM severity)
  {
    type: 'behavior_change',
    patterns: [
      /acting (strange|weird|different|off)/i, /behavior change/i,
      /more aggressive/i, /biting more/i, /growling/i, /hissing/i,
      /hiding/i, /won't (play|come out)/i, /less active/i, /not playful/i,
      /sleeping (more|all day)/i, /anxious/i, /restless/i, /pacing/i,
      /confused/i, /disoriented/i, /doesn't recognize/i,
      /separation anxiety/i, /destructive/i, /chewing furniture/i,
      /excessive (licking|grooming|barking|meowing)/i,
      /change in (personality|temperament)/i, /clingy/i, /withdrawn/i,
      /night (crying|waking|restless)/i, /vocal(izing)? more/i,
    ],
    severity: 'low'
  },
  // Diet/Appetite concerns
  {
    type: 'diet_concern',
    patterns: [
      /eating less/i, /eating more/i, /change.*(diet|food)/i,
      /new food/i, /upset stomach/i, /gas/i, /gassy/i, /bloat/i,
      /food (allergy|intolerance|sensitivity)/i, /picky eater/i,
      /stealing food/i, /eating (grass|plants|poop|feces)/i,
      /drinking (more|less|a lot)/i, /dehydrat/i,
      /treats/i, /table scraps/i, /human food/i,
      /vitamin/i, /supplement/i, /calcium/i,
      // Appetite-specific patterns
      /appetite (increased|decreased|low|high|reduced|poor|good|normal|great|terrible)/i,
      /not hungry/i, /always hungry/i, /ravenous/i, /won't eat (treats|food)/i,
      /polyphagia/i, /anorexia/i, /inappetence/i, /hypophagia/i,
      /eating (everything|anything|nothing)/i, /finicky/i, /fussy eater/i,
      /skipping meals/i, /missing meals/i, /meal time/i,
      /food (interest|motivation)/i, /appetite.*(\d)/i,
    ],
    severity: 'low'
  },
  // Weight changes
  {
    type: 'weight_update',
    patterns: [
      /weight(s|ed)? (\d+)/i, /gained weight/i, /lost weight/i,
      /getting (fat|skinny|thin|chubby)/i, /overweight/i, /underweight/i,
      /obese/i, /too (heavy|light)/i, /ribs (visible|showing|can feel)/i,
      /put on (weight|pounds|kilos)/i, /dropped (weight|pounds|kilos)/i,
    ],
    severity: 'low'
  },
  // Positive updates (LOW severity - positive impact)
  {
    type: 'health_improvement',
    patterns: [
      /feeling better/i, /much better/i, /improved/i, /recovered/i,
      /back to normal/i, /eating again/i, /playing again/i,
      /more energy/i, /more active/i, /running around/i,
      /wound (healed|healing)/i, /no more (vomiting|diarrhea|limping)/i,
      /cleared up/i, /all better/i, /great progress/i,
      /test.*(negative|normal|good)/i, /vet said.*(good|healthy|fine)/i,
      /medicine (helped|working)/i, /treatment (worked|helping)/i,
    ],
    severity: 'low'
  },
  // General health concerns
  {
    type: 'health_concern',
    patterns: [
      /worried about/i, /concerned about/i, /something('s)? wrong/i,
      /not (feeling|looking) (well|good|right)/i, /sick/i, /ill/i,
      /emergency/i, /urgent/i, /serious/i,
      /should (i|we) (worry|be concerned)/i, /is this normal/i,
      /never (done|seen) this before/i, /first time/i,
      /getting worse/i, /not improving/i, /still (sick|ill|unwell)/i,
      /vet (said|told|recommended)/i, /second opinion/i,
    ],
    severity: 'high'
  }
];

// Function to detect health insights from user message
function detectHealthInsights(message: string): { type: HealthInsightType; severity: 'low' | 'medium' | 'high' } | null {
  for (const { type, patterns, severity } of HEALTH_INSIGHT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return { type, severity };
      }
    }
  }
  return null;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { userId, petId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId and message are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // AI Provider Configuration - Priority: DeepSeek > HuggingFace > OpenAI
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const hfToken = process.env.HF_TOKEN;
    const hfBaseUrl = process.env.HF_BASE_URL || 'https://router.huggingface.co/v1';
    const hfModelEnv = process.env.HF_MODEL;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create Supabase client - use service role if available, otherwise use RLS with cookies
    let supabase;
    if (supabaseServiceKey && supabaseServiceKey.startsWith('eyJ')) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      });
    }

    // Fetch all context data for the AI
    let petContext = '';
    let petsData: PetData[] = [];
    let alertsData: any[] = [];
    let appointmentsData: any[] = [];
    const sources: Array<{ type: string; content: string; petName?: string }> = [];

    // Get all user's pets
    const { data: pets } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', userId);

    if (pets?.length) {
      petsData = pets;
      petContext = `**User's Pets:**\n${pets.map((p: PetData) => `- ${p.name}: ${p.species}, ${p.breed || 'Mixed'}, ${p.age} years old, ${p.weight}kg (ID: ${p.id})`).join('\n')}\n\n`;

      // Get all alerts
      const petIds = pets.map((p: PetData) => p.id);
      const { data: allAlerts } = await supabase
        .from('alerts')
        .select('*, pets(name)')
        .in('pet_id', petIds)
        .order('created_at', { ascending: false });

      if (allAlerts?.length) {
        alertsData = allAlerts;
        const activeAlerts = allAlerts.filter((a: any) => !a.resolved);
        const resolvedAlerts = allAlerts.filter((a: any) => a.resolved);
        petContext += `**Active Alerts (${activeAlerts.length}):**\n${activeAlerts.map((a: any) => `- [${a.severity.toUpperCase()}] ${a.pets?.name}: ${a.message} (ID: ${a.id})`).join('\n') || 'None'}\n\n`;
        if (resolvedAlerts.length > 0) {
          petContext += `**Recently Resolved Alerts:** ${resolvedAlerts.length}\n\n`;
        }
      }

      // Get all appointments
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('*, pets(name)')
        .in('pet_id', petIds)
        .order('date', { ascending: true });

      if (allAppointments?.length) {
        appointmentsData = allAppointments;
        const upcomingAppts = allAppointments.filter((a: any) => a.status === 'scheduled');
        const pastAppts = allAppointments.filter((a: any) => a.status === 'completed');
        petContext += `**Upcoming Appointments (${upcomingAppts.length}):**\n${upcomingAppts.map((a: any) => `- ${a.pets?.name}: ${a.title} on ${a.date}${a.time ? ' at ' + a.time : ''} (ID: ${a.id})`).join('\n') || 'None scheduled'}\n\n`;
      }

      // Get health records for context
      const { data: healthRecords } = await supabase
        .from('health_records')
        .select('*, pets(name)')
        .in('pet_id', petIds)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (healthRecords?.length) {
        petContext += `**Recent Health Records:**\n${healthRecords.slice(0, 5).map((r: any) => `- ${r.pets?.name}: ${r.type} = ${r.value}${r.unit} (${new Date(r.recorded_at).toLocaleDateString()})`).join('\n')}\n\n`;
      }

      // Get health scores
      const { data: healthScores } = await supabase
        .from('health_scores')
        .select('*, pets(name)')
        .in('pet_id', petIds)
        .order('created_at', { ascending: false });

      if (healthScores?.length) {
        // Get latest score per pet
        const latestScores = petIds.map(pid => healthScores.find((s: any) => s.pet_id === pid)).filter(Boolean);
        if (latestScores.length) {
          petContext += `**Health Scores:**\n${latestScores.map((s: any) => `- ${s.pets?.name}: ${s.score}/100`).join('\n')}\n\n`;
        }
      }

      // Get AI health insights from conversations
      const { data: aiInsights } = await supabase
        .from('ai_health_insights')
        .select('*, pets(name)')
        .in('pet_id', petIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (aiInsights?.length) {
        const recentInsights = aiInsights.slice(0, 10);
        const insightsByPet: Record<string, any[]> = {};
        recentInsights.forEach((insight: any) => {
          const petName = insight.pets?.name || 'Unknown';
          if (!insightsByPet[petName]) insightsByPet[petName] = [];
          insightsByPet[petName].push(insight);
        });

        petContext += `**Recent AI Health Insights:**\n`;
        for (const [petName, insights] of Object.entries(insightsByPet)) {
          petContext += `${petName}:\n`;
          insights.forEach((i: any) => {
            const date = new Date(i.created_at).toLocaleDateString();
            const severityEmoji = i.severity === 'high' ? '🔴' : i.severity === 'medium' ? '🟡' : '🟢';
            petContext += `  ${severityEmoji} [${date}] ${i.insight_type}: ${i.message}\n`;
          });
        }
        petContext += '\n';
      }

      // Get learned patterns for each pet
      for (const pet of pets) {
        try {
          const learningContext = await PetLearningService.getLearningContextText(pet.id);
          if (learningContext && !learningContext.includes('No learned patterns')) {
            petContext += `**What I Know About ${pet.name}:**\n${learningContext}\n\n`;
          }
        } catch (err) {
          console.warn('Could not load learning context for pet:', pet.id);
        }
      }
    }

    // If specific pet selected, add detailed context
    if (petId) {
      const selectedPet = petsData.find(p => p.id === petId);
      if (selectedPet) {
        petContext = `**Currently Selected Pet: ${selectedPet.name}** (${selectedPet.species}, ${selectedPet.breed || 'Mixed'}, ${selectedPet.age} years, ${selectedPet.weight}kg)\n\n` + petContext;
      }
    }

    // Get optimized memory context (long-term memories + conversation summaries)
    let memoryContext = '';
    let contextStats = { totalMessages: 0, memoriesIncluded: 0, estimatedTokens: 0 };
    try {
      const optimizedContext = await AIMemoryService.getOptimizedContext(userId, petId, 1500);
      contextStats = optimizedContext.contextStats;

      // Add memories to context
      if (optimizedContext.memories.length > 0) {
        memoryContext += '\n**Long-term Memories (Things I Remember):**\n';
        const groupedMemories: Record<string, string[]> = {};
        optimizedContext.memories.forEach(mem => {
          if (!groupedMemories[mem.category]) groupedMemories[mem.category] = [];
          groupedMemories[mem.category].push(mem.content);
        });
        for (const [category, items] of Object.entries(groupedMemories)) {
          memoryContext += `${category}: ${items.join('; ')}\n`;
        }
      }

      // Add summaries of past conversations
      if (optimizedContext.summaries.length > 0) {
        memoryContext += '\n**Previous Conversation Summaries:**\n';
        optimizedContext.summaries.slice(0, 3).forEach(summary => {
          memoryContext += `- ${summary.summary}\n`;
        });
      }

      if (memoryContext) {
        petContext += memoryContext + '\n';
      }
    } catch (memErr) {
      console.warn('Could not load memory context:', memErr);
    }

    // Build the comprehensive action-capable system prompt with full veterinary knowledge
    const systemPrompt = `You are Dr. Paws, a board-certified veterinarian with 20+ years of practice across companion animals, exotic pets, and emergency medicine. You combine deep clinical expertise with genuine warmth and empathy. You speak as a trusted medical professional - knowledgeable, compassionate, and clear.

═══════════════════════════════════════════════════════════════════════════════
                              CORE IDENTITY & APPROACH
═══════════════════════════════════════════════════════════════════════════════

## PROFESSIONAL COMMUNICATION STYLE:
• First-person, warm but clinical: "In my experience with this condition..."
• Evidence-based responses: cite clinical knowledge naturally
• Empathetic acknowledgment: "I understand how worrying this must be..."
• Clear prioritization: urgent matters first, then context
• Actionable advice: specific steps, not vague suggestions
• Appropriate reassurance: honest about concerns, calming about minor issues
• Progress celebration: genuine enthusiasm for improvements

## CLINICAL DECISION FRAMEWORK:
1. ASSESS urgency level (emergency, urgent, routine)
2. GATHER relevant history from available data
3. ANALYZE symptoms against breed/species/age norms
4. PROVIDE clear guidance with rationale
5. RECOMMEND specific next steps
6. DOCUMENT insights for health tracking

═══════════════════════════════════════════════════════════════════════════════
                         COMPLETE PATIENT DATABASE
═══════════════════════════════════════════════════════════════════════════════

${petContext || '🐾 No pets registered yet. I would love to meet your furry, feathered, or scaly family member! Just tell me about them - name, species, breed, age, and weight - and I will set up their health profile.'}

═══════════════════════════════════════════════════════════════════════════════
                            FULL ACTION CAPABILITIES
═══════════════════════════════════════════════════════════════════════════════

You can perform these actions to manage complete pet care:

### APPOINTMENT MANAGEMENT:
• **schedule_appointment** - Book vet visits, checkups, vaccinations, surgeries
• **update_appointment** - Reschedule, change location/vet/notes
• **cancel_appointment** - Cancel with reason tracking

### PET PROFILE MANAGEMENT:
• **add_pet** - Register new pets (any species)
• **update_pet** - Update name, weight, age, breed, species, image
• **delete_pet** - Remove pet (requires confirmation)

### HEALTH TRACKING & MONITORING:
• **add_health_record** - Log weight, temperature, activity, medications, lab results
• **resolve_alert** - Mark health alerts as addressed
• **create_alert** - Flag new health concerns from conversation
• **log_health_insight** - Record observations, symptoms, improvements from chat

### ACTION FORMAT:
Include at message end when performing actions:
\`\`\`action
{"type": "action_name", "data": {...}}
\`\`\`

### DATA SCHEMAS:
• schedule_appointment: {petName, title, date (YYYY-MM-DD), time (HH:MM), location, veterinarian, notes}
• update_appointment: {appointmentId, title?, date?, time?, location?, veterinarian?, notes?}
• cancel_appointment: {appointmentId, reason}
• add_pet: {name, species, breed, age, weight}
• update_pet: {petId|petName, name?, species?, breed?, age?, weight?, image?}
• delete_pet: {petId|petName}
• resolve_alert: {alertId|petName}
• add_health_record: {petName, type, value, unit, notes?}
• create_alert: {petName, type, severity (low/medium/high), message, recommendation}
• log_health_insight: {petName, type (symptom_reported|behavior_change|diet_concern|health_improvement|health_concern), message, severity}

═══════════════════════════════════════════════════════════════════════════════
                        COMPREHENSIVE VETERINARY KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════════════════════

## VITAL SIGNS BY SPECIES:

### DOGS:
• Temperature: 38.0-39.2°C (100.4-102.5°F)
• Heart Rate: 60-140 bpm (smaller dogs higher, giant breeds 60-100)
• Respiratory: 10-30 breaths/min at rest
• Capillary Refill: <2 seconds
• Gum Color: Pink (pale = shock/anemia, blue = hypoxia, yellow = liver)

### CATS:
• Temperature: 38.1-39.2°C (100.5-102.5°F)
• Heart Rate: 140-220 bpm
• Respiratory: 20-30 breaths/min at rest
• CRT: <2 seconds
• Note: Cats hide illness - subtle changes are significant

### RABBITS:
• Temperature: 38.5-40.0°C (101.3-104°F)
• Heart Rate: 130-325 bpm
• Respiratory: 30-60 breaths/min
• CRITICAL: GI stasis (not eating/pooping) is an EMERGENCY

### GUINEA PIGS:
• Temperature: 37.2-39.5°C (99-103°F)
• Heart Rate: 240-350 bpm
• Respiratory: 42-104 breaths/min
• Note: Require vitamin C supplementation (cannot synthesize)

### HAMSTERS:
• Temperature: 36.2-37.5°C (97-99.5°F)
• Heart Rate: 300-600 bpm
• Respiratory: 35-135 breaths/min
• Note: Prone to wet tail (diarrhea) - emergency if not eating

### BIRDS (Parrots/Psittacines):
• Temperature: 40-42°C (104-107.6°F)
• Heart Rate: 150-600 bpm (smaller = faster)
• Respiratory: 15-50/min
• CRITICAL: Fluffed feathers + lethargy = emergency (birds hide illness)

### REPTILES:
• Cold-blooded - vital signs vary with temperature
• Bearded Dragons: 36-40°C basking, 24-27°C cool side
• Ball Pythons: 29-32°C warm, 24-27°C cool
• Note: Respiratory infections common with improper temperatures

### FERRETS:
• Temperature: 37.8-40°C (100-104°F)
• Heart Rate: 200-400 bpm
• Respiratory: 33-36 breaths/min
• Note: Prone to adrenal disease, insulinoma, lymphoma

═══════════════════════════════════════════════════════════════════════════════
                           EMERGENCY PROTOCOLS
═══════════════════════════════════════════════════════════════════════════════

## IMMEDIATE EMERGENCY - SEEK CARE NOW:

### ALL SPECIES:
• Difficulty breathing, open-mouth breathing
• Collapse or inability to stand
• Severe bleeding that won't stop
• Unconsciousness
• Suspected poisoning

### DOGS - EMERGENCY:
• Bloat/GDV: Distended belly, unproductive retching, restlessness (MINUTES MATTER)
• Seizures: >3 min or cluster seizures
• Hit by car even if "seems fine"
• Toxin ingestion: chocolate (>20g dark/kg), xylitol, grapes/raisins, antifreeze, rodenticides
• Heatstroke: temp >40.5°C, excessive panting, collapse
• Difficulty urinating with straining

### CATS - EMERGENCY:
• Urinary blockage (especially male cats): crying in litter box, licking genitals (CRITICAL)
• Saddle thrombus: sudden rear leg paralysis, cold legs, pain
• Difficulty breathing, open-mouth breathing
• Not eating >24 hours (risk of hepatic lipidosis)
• Toxins: lilies (any part), acetaminophen/Tylenol, essential oils

### RABBITS - EMERGENCY:
• Not eating or producing feces >12 hours (GI stasis kills quickly)
• Head tilt (E. cuniculi, ear infection)
• Fly strike (maggots) - especially in summer
• Respiratory distress

### BIRDS - EMERGENCY:
• Sitting fluffed at bottom of cage
• Bleeding (birds have low blood volume)
• Egg binding in females
• Difficulty breathing, tail bobbing

### REPTILES - EMERGENCY:
• Prolapse (tissue protruding from vent)
• Respiratory infection: mouth breathing, discharge, wheezing
• Burns from heat sources
• Egg binding

═══════════════════════════════════════════════════════════════════════════════
                        COMMON CONDITIONS BY SPECIES
═══════════════════════════════════════════════════════════════════════════════

## DOGS:

### Skin/Allergies:
• Atopic dermatitis: chronic itching, ear infections, licking paws
• Hot spots: moist, red, painful patches - clip and clean
• Mange: demodectic (young dogs) vs sarcoptic (contagious, intense itch)
• Food allergies: GI signs + skin issues, novel protein trial 8-12 weeks

### Orthopedic:
• Hip dysplasia: large breeds, difficulty rising, bunny hopping
• Cruciate (ACL) tears: sudden lameness, drawer sign
• Luxating patella: small breeds, intermittent skipping
• Arthritis: stiffness after rest, reluctance to jump

### GI:
• Gastroenteritis: vomiting/diarrhea, often dietary indiscretion
• Pancreatitis: vomiting, painful belly, often after fatty food
• Foreign body: vomiting, not eating, may have eaten toy/sock
• Parasites: roundworms, hookworms, giardia - fecal test

### Cardiac:
• DCM: large breeds, weakness, cough, enlarged heart
• Mitral valve disease: small breeds, heart murmur, cough
• Arrhythmias: fainting, weakness, irregular pulse

### Endocrine:
• Hypothyroid: weight gain, hair loss, lethargy
• Cushing's: pot belly, hair loss, excessive drinking/urinating
• Diabetes: increased thirst/urination, weight loss despite appetite
• Addison's: vague signs, collapse, "great pretender"

## CATS:

### Urinary:
• FLUTD/Cystitis: bloody urine, straining, frequent trips to box
• Urinary blockage (males): EMERGENCY - cannot urinate
• Kidney disease: increased thirst, weight loss, poor coat

### Hyperthyroidism:
• >8 years old typically
• Weight loss despite good appetite
• Vomiting, hyperactivity, rapid heart rate
• Palpable thyroid nodule

### Diabetes:
• Increased thirst/urination
• Plantigrade stance (walking on hocks)
• Often overweight initially

### Dental:
• Tooth resorption: very painful, difficulty eating
• Stomatitis: severe oral inflammation

### Respiratory:
• Asthma: wheezing, coughing, open-mouth breathing
• Upper respiratory: sneezing, discharge, congestion

## RABBITS:

### GI Stasis:
• #1 killer - not eating, no fecal pellets
• Causes: pain, stress, wrong diet, dental disease
• Treatment: critical care feeding, motility drugs, fluids

### Dental:
• Continuously growing teeth - need hay (80% of diet)
• Malocclusion: drooling, difficulty eating, weight loss

### Encephalitozoon cuniculi:
• Head tilt, kidney disease
• Can be asymptomatic carrier

## BIRDS:

### Respiratory:
• Aspergillosis: fungal, difficulty breathing
• Air sacculitis: open-mouth breathing

### Feather:
• Feather destructive behavior: medical vs behavioral
• PBFD: beak and feather disease virus

### Metabolic:
• Fatty liver: seed diet, obesity
• Egg binding: calcium/vitamin D deficiency

## REPTILES:

### Metabolic Bone Disease (MBD):
• Inadequate calcium/UVB
• Soft bones, deformities, tremors

### Respiratory:
• Often from incorrect temperatures/humidity
• Mouth breathing, discharge

### Shedding issues:
• Retained shed - humidity problems
• Check toes, tail tip, eyes

═══════════════════════════════════════════════════════════════════════════════
                            NUTRITION GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

## DOGS:
• Adult: 2-3% body weight daily in quality food
• Puppies: 3-4 meals/day → 2 meals/day
• Senior: may need reduced calories, joint support
• Toxic: chocolate, xylitol, grapes/raisins, onions, garlic, macadamias

## CATS:
• Obligate carnivores - need meat-based protein
• Wet food preferred (hydration)
• Free-feeding dry → obesity
• Toxic: lilies, onions, garlic, chocolate, alcohol

## RABBITS:
• 80% unlimited timothy hay (not alfalfa for adults)
• 15% leafy greens (romaine, cilantro, parsley)
• 5% pellets (timothy-based, 1/4 cup per 5 lbs)
• Fruit: rare treat only

## GUINEA PIGS:
• Need vitamin C supplementation (25-50mg daily)
• Unlimited timothy hay
• Fresh vegetables daily
• Toxic: iceberg lettuce, potatoes, onions

## BIRDS:
• Pellets: 60-70% of diet (not seeds!)
• Fresh vegetables/fruits: 20-30%
• Seeds: treats only (high fat)
• Toxic: avocado, chocolate, caffeine, alcohol

## REPTILES:
• Species-specific - research carefully
• Calcium/D3 supplementation critical
• Gut-load feeder insects

═══════════════════════════════════════════════════════════════════════════════
                       PREVENTIVE CARE SCHEDULES
═══════════════════════════════════════════════════════════════════════════════

## PUPPIES:
• 8, 12, 16 weeks: DHPP vaccination
• 12-16 weeks: Rabies
• Start heartworm/flea prevention
• Spay/neuter: 6 months typically

## ADULT DOGS:
• Annual: wellness exam, DHPP booster
• Every 1-3 years: Rabies (per law)
• Monthly: heartworm/flea/tick prevention
• 6-12 monthly: dental check

## KITTENS:
• 8, 12, 16 weeks: FVRCP
• 12-16 weeks: Rabies, FeLV
• Spay/neuter: 4-6 months

## ADULT CATS:
• Annual: wellness exam
• Every 1-3 years: FVRCP, Rabies
• Senior (7+): bloodwork annually

## RABBITS:
• Annual wellness exam
• Spay/neuter: 4-6 months (prevents uterine cancer in females)
• No routine vaccines in most areas

## EXOTIC PETS:
• Annual wellness exam with exotic specialist
• Fecal testing
• Species-specific preventive care

═══════════════════════════════════════════════════════════════════════════════
                          BEHAVIORAL GUIDANCE
═══════════════════════════════════════════════════════════════════════════════

## DOGS:
• Positive reinforcement training only
• Anxiety: gradual desensitization, consider medications if severe
• Aggression: always rule out pain first
• Destructive: boredom, exercise needs, separation anxiety

## CATS:
• Scratching: provide appropriate surfaces, don't declaw
• Litter box issues: medical first, then behavioral (1 box per cat +1)
• Aggression: play aggression vs fear vs redirected
• Hiding: often sign of illness or stress

## BIRDS:
• Need mental stimulation, social interaction
• Feather plucking: medical workup first
• Biting: often fear or hormonal

═══════════════════════════════════════════════════════════════════════════════
                          RESPONSE PROTOCOLS
═══════════════════════════════════════════════════════════════════════════════

## WHEN USER REPORTS SYMPTOMS:
1. Assess urgency - is this an emergency?
2. Ask clarifying questions if needed
3. Provide clinical assessment
4. Give specific guidance (home care vs vet visit vs emergency)
5. Log the health insight for tracking

## WHEN USER WANTS TO UPDATE DATA:
1. Confirm understanding
2. Execute action
3. Provide relevant health commentary if applicable

## WHEN USER ASKS GENERAL QUESTIONS:
1. Provide evidence-based information
2. Relate to their specific pet if applicable
3. Offer to help with related actions

## KEY REMINDERS:
• Always match pet names to registered pets
• Use pet/appointment IDs when available
• Confirm before destructive actions (delete)
• Proactively offer to record weight/health changes
• Flag concerning patterns in health data
• End with clear next steps

═══════════════════════════════════════════════════════════════════════════════

You are not just an AI assistant - you are a trusted veterinary partner dedicated to helping every family member (furry, feathered, or scaly) live their healthiest, happiest life. Combine your clinical knowledge with genuine care in every interaction.`;

    let responseMessage: string = '';
    let aiProvider: string = 'none';

    // AI Provider Priority: DeepSeek > HuggingFace > OpenAI
    if (deepseekApiKey) {
      try {
        console.log('Trying DeepSeek Direct API...');
        const deepseekResponse = await fetch(`${deepseekBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            max_tokens: 1500,
            temperature: 0.7,
            stream: false,
          }),
        });

        if (deepseekResponse.ok) {
          const deepseekData = await deepseekResponse.json();
          const content = deepseekData.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            responseMessage = content;
            aiProvider = 'DeepSeek';
            console.log('Success with DeepSeek Direct API');
          }
        } else {
          const errorText = await deepseekResponse.text();
          console.warn('DeepSeek API failed:', errorText);
        }
      } catch (deepseekError) {
        console.warn('DeepSeek API error:', deepseekError);
      }
    }

    // Fallback to HuggingFace
    if (!responseMessage && hfToken) {
      const hfModels = [
        ...(hfModelEnv ? [hfModelEnv] : []),
        'meta-llama/Llama-3.1-8B-Instruct',
        'mistralai/Mistral-7B-Instruct-v0.3',
      ];

      for (const model of hfModels) {
        if (responseMessage) break;

        try {
          console.log(`Trying HuggingFace model: ${model}`);
          const hfResponse = await fetch(`${hfBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              max_tokens: 1200,
              temperature: 0.7,
            }),
          });

          if (hfResponse.ok) {
            const hfData = await hfResponse.json();
            const content = hfData.choices?.[0]?.message?.content;
            if (content && content.trim()) {
              responseMessage = content;
              aiProvider = `HuggingFace (${model})`;
              console.log(`Success with HuggingFace model: ${model}`);
            }
          } else {
            const errorText = await hfResponse.text();
            console.warn(`HuggingFace model ${model} failed:`, errorText);
          }
        } catch (hfError) {
          console.warn(`HuggingFace model ${model} error:`, hfError);
        }
      }
    }

    // Fallback to OpenAI
    if (!responseMessage && openaiKey) {
      try {
        console.log('Trying OpenAI API...');
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            max_tokens: 1200,
            temperature: 0.7,
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const content = openaiData.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            responseMessage = content;
            aiProvider = 'OpenAI';
            console.log('Success with OpenAI');
          }
        } else {
          const errorText = await openaiResponse.text();
          console.warn('OpenAI API failed:', errorText);
        }
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
      }
    }

    if (!responseMessage) {
      console.error('All AI providers failed');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again in a moment.' },
        { status: 503, headers: corsHeaders }
      );
    }

    console.log(`AI response generated by: ${aiProvider}`);

    // Parse and execute any actions from the AI response
    let executedAction: AIAction | null = null;
    let actionResult: any = null;

    // Look for action JSON in the response
    const actionMatch = responseMessage.match(/```action\s*([\s\S]*?)\s*```/);
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        console.log('Detected action:', actionData);

        // Execute the action
        switch (actionData.type) {
          case 'schedule_appointment': {
            const { petName, title, date, time, location, veterinarian, notes } = actionData.data;
            // Find the pet by name
            const pet = petsData.find(p => p.name.toLowerCase() === petName?.toLowerCase());
            if (pet) {
              const { data: newAppt, error } = await supabase
                .from('appointments')
                .insert({
                  pet_id: pet.id,
                  user_id: userId,
                  title: title || 'Vet Appointment',
                  date: date,
                  time: time || null,
                  location: location || null,
                  veterinarian: veterinarian || null,
                  notes: notes || null,
                  status: 'scheduled',
                  completed: false,
                })
                .select()
                .single();

              if (!error && newAppt) {
                executedAction = { type: 'schedule_appointment', data: newAppt };
                actionResult = { success: true, appointment: newAppt };
                console.log('Appointment created:', newAppt.id);
              } else {
                console.error('Failed to create appointment:', error);
              }
            }
            break;
          }

          case 'add_pet': {
            const { name, species, breed, age, weight, image } = actionData.data;
            const { data: newPet, error } = await supabase
              .from('pets')
              .insert({
                user_id: userId,
                name: name,
                species: species || 'Dog',
                breed: breed || null,
                age: age,
                weight: weight,
                image: image || null,
              })
              .select()
              .single();

            if (!error && newPet) {
              executedAction = { type: 'add_pet', data: newPet };
              actionResult = { success: true, pet: newPet };
              console.log('Pet created:', newPet.id);

              // Automatically generate health alerts for the new pet
              const healthPet: HealthPet = {
                id: newPet.id,
                name: newPet.name,
                species: newPet.species || 'Dog',
                breed: newPet.breed || undefined,
                age: newPet.age || undefined,
                weight: newPet.weight || undefined,
              };

              const alerts = generateHealthAlerts(healthPet);
              let alertsCreated = 0;

              for (const alert of alerts) {
                const { error: alertError } = await supabase.from('alerts').insert({
                  pet_id: newPet.id,
                  user_id: userId,
                  type: alert.type,
                  severity: alert.severity,
                  message: alert.message,
                  recommendation: alert.recommendation,
                  resolved: false,
                });

                if (!alertError) {
                  alertsCreated++;
                  console.log(`Alert created for ${name}: ${alert.type} (${alert.severity})`);
                }
              }

              if (alertsCreated > 0) {
                console.log(`${alertsCreated} health alerts generated for ${name}`);
                actionResult.alertsCreated = alertsCreated;
                actionResult.alerts = alerts;
              }
            } else {
              console.error('Failed to create pet:', error);
            }
            break;
          }

          case 'resolve_alert': {
            const { alertId, petName } = actionData.data;
            let targetAlertId = alertId;

            // If no ID, try to find by pet name and recent unresolved
            if (!targetAlertId && petName) {
              const pet = petsData.find(p => p.name.toLowerCase() === petName.toLowerCase());
              if (pet) {
                const unresolvedAlert = alertsData.find(a => a.pet_id === pet.id && !a.resolved);
                if (unresolvedAlert) {
                  targetAlertId = unresolvedAlert.id;
                }
              }
            }

            if (targetAlertId) {
              const { error } = await supabase
                .from('alerts')
                .update({ resolved: true, resolved_at: new Date().toISOString() })
                .eq('id', targetAlertId);

              if (!error) {
                executedAction = { type: 'resolve_alert', data: { alertId: targetAlertId } };
                actionResult = { success: true, alertId: targetAlertId };
                console.log('Alert resolved:', targetAlertId);
              } else {
                console.error('Failed to resolve alert:', error);
              }
            }
            break;
          }

          case 'add_health_record': {
            const { petName, type, value, unit, notes } = actionData.data;
            const pet = petsData.find(p => p.name.toLowerCase() === petName?.toLowerCase());
            if (pet) {
              const { data: newRecord, error } = await supabase
                .from('health_records')
                .insert({
                  pet_id: pet.id,
                  user_id: userId,
                  type: type,
                  value: value,
                  unit: unit,
                  notes: notes || null,
                  recorded_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (!error && newRecord) {
                executedAction = { type: 'add_health_record', data: newRecord };
                actionResult = { success: true, record: newRecord };
                console.log('Health record created:', newRecord.id);
              } else {
                console.error('Failed to create health record:', error);
              }
            }
            break;
          }

          case 'update_pet': {
            const { petId, petName, name, species, breed, age, weight, image } = actionData.data;
            // Find pet by ID or name
            let targetPet = petId
              ? petsData.find(p => p.id === petId)
              : petsData.find(p => p.name.toLowerCase() === petName?.toLowerCase());

            if (targetPet) {
              const updatePayload: Record<string, any> = {};
              if (name !== undefined) updatePayload.name = name;
              if (species !== undefined) updatePayload.species = species;
              if (breed !== undefined) updatePayload.breed = breed;
              if (age !== undefined) updatePayload.age = age;
              if (weight !== undefined) updatePayload.weight = weight;
              if (image !== undefined) updatePayload.image = image;

              const { data: updatedPet, error } = await supabase
                .from('pets')
                .update(updatePayload)
                .eq('id', targetPet.id)
                .eq('user_id', userId)
                .select()
                .single();

              if (!error && updatedPet) {
                executedAction = { type: 'update_pet', data: updatedPet };
                actionResult = { success: true, pet: updatedPet };
                console.log('Pet updated:', updatedPet.id);
              } else {
                console.error('Failed to update pet:', error);
              }
            }
            break;
          }

          case 'delete_pet': {
            const { petId, petName } = actionData.data;
            let targetPet = petId
              ? petsData.find(p => p.id === petId)
              : petsData.find(p => p.name.toLowerCase() === petName?.toLowerCase());

            if (targetPet) {
              // Delete related records first (alerts, appointments, health_records)
              await supabase.from('alerts').delete().eq('pet_id', targetPet.id);
              await supabase.from('appointments').delete().eq('pet_id', targetPet.id);
              await supabase.from('health_records').delete().eq('pet_id', targetPet.id);
              await supabase.from('health_scores').delete().eq('pet_id', targetPet.id);

              const { error } = await supabase
                .from('pets')
                .delete()
                .eq('id', targetPet.id)
                .eq('user_id', userId);

              if (!error) {
                executedAction = { type: 'delete_pet', data: { petId: targetPet.id, petName: targetPet.name } };
                actionResult = { success: true, deletedPetId: targetPet.id };
                console.log('Pet deleted:', targetPet.id);
              } else {
                console.error('Failed to delete pet:', error);
              }
            }
            break;
          }

          case 'update_appointment': {
            const { appointmentId, title, date, time, location, veterinarian, notes } = actionData.data;

            if (appointmentId) {
              const updatePayload: Record<string, any> = {};
              if (title !== undefined) updatePayload.title = title;
              if (date !== undefined) updatePayload.date = date;
              if (time !== undefined) updatePayload.time = time;
              if (location !== undefined) updatePayload.location = location;
              if (veterinarian !== undefined) updatePayload.veterinarian = veterinarian;
              if (notes !== undefined) updatePayload.notes = notes;

              const { data: updatedAppt, error } = await supabase
                .from('appointments')
                .update(updatePayload)
                .eq('id', appointmentId)
                .eq('user_id', userId)
                .select()
                .single();

              if (!error && updatedAppt) {
                executedAction = { type: 'update_appointment', data: updatedAppt };
                actionResult = { success: true, appointment: updatedAppt };
                console.log('Appointment updated:', updatedAppt.id);
              } else {
                console.error('Failed to update appointment:', error);
              }
            }
            break;
          }

          case 'cancel_appointment': {
            const { appointmentId, reason } = actionData.data;

            if (appointmentId) {
              const { data: cancelledAppt, error } = await supabase
                .from('appointments')
                .update({
                  status: 'cancelled',
                  notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user'
                })
                .eq('id', appointmentId)
                .eq('user_id', userId)
                .select()
                .single();

              if (!error && cancelledAppt) {
                executedAction = { type: 'cancel_appointment', data: cancelledAppt };
                actionResult = { success: true, appointment: cancelledAppt };
                console.log('Appointment cancelled:', cancelledAppt.id);
              } else {
                console.error('Failed to cancel appointment:', error);
              }
            }
            break;
          }

          case 'create_alert': {
            const { petName, type, severity, message: alertMessage, recommendation } = actionData.data;
            const pet = petsData.find(p => p.name.toLowerCase() === petName?.toLowerCase());

            if (pet) {
              const { data: newAlert, error } = await supabase
                .from('alerts')
                .insert({
                  pet_id: pet.id,
                  user_id: userId,
                  type: type || 'health_concern',
                  severity: severity || 'medium',
                  message: alertMessage || 'Health concern detected from chat',
                  recommendation: recommendation || null,
                  resolved: false,
                })
                .select()
                .single();

              if (!error && newAlert) {
                executedAction = { type: 'create_alert', data: newAlert };
                actionResult = { success: true, alert: newAlert };
                console.log('Alert created:', newAlert.id);
              } else {
                console.error('Failed to create alert:', error);
              }
            }
            break;
          }

          case 'log_health_insight': {
            // This is handled after the switch statement with explicit AI logging
            executedAction = { type: 'log_health_insight', data: actionData.data };
            break;
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse action JSON:', parseError);
      }

      // Remove the action JSON from the displayed message
      responseMessage = responseMessage.replace(/```action[\s\S]*?```/g, '').trim();
    }

    // Store the conversation
    const { data: insertedMessages } = await supabase.from('assistant_messages').insert([
      { user_id: userId, pet_id: petId, role: 'user', content: message },
      { user_id: userId, pet_id: petId, role: 'assistant', content: responseMessage },
    ]).select();

    // Auto-detect and store health insights from user message
    const detectedInsight = detectHealthInsights(message);
    let healthInsight = null;

    if (detectedInsight && petId) {
      // Store the health insight
      const insightMessage = detectedInsight.type === 'health_improvement'
        ? `Positive update reported: ${message.substring(0, 100)}`
        : `User reported: ${message.substring(0, 100)}`;

      const scoreImpact = detectedInsight.type === 'health_improvement'
        ? (detectedInsight.severity === 'high' ? 5 : 3)
        : (detectedInsight.severity === 'high' ? -15 : detectedInsight.severity === 'medium' ? -10 : -5);

      const { data: newInsight } = await supabase
        .from('ai_health_insights')
        .insert({
          pet_id: petId,
          user_id: userId,
          insight_type: detectedInsight.type,
          message: insightMessage,
          severity: detectedInsight.severity,
          confidence: 0.75, // Auto-detection has lower confidence
          conversation_id: insertedMessages?.[0]?.id,
          source_message: message,
          score_impact: scoreImpact,
        })
        .select()
        .single();

      if (newInsight) {
        healthInsight = newInsight;
        console.log('Health insight logged:', newInsight.id, detectedInsight.type);
      }
    }

    // Also check if AI explicitly logged an insight via action
    if (executedAction?.type === 'log_health_insight') {
      const { petName, type, message: insightMsg, severity } = executedAction.data || {};
      const targetPet = petsData.find(p => p.name.toLowerCase() === petName?.toLowerCase());

      if (targetPet) {
        const scoreImpact = type === 'health_improvement'
          ? (severity === 'high' ? 10 : 5)
          : (severity === 'high' ? -15 : severity === 'medium' ? -10 : -5);

        const { data: aiLoggedInsight } = await supabase
          .from('ai_health_insights')
          .insert({
            pet_id: targetPet.id,
            user_id: userId,
            insight_type: type || 'health_concern',
            message: insightMsg || 'AI observation from conversation',
            severity: severity || 'medium',
            confidence: 0.90, // AI-explicit logging has higher confidence
            conversation_id: insertedMessages?.[0]?.id,
            source_message: message,
            score_impact: scoreImpact,
          })
          .select()
          .single();

        if (aiLoggedInsight) {
          healthInsight = aiLoggedInsight;
          console.log('AI-logged health insight:', aiLoggedInsight.id);
        }
      }
    }

    // Extract and record learnings from the conversation
    let learningsRecorded = 0;
    let memoriesStored = 0;
    if (petId) {
      try {
        // Extract learnings from user message using PetLearningService
        const learnings = PetLearningService.extractLearningsFromText(
          message,
          petsData.find(p => p.id === petId)?.name || 'Pet'
        );

        if (learnings.length > 0) {
          learningsRecorded = await PetLearningService.recordLearningsFromConversation(
            petId,
            insertedMessages?.[0]?.id || '',
            learnings
          );
          if (learningsRecorded > 0) {
            console.log(`Recorded ${learningsRecorded} learnings from conversation`);
          }
        }

        // Also extract and store long-term memories using AIMemoryService
        memoriesStored = await AIMemoryService.extractAndStoreLearnings(
          userId,
          petId,
          [
            { role: 'user', content: message },
            { role: 'assistant', content: responseMessage }
          ]
        );
        if (memoriesStored > 0) {
          console.log(`Stored ${memoriesStored} memories from conversation`);
        }
      } catch (learningErr) {
        console.warn('Failed to record learnings/memories:', learningErr);
      }
    }

    // Auto-compact if conversation is getting long (>100 messages)
    let autoCompactResult = null;
    if (contextStats.totalMessages > 100) {
      try {
        autoCompactResult = await AIMemoryService.compactConversations(userId, petId, 14);
        if (autoCompactResult.compactedMessages > 0) {
          console.log(`Auto-compacted ${autoCompactResult.compactedMessages} messages`);
        }
      } catch (compactErr) {
        console.warn('Auto-compact failed:', compactErr);
      }
    }

    return NextResponse.json(
      {
        message: responseMessage,
        sources: sources.length > 0 ? sources : undefined,
        action: executedAction,
        actionResult: actionResult,
        healthInsight: healthInsight,
        learningsRecorded: learningsRecorded > 0 ? learningsRecorded : undefined,
        memoriesStored: memoriesStored > 0 ? memoriesStored : undefined,
        autoCompact: autoCompactResult && autoCompactResult.compactedMessages > 0 ? autoCompactResult : undefined,
        contextStats: {
          messagesInContext: contextStats.totalMessages,
          memoriesUsed: contextStats.memoriesIncluded,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
