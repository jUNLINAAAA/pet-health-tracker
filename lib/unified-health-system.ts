/**
 * UNIFIED HEALTH SCORE SYSTEM V2
 *
 * FIXES:
 * 1. Consistent scoring across ALL pages
 * 2. Meaningful metrics with comparisons
 * 3. Clear explanations for users
 */

// Type definitions for Pet and Alert (no Supabase)
export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  image?: string;
  userId?: string;
  createdAt?: string;
}

export interface Alert {
  id: string;
  petId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  resolved?: boolean;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  scoreImpact: number;
  createdAt: string;
}

export interface UnifiedHealthScore {
  overall: number; // 0-100

  components: {
    weight: number;
    activity: number;
    medical: number;
    alerts: number;
    aiInsights: number; // AI-derived insights score component
    appetite: number;   // Appetite score component (1-5 scale where 3 is optimal)
  };

  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  statusColor: string;
  statusBg: string;

  trends: {
    weight: { direction: 'up' | 'down' | 'stable'; value: string; isGood: boolean };
    activity: { direction: 'up' | 'down' | 'stable'; value: string; isGood: boolean };
    appetite: { direction: 'improving' | 'stable' | 'declining' | 'unknown'; isGood: boolean };
    overall: { direction: 'improving' | 'stable' | 'declining' };
  };

  insights: string[];
  recommendations: string[];
  aiInsights: AIInsight[]; // New: AI-derived insights from conversations

  history: {
    scores: number[];
    weights: number[];
    activities: number[];
  };
}

/**
 * MEANINGFUL METRIC - Not just a number, tells user what it means
 */
export interface MeaningfulMetric {
  title: string;
  current: number;
  ideal: number | { min: number; max: number };
  unit: string;
  status: 'excellent' | 'good' | 'needs_attention';
  explanation: string; // "Max is 8kg over ideal weight"
  recommendation?: string; // "Reduce portions by 20%"
  sparklineData: number[];
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  color: string;
}

// Comprehensive breed-specific ideal weights by species
const BREED_WEIGHTS: Record<string, { min: number; max: number }> = {
  // === DOGS (sorted alphabetically) ===
  'Afghan Hound': { min: 23, max: 27 },
  'Akita': { min: 32, max: 45 },
  'Alaskan Malamute': { min: 34, max: 43 },
  'Australian Cattle Dog': { min: 16, max: 22 },
  'Australian Shepherd': { min: 18, max: 29 },
  'Basset Hound': { min: 20, max: 29 },
  'Beagle': { min: 9, max: 11 },
  'Belgian Malinois': { min: 25, max: 30 },
  'Bernese Mountain Dog': { min: 36, max: 50 },
  'Bichon Frise': { min: 3, max: 5 },
  'Border Collie': { min: 14, max: 20 },
  'Boston Terrier': { min: 5, max: 11 },
  'Boxer': { min: 25, max: 32 },
  'Brittany': { min: 14, max: 18 },
  'Bulldog': { min: 18, max: 23 },
  'Cavalier King Charles Spaniel': { min: 5, max: 8 },
  'Chihuahua': { min: 1.5, max: 3 },
  'Cocker Spaniel': { min: 11, max: 14 },
  'Collie': { min: 23, max: 34 },
  'Corgi': { min: 10, max: 14 },
  'Dachshund': { min: 7, max: 14 },
  'Dalmatian': { min: 23, max: 27 },
  'Doberman Pinscher': { min: 27, max: 45 },
  'English Springer Spaniel': { min: 18, max: 25 },
  'French Bulldog': { min: 8, max: 14 },
  'German Shepherd': { min: 30, max: 40 },
  'German Shorthaired Pointer': { min: 20, max: 32 },
  'Golden Retriever': { min: 25, max: 34 },
  'Great Dane': { min: 50, max: 79 },
  'Great Pyrenees': { min: 36, max: 54 },
  'Havanese': { min: 3, max: 6 },
  'Husky': { min: 16, max: 27 },
  'Irish Setter': { min: 27, max: 32 },
  'Jack Russell Terrier': { min: 6, max: 8 },
  'Labrador Retriever': { min: 25, max: 36 },
  'Maltese': { min: 1.8, max: 3 },
  'Mastiff': { min: 54, max: 100 },
  'Miniature Pinscher': { min: 3.5, max: 5 },
  'Miniature Schnauzer': { min: 5, max: 8 },
  'Newfoundland': { min: 45, max: 68 },
  'Papillon': { min: 2, max: 4.5 },
  'Pekingese': { min: 3, max: 6 },
  'Pembroke Welsh Corgi': { min: 10, max: 14 },
  'Pit Bull': { min: 14, max: 27 },
  'Pomeranian': { min: 1.4, max: 3 },
  'Poodle': { min: 20, max: 32 },
  'Poodle (Miniature)': { min: 5, max: 7 },
  'Poodle (Toy)': { min: 2, max: 4 },
  'Pug': { min: 6, max: 8 },
  'Rottweiler': { min: 36, max: 54 },
  'Saint Bernard': { min: 54, max: 82 },
  'Samoyed': { min: 16, max: 30 },
  'Schnauzer': { min: 14, max: 20 },
  'Scottish Terrier': { min: 8, max: 10 },
  'Shar Pei': { min: 18, max: 25 },
  'Shetland Sheepdog': { min: 6, max: 12 },
  'Shiba Inu': { min: 8, max: 11 },
  'Shih Tzu': { min: 4, max: 7 },
  'Siberian Husky': { min: 16, max: 27 },
  'Staffordshire Bull Terrier': { min: 11, max: 17 },
  'Vizsla': { min: 20, max: 27 },
  'Weimaraner': { min: 25, max: 40 },
  'West Highland White Terrier': { min: 6, max: 10 },
  'Whippet': { min: 11, max: 18 },
  'Yorkshire Terrier': { min: 2, max: 3.2 },

  // === CATS ===
  'Abyssinian': { min: 3, max: 5 },
  'American Shorthair': { min: 3.5, max: 6 },
  'Bengal': { min: 4, max: 7 },
  'Birman': { min: 3, max: 6 },
  'British Shorthair': { min: 4, max: 8 },
  'Burmese': { min: 3.5, max: 5.5 },
  'Devon Rex': { min: 2.5, max: 4.5 },
  'Domestic Shorthair': { min: 3.5, max: 5 },
  'Domestic Longhair': { min: 3.5, max: 5.5 },
  'Egyptian Mau': { min: 3, max: 5 },
  'Exotic Shorthair': { min: 3.5, max: 6 },
  'Himalayan': { min: 3, max: 5.5 },
  'Maine Coon': { min: 5.5, max: 11 },
  'Norwegian Forest Cat': { min: 4, max: 9 },
  'Oriental Shorthair': { min: 3, max: 5 },
  'Persian': { min: 3, max: 5.5 },
  'Ragdoll': { min: 4.5, max: 9 },
  'Russian Blue': { min: 3, max: 5.5 },
  'Scottish Fold': { min: 2.7, max: 6 },
  'Siamese': { min: 3, max: 5 },
  'Siberian': { min: 4, max: 9 },
  'Sphynx': { min: 3, max: 5 },
  'Tonkinese': { min: 2.5, max: 5.5 },
  'Turkish Angora': { min: 2.5, max: 5 },

  // === RABBITS ===
  'Holland Lop': { min: 1.3, max: 1.8 },
  'Mini Lop': { min: 2, max: 2.7 },
  'Netherland Dwarf': { min: 0.9, max: 1.1 },
  'Lionhead': { min: 1.1, max: 1.7 },
  'Rex Rabbit': { min: 3, max: 4.5 },
  'Flemish Giant': { min: 5, max: 10 },
  'Mini Rex': { min: 1.4, max: 2 },
  'Dutch Rabbit': { min: 1.8, max: 2.5 },
  'English Lop': { min: 4, max: 5.5 },
  'American Fuzzy Lop': { min: 1.4, max: 1.8 },

  // === GUINEA PIGS ===
  'American Guinea Pig': { min: 0.9, max: 1.2 },
  'Peruvian Guinea Pig': { min: 0.9, max: 1.4 },
  'Abyssinian Guinea Pig': { min: 0.9, max: 1.2 },
  'Silkie Guinea Pig': { min: 0.9, max: 1.2 },
  'Teddy Guinea Pig': { min: 0.7, max: 1.2 },

  // === HAMSTERS ===
  'Syrian Hamster': { min: 0.1, max: 0.2 },
  'Dwarf Hamster': { min: 0.025, max: 0.05 },
  'Roborovski Hamster': { min: 0.02, max: 0.025 },
  'Chinese Hamster': { min: 0.03, max: 0.045 },

  // === BIRDS (weight varies significantly) ===
  'Budgerigar': { min: 0.025, max: 0.04 },
  'Cockatiel': { min: 0.08, max: 0.12 },
  'Lovebird': { min: 0.04, max: 0.06 },
  'Canary': { min: 0.015, max: 0.025 },
  'Finch': { min: 0.01, max: 0.02 },
  'Conure': { min: 0.06, max: 0.12 },
  'African Grey Parrot': { min: 0.4, max: 0.6 },
  'Macaw': { min: 0.9, max: 1.4 },
  'Amazon Parrot': { min: 0.35, max: 0.55 },
  'Cockatoo': { min: 0.3, max: 0.9 },

  // === REPTILES ===
  'Leopard Gecko': { min: 0.04, max: 0.08 },
  'Bearded Dragon': { min: 0.3, max: 0.5 },
  'Ball Python': { min: 1.2, max: 1.8 },
  'Corn Snake': { min: 0.4, max: 0.9 },
  'Red-Eared Slider': { min: 0.2, max: 0.35 },
  'Blue-Tongued Skink': { min: 0.4, max: 0.6 },
  'Crested Gecko': { min: 0.035, max: 0.055 },

  // === FERRETS ===
  'Ferret': { min: 0.7, max: 2 },

  // === SMALL ANIMALS ===
  'Chinchilla': { min: 0.4, max: 0.6 },
  'Gerbil': { min: 0.05, max: 0.13 },
  'Rat': { min: 0.3, max: 0.5 },
  'Mouse': { min: 0.02, max: 0.04 },
  'Hedgehog': { min: 0.3, max: 0.6 },
  'Sugar Glider': { min: 0.1, max: 0.15 },
};

// Species-specific default weight ranges (when breed is unknown)
const SPECIES_DEFAULT_WEIGHTS: Record<string, { min: number; max: number }> = {
  'Dog': { min: 10, max: 30 },
  'Cat': { min: 3.5, max: 5.5 },
  'Rabbit': { min: 1.5, max: 3 },
  'Guinea Pig': { min: 0.9, max: 1.2 },
  'Hamster': { min: 0.03, max: 0.15 },
  'Bird': { min: 0.03, max: 0.5 },
  'Parrot': { min: 0.3, max: 0.6 },
  'Reptile': { min: 0.2, max: 1 },
  'Snake': { min: 0.5, max: 1.5 },
  'Lizard': { min: 0.1, max: 0.5 },
  'Turtle': { min: 0.2, max: 0.5 },
  'Ferret': { min: 0.7, max: 2 },
  'Chinchilla': { min: 0.4, max: 0.6 },
  'Gerbil': { min: 0.05, max: 0.13 },
  'Rat': { min: 0.3, max: 0.5 },
  'Mouse': { min: 0.02, max: 0.04 },
  'Hedgehog': { min: 0.3, max: 0.6 },
  'Sugar Glider': { min: 0.1, max: 0.15 },
  'Fish': { min: 0.01, max: 0.1 }, // Varies widely
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE VITAL SIGNS DATABASE FOR ALL SPECIES
// Used for accurate health scoring across all pet types
// ═══════════════════════════════════════════════════════════════════════════

export interface VitalSignRanges {
  temperature: { min: number; max: number; critical_low: number; critical_high: number; unit: 'C' };
  heartRate: { min: number; max: number; critical_low: number; critical_high: number; unit: 'bpm' };
  respiratoryRate: { min: number; max: number; critical_low: number; critical_high: number; unit: '/min' };
  capillaryRefill?: { max: number; unit: 'seconds' };
}

const SPECIES_VITAL_SIGNS: Record<string, VitalSignRanges> = {
  // DOGS - varies by size, this is average
  'Dog': {
    temperature: { min: 38.0, max: 39.2, critical_low: 36.0, critical_high: 40.5, unit: 'C' },
    heartRate: { min: 60, max: 140, critical_low: 40, critical_high: 180, unit: 'bpm' },
    respiratoryRate: { min: 10, max: 30, critical_low: 5, critical_high: 50, unit: '/min' },
    capillaryRefill: { max: 2, unit: 'seconds' },
  },
  // Small dogs have higher heart rates
  'Small Dog': {
    temperature: { min: 38.0, max: 39.2, critical_low: 36.0, critical_high: 40.5, unit: 'C' },
    heartRate: { min: 100, max: 160, critical_low: 60, critical_high: 200, unit: 'bpm' },
    respiratoryRate: { min: 15, max: 35, critical_low: 8, critical_high: 55, unit: '/min' },
  },
  // Giant breeds have lower heart rates
  'Giant Dog': {
    temperature: { min: 38.0, max: 39.2, critical_low: 36.0, critical_high: 40.5, unit: 'C' },
    heartRate: { min: 50, max: 100, critical_low: 35, critical_high: 140, unit: 'bpm' },
    respiratoryRate: { min: 8, max: 25, critical_low: 4, critical_high: 40, unit: '/min' },
  },
  // CATS
  'Cat': {
    temperature: { min: 38.1, max: 39.2, critical_low: 36.0, critical_high: 40.5, unit: 'C' },
    heartRate: { min: 140, max: 220, critical_low: 100, critical_high: 280, unit: 'bpm' },
    respiratoryRate: { min: 20, max: 30, critical_low: 10, critical_high: 50, unit: '/min' },
    capillaryRefill: { max: 2, unit: 'seconds' },
  },
  // RABBITS - prey animals hide illness
  'Rabbit': {
    temperature: { min: 38.5, max: 40.0, critical_low: 37.0, critical_high: 41.0, unit: 'C' },
    heartRate: { min: 130, max: 325, critical_low: 100, critical_high: 400, unit: 'bpm' },
    respiratoryRate: { min: 30, max: 60, critical_low: 20, critical_high: 80, unit: '/min' },
  },
  // GUINEA PIGS
  'Guinea Pig': {
    temperature: { min: 37.2, max: 39.5, critical_low: 35.5, critical_high: 40.5, unit: 'C' },
    heartRate: { min: 240, max: 350, critical_low: 180, critical_high: 400, unit: 'bpm' },
    respiratoryRate: { min: 42, max: 104, critical_low: 30, critical_high: 130, unit: '/min' },
  },
  // HAMSTERS
  'Hamster': {
    temperature: { min: 36.2, max: 37.5, critical_low: 34.0, critical_high: 39.0, unit: 'C' },
    heartRate: { min: 300, max: 600, critical_low: 200, critical_high: 700, unit: 'bpm' },
    respiratoryRate: { min: 35, max: 135, critical_low: 25, critical_high: 160, unit: '/min' },
  },
  // FERRETS
  'Ferret': {
    temperature: { min: 37.8, max: 40.0, critical_low: 36.0, critical_high: 41.0, unit: 'C' },
    heartRate: { min: 200, max: 400, critical_low: 150, critical_high: 450, unit: 'bpm' },
    respiratoryRate: { min: 33, max: 36, critical_low: 20, critical_high: 50, unit: '/min' },
  },
  // BIRDS - General (psittacines/parrots)
  'Bird': {
    temperature: { min: 40.0, max: 42.0, critical_low: 38.0, critical_high: 43.5, unit: 'C' },
    heartRate: { min: 150, max: 600, critical_low: 100, critical_high: 700, unit: 'bpm' },
    respiratoryRate: { min: 15, max: 50, critical_low: 10, critical_high: 70, unit: '/min' },
  },
  'Parrot': {
    temperature: { min: 40.0, max: 42.0, critical_low: 38.0, critical_high: 43.5, unit: 'C' },
    heartRate: { min: 150, max: 350, critical_low: 100, critical_high: 450, unit: 'bpm' },
    respiratoryRate: { min: 15, max: 50, critical_low: 10, critical_high: 70, unit: '/min' },
  },
  // Small birds (budgies, canaries, finches) - faster heart rates
  'Budgerigar': {
    temperature: { min: 40.5, max: 42.5, critical_low: 38.5, critical_high: 44.0, unit: 'C' },
    heartRate: { min: 400, max: 600, critical_low: 300, critical_high: 700, unit: 'bpm' },
    respiratoryRate: { min: 25, max: 60, critical_low: 15, critical_high: 80, unit: '/min' },
  },
  'Canary': {
    temperature: { min: 40.5, max: 42.5, critical_low: 38.5, critical_high: 44.0, unit: 'C' },
    heartRate: { min: 400, max: 700, critical_low: 300, critical_high: 800, unit: 'bpm' },
    respiratoryRate: { min: 30, max: 70, critical_low: 20, critical_high: 90, unit: '/min' },
  },
  // REPTILES (ectothermic - vitals vary with temperature)
  'Reptile': {
    temperature: { min: 24.0, max: 35.0, critical_low: 18.0, critical_high: 40.0, unit: 'C' },
    heartRate: { min: 20, max: 80, critical_low: 10, critical_high: 120, unit: 'bpm' },
    respiratoryRate: { min: 2, max: 15, critical_low: 1, critical_high: 25, unit: '/min' },
  },
  'Bearded Dragon': {
    temperature: { min: 36.0, max: 40.0, critical_low: 30.0, critical_high: 42.0, unit: 'C' }, // Basking temp
    heartRate: { min: 40, max: 80, critical_low: 25, critical_high: 110, unit: 'bpm' },
    respiratoryRate: { min: 4, max: 15, critical_low: 2, critical_high: 25, unit: '/min' },
  },
  'Leopard Gecko': {
    temperature: { min: 28.0, max: 32.0, critical_low: 22.0, critical_high: 35.0, unit: 'C' },
    heartRate: { min: 30, max: 60, critical_low: 20, critical_high: 90, unit: 'bpm' },
    respiratoryRate: { min: 2, max: 8, critical_low: 1, critical_high: 15, unit: '/min' },
  },
  'Ball Python': {
    temperature: { min: 29.0, max: 32.0, critical_low: 24.0, critical_high: 35.0, unit: 'C' },
    heartRate: { min: 15, max: 35, critical_low: 8, critical_high: 50, unit: 'bpm' },
    respiratoryRate: { min: 1, max: 5, critical_low: 0.5, critical_high: 10, unit: '/min' },
  },
  'Turtle': {
    temperature: { min: 25.0, max: 30.0, critical_low: 18.0, critical_high: 35.0, unit: 'C' },
    heartRate: { min: 15, max: 40, critical_low: 8, critical_high: 60, unit: 'bpm' },
    respiratoryRate: { min: 1, max: 4, critical_low: 0.5, critical_high: 8, unit: '/min' },
  },
  // RODENTS
  'Rat': {
    temperature: { min: 37.5, max: 38.5, critical_low: 35.5, critical_high: 40.0, unit: 'C' },
    heartRate: { min: 300, max: 500, critical_low: 200, critical_high: 600, unit: 'bpm' },
    respiratoryRate: { min: 70, max: 115, critical_low: 50, critical_high: 150, unit: '/min' },
  },
  'Mouse': {
    temperature: { min: 36.5, max: 38.0, critical_low: 34.5, critical_high: 39.5, unit: 'C' },
    heartRate: { min: 450, max: 750, critical_low: 350, critical_high: 850, unit: 'bpm' },
    respiratoryRate: { min: 80, max: 230, critical_low: 60, critical_high: 280, unit: '/min' },
  },
  'Gerbil': {
    temperature: { min: 37.0, max: 38.5, critical_low: 35.0, critical_high: 40.0, unit: 'C' },
    heartRate: { min: 260, max: 600, critical_low: 200, critical_high: 700, unit: 'bpm' },
    respiratoryRate: { min: 85, max: 160, critical_low: 60, critical_high: 200, unit: '/min' },
  },
  'Chinchilla': {
    temperature: { min: 37.0, max: 38.0, critical_low: 35.5, critical_high: 39.5, unit: 'C' },
    heartRate: { min: 200, max: 350, critical_low: 150, critical_high: 400, unit: 'bpm' },
    respiratoryRate: { min: 40, max: 80, critical_low: 25, critical_high: 100, unit: '/min' },
  },
  // EXOTIC
  'Hedgehog': {
    temperature: { min: 36.0, max: 37.5, critical_low: 34.0, critical_high: 39.0, unit: 'C' },
    heartRate: { min: 180, max: 280, critical_low: 120, critical_high: 350, unit: 'bpm' },
    respiratoryRate: { min: 25, max: 50, critical_low: 15, critical_high: 70, unit: '/min' },
  },
  'Sugar Glider': {
    temperature: { min: 36.0, max: 37.5, critical_low: 34.0, critical_high: 39.0, unit: 'C' },
    heartRate: { min: 200, max: 300, critical_low: 150, critical_high: 400, unit: 'bpm' },
    respiratoryRate: { min: 16, max: 40, critical_low: 10, critical_high: 60, unit: '/min' },
  },
};

// Get vital sign ranges for a pet based on species/breed/weight
export function getVitalSignRanges(pet: Pet): VitalSignRanges {
  const species = pet.species?.toLowerCase() || 'dog';
  const breed = pet.breed || '';

  // Check breed first
  if (SPECIES_VITAL_SIGNS[breed]) {
    return SPECIES_VITAL_SIGNS[breed];
  }

  // For dogs, adjust by size
  if (species === 'dog' && pet.weight) {
    if (pet.weight < 10) return SPECIES_VITAL_SIGNS['Small Dog'];
    if (pet.weight >= 40) return SPECIES_VITAL_SIGNS['Giant Dog'];
  }

  // Map various species names to our keys
  const speciesMap: Record<string, string> = {
    'dog': 'Dog',
    'cat': 'Cat',
    'rabbit': 'Rabbit',
    'bunny': 'Rabbit',
    'guinea pig': 'Guinea Pig',
    'hamster': 'Hamster',
    'ferret': 'Ferret',
    'bird': 'Bird',
    'parrot': 'Parrot',
    'budgie': 'Budgerigar',
    'budgerigar': 'Budgerigar',
    'parakeet': 'Budgerigar',
    'canary': 'Canary',
    'cockatiel': 'Bird',
    'reptile': 'Reptile',
    'lizard': 'Reptile',
    'bearded dragon': 'Bearded Dragon',
    'leopard gecko': 'Leopard Gecko',
    'gecko': 'Leopard Gecko',
    'snake': 'Ball Python',
    'ball python': 'Ball Python',
    'python': 'Ball Python',
    'turtle': 'Turtle',
    'tortoise': 'Turtle',
    'rat': 'Rat',
    'mouse': 'Mouse',
    'gerbil': 'Gerbil',
    'chinchilla': 'Chinchilla',
    'hedgehog': 'Hedgehog',
    'sugar glider': 'Sugar Glider',
  };

  const mappedSpecies = speciesMap[species] || 'Dog';
  return SPECIES_VITAL_SIGNS[mappedSpecies] || SPECIES_VITAL_SIGNS['Dog'];
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECIES-SPECIFIC ACTIVITY RECOMMENDATIONS (minutes per day)
// ═══════════════════════════════════════════════════════════════════════════

export interface ActivityRecommendation {
  minDaily: number;  // Minimum minutes per day
  optimalDaily: number;  // Optimal minutes per day
  description: string;  // Type of activity
  ageAdjustment: { senior: number; puppy: number };  // Multipliers
}

const SPECIES_ACTIVITY_RECOMMENDATIONS: Record<string, ActivityRecommendation> = {
  'Dog': { minDaily: 30, optimalDaily: 60, description: 'walks, play, mental stimulation', ageAdjustment: { senior: 0.6, puppy: 0.8 } },
  'Small Dog': { minDaily: 20, optimalDaily: 45, description: 'short walks, indoor play', ageAdjustment: { senior: 0.6, puppy: 0.7 } },
  'Large Dog': { minDaily: 45, optimalDaily: 90, description: 'long walks, running, fetch', ageAdjustment: { senior: 0.5, puppy: 0.7 } },
  'Cat': { minDaily: 15, optimalDaily: 30, description: 'interactive play, hunting games', ageAdjustment: { senior: 0.5, puppy: 1.2 } },
  'Rabbit': { minDaily: 60, optimalDaily: 180, description: 'free roam time, exploration', ageAdjustment: { senior: 0.7, puppy: 0.8 } },
  'Guinea Pig': { minDaily: 30, optimalDaily: 60, description: 'floor time, exploration', ageAdjustment: { senior: 0.6, puppy: 0.8 } },
  'Hamster': { minDaily: 15, optimalDaily: 30, description: 'wheel running, tunnels', ageAdjustment: { senior: 0.5, puppy: 0.9 } },
  'Ferret': { minDaily: 120, optimalDaily: 240, description: 'out-of-cage play, exploration', ageAdjustment: { senior: 0.5, puppy: 0.8 } },
  'Bird': { minDaily: 30, optimalDaily: 60, description: 'out-of-cage time, flying, interaction', ageAdjustment: { senior: 0.6, puppy: 0.8 } },
  'Parrot': { minDaily: 60, optimalDaily: 120, description: 'interaction, training, flight time', ageAdjustment: { senior: 0.6, puppy: 0.8 } },
  'Reptile': { minDaily: 5, optimalDaily: 15, description: 'handling, exploration outside enclosure', ageAdjustment: { senior: 0.8, puppy: 0.9 } },
  'Rat': { minDaily: 30, optimalDaily: 60, description: 'out-of-cage play, social interaction', ageAdjustment: { senior: 0.5, puppy: 0.8 } },
  'Chinchilla': { minDaily: 30, optimalDaily: 60, description: 'out-of-cage playtime, dust baths', ageAdjustment: { senior: 0.6, puppy: 0.8 } },
  'Hedgehog': { minDaily: 20, optimalDaily: 45, description: 'wheel running, floor exploration', ageAdjustment: { senior: 0.5, puppy: 0.8 } },
  'Sugar Glider': { minDaily: 60, optimalDaily: 120, description: 'bonding time, climbing, gliding', ageAdjustment: { senior: 0.6, puppy: 0.8 } },
};

export function getActivityRecommendation(pet: Pet): ActivityRecommendation {
  const species = pet.species?.toLowerCase() || 'dog';
  const lifeExpectancy = getLifeExpectancy(pet);

  // Determine size category for dogs
  let key = species.charAt(0).toUpperCase() + species.slice(1);
  if (species === 'dog' && pet.weight) {
    if (pet.weight < 10) key = 'Small Dog';
    else if (pet.weight >= 30) key = 'Large Dog';
  }

  const base = SPECIES_ACTIVITY_RECOMMENDATIONS[key] || SPECIES_ACTIVITY_RECOMMENDATIONS['Dog'];

  // Apply age adjustment
  let multiplier = 1.0;
  if (pet.age) {
    const ageRatio = pet.age / lifeExpectancy.average;
    if (ageRatio > 0.7) {
      multiplier = base.ageAdjustment.senior;
    } else if (ageRatio < 0.2) {
      multiplier = base.ageAdjustment.puppy;
    }
  }

  return {
    ...base,
    minDaily: Math.round(base.minDaily * multiplier),
    optimalDaily: Math.round(base.optimalDaily * multiplier),
  };
}

// REALISTIC life expectancy by species and breed (in years)
// This is crucial for health scoring - a 23 year old dog is biologically impossible
const LIFE_EXPECTANCY: Record<string, { average: number; max: number }> = {
  // Dogs by size category (breed-specific would be too many entries)
  'Dog': { average: 12, max: 20 }, // Default for dogs
  'Small Dog': { average: 14, max: 20 }, // Chihuahua, Yorkie, etc.
  'Medium Dog': { average: 12, max: 17 }, // Beagle, Cocker Spaniel, etc.
  'Large Dog': { average: 10, max: 14 }, // Lab, Golden, etc.
  'Giant Dog': { average: 8, max: 12 }, // Great Dane, Mastiff, etc.

  // Specific breeds with known lifespans
  'Chihuahua': { average: 15, max: 20 },
  'Yorkshire Terrier': { average: 14, max: 17 },
  'Pomeranian': { average: 14, max: 16 },
  'Toy Poodle': { average: 15, max: 18 },
  'Dachshund': { average: 14, max: 17 },
  'Beagle': { average: 13, max: 16 },
  'Golden Retriever': { average: 11, max: 14 },
  'Labrador Retriever': { average: 11, max: 14 },
  'German Shepherd': { average: 10, max: 13 },
  'Bulldog': { average: 8, max: 12 },
  'French Bulldog': { average: 10, max: 14 },
  'Rottweiler': { average: 9, max: 12 },
  'Great Dane': { average: 7, max: 10 },
  'Mastiff': { average: 7, max: 10 },
  'Saint Bernard': { average: 8, max: 10 },
  'Irish Wolfhound': { average: 6, max: 10 },
  'Bernese Mountain Dog': { average: 7, max: 10 },

  // Cats
  'Cat': { average: 15, max: 25 },
  'Siamese': { average: 15, max: 20 },
  'Persian': { average: 14, max: 17 },
  'Maine Coon': { average: 12, max: 15 },
  'Ragdoll': { average: 15, max: 18 },

  // Other animals
  'Rabbit': { average: 8, max: 12 },
  'Guinea Pig': { average: 5, max: 8 },
  'Hamster': { average: 2, max: 3 },
  'Gerbil': { average: 3, max: 5 },
  'Rat': { average: 2, max: 3 },
  'Mouse': { average: 1.5, max: 3 },
  'Ferret': { average: 7, max: 10 },
  'Chinchilla': { average: 15, max: 20 },
  'Hedgehog': { average: 4, max: 7 },
  'Sugar Glider': { average: 12, max: 15 },
  'Parrot': { average: 40, max: 80 }, // Varies hugely by species
  'Cockatiel': { average: 15, max: 25 },
  'Budgerigar': { average: 7, max: 15 },
  'Canary': { average: 10, max: 15 },
  'Turtle': { average: 30, max: 100 }, // Some live very long
  'Bearded Dragon': { average: 10, max: 15 },
  'Leopard Gecko': { average: 15, max: 20 },
  'Ball Python': { average: 25, max: 35 },
};

// Get life expectancy for a pet based on breed/species
function getLifeExpectancy(pet: Pet): { average: number; max: number } {
  // Check breed first
  if (pet.breed && LIFE_EXPECTANCY[pet.breed]) {
    return LIFE_EXPECTANCY[pet.breed];
  }

  // For dogs, estimate based on weight (size category)
  if (pet.species.toLowerCase() === 'dog' && pet.weight) {
    if (pet.weight < 10) return LIFE_EXPECTANCY['Small Dog'];
    if (pet.weight < 25) return LIFE_EXPECTANCY['Medium Dog'];
    if (pet.weight < 45) return LIFE_EXPECTANCY['Large Dog'];
    return LIFE_EXPECTANCY['Giant Dog'];
  }

  // Fall back to species
  return LIFE_EXPECTANCY[pet.species] || { average: 10, max: 20 };
}

// Calculate maximum healthy weight for a species (absolute upper limit)
function getAbsoluteMaxWeight(species: string): number {
  const speciesLower = species.toLowerCase();
  if (speciesLower === 'dog') return 100; // Even largest breeds (Mastiff) rarely exceed 100kg
  if (speciesLower === 'cat') return 12; // Even Maine Coons rarely exceed 12kg
  if (speciesLower === 'rabbit') return 10; // Flemish Giants can be large
  return 50; // Default fallback
}

function getIdealWeight(pet: Pet): { min: number; max: number; ideal: number } {
  // First try breed-specific weight
  let range = BREED_WEIGHTS[pet.breed || ''];

  // Fall back to species default
  if (!range) {
    range = SPECIES_DEFAULT_WEIGHTS[pet.species] || { min: 3, max: 10 };
  }

  return {
    ...range,
    ideal: (range.min + range.max) / 2
  };
}

function calculateWeightScore(pet: Pet): { score: number; trend: { direction: 'up' | 'down' | 'stable'; value: string; isGood: boolean }; isCritical: boolean; reason?: string } {
  if (!pet.weight) {
    return { score: 50, trend: { direction: 'stable', value: '0kg', isGood: true }, isCritical: false, reason: 'No weight recorded' };
  }

  const { min, max, ideal } = getIdealWeight(pet);
  const weight = pet.weight;
  const absoluteMax = getAbsoluteMaxWeight(pet.species);

  // CRITICAL CHECK: Weight exceeds absolute maximum for species
  // A 111kg dog is morbidly obese or data error - automatic critical
  if (weight > absoluteMax) {
    const excess = weight - absoluteMax;
    return {
      score: Math.max(5, 20 - Math.floor(excess / 10) * 5), // Score drops rapidly
      trend: { direction: 'down', value: `${excess.toFixed(1)}kg over max`, isGood: false },
      isCritical: true,
      reason: `Weight ${weight}kg exceeds maximum healthy weight of ${absoluteMax}kg for ${pet.species}`
    };
  }

  // Calculate base score
  let score = 100;
  let reason: string | undefined;

  if (weight < min) {
    // Underweight scoring - more aggressive penalties
    const deficit = min - weight;
    const deficitPercent = (deficit / min) * 100;

    if (deficitPercent > 30) {
      // Severely underweight (>30% under min) = critical
      score = Math.max(15, 30 - deficitPercent / 2);
      reason = `Severely underweight: ${deficitPercent.toFixed(0)}% below minimum`;
    } else if (deficitPercent > 15) {
      // Moderately underweight
      score = Math.max(30, 60 - deficitPercent);
      reason = `Underweight: ${deficit.toFixed(1)}kg below minimum`;
    } else {
      // Slightly underweight
      score = Math.max(50, 80 - deficitPercent * 2);
    }
  } else if (weight > max) {
    // Overweight scoring - more aggressive penalties
    const excess = weight - max;
    const excessPercent = (excess / max) * 100;

    if (excessPercent > 50) {
      // Morbidly obese (>50% over max) = critical
      score = Math.max(10, 25 - excessPercent / 5);
      reason = `Morbidly obese: ${excessPercent.toFixed(0)}% above maximum`;
    } else if (excessPercent > 25) {
      // Obese
      score = Math.max(25, 50 - excessPercent);
      reason = `Obese: ${excess.toFixed(1)}kg above maximum`;
    } else if (excessPercent > 10) {
      // Overweight
      score = Math.max(40, 70 - excessPercent * 1.5);
      reason = `Overweight: ${excess.toFixed(1)}kg above ideal`;
    } else {
      // Slightly overweight
      score = Math.max(60, 85 - excessPercent * 2);
    }
  } else {
    // Within healthy range - calculate based on distance from ideal
    const distanceFromIdeal = Math.abs(weight - ideal);
    const rangeSize = max - min;
    score = 100 - (distanceFromIdeal / rangeSize) * 15; // Max 15 point penalty within range
  }

  const direction: 'up' | 'down' | 'stable' = weight > ideal ? 'down' : weight < ideal ? 'up' : 'stable';
  const isGood = (weight > ideal && direction === 'down') || (weight < ideal && direction === 'up') || direction === 'stable';

  return {
    score: Math.round(score),
    trend: { direction, value: `${Math.abs(weight - ideal).toFixed(1)}kg`, isGood },
    isCritical: score < 30,
    reason
  };
}

function calculateActivityScore(pet: Pet): { score: number; trend: { direction: 'up' | 'down' | 'stable'; value: string; isGood: boolean }; isCritical: boolean; reason?: string } {
  // Get life expectancy for realistic age scoring
  const lifeExpectancy = getLifeExpectancy(pet);
  let score = 100;
  let reason: string | undefined;
  let isCritical = false;

  if (pet.age) {
    // CRITICAL CHECK: Age exceeds biological maximum
    // A 23-year-old dog is biologically impossible - this is likely data error or zombie pet
    if (pet.age > lifeExpectancy.max) {
      score = 5; // Basically impossible age
      reason = `Age ${pet.age} years exceeds maximum life expectancy of ${lifeExpectancy.max} years for ${pet.breed || pet.species}`;
      isCritical = true;
    }
    // Very old pet - beyond average life expectancy but within max
    else if (pet.age > lifeExpectancy.average * 1.3) {
      // Pet is 30%+ older than average lifespan - geriatric, health concerns expected
      score = Math.max(20, 40 - (pet.age - lifeExpectancy.average) * 3);
      reason = `Geriatric: ${pet.age} years old (average lifespan: ${lifeExpectancy.average} years)`;
      isCritical = score < 30;
    }
    // Senior pet - approaching end of average lifespan
    else if (pet.age > lifeExpectancy.average) {
      const yearsOver = pet.age - lifeExpectancy.average;
      score = Math.max(40, 70 - yearsOver * 5);
      reason = `Senior: beyond average lifespan of ${lifeExpectancy.average} years`;
    }
    // Older adult - 80%+ of average lifespan
    else if (pet.age > lifeExpectancy.average * 0.8) {
      score = Math.max(60, 85 - (pet.age / lifeExpectancy.average) * 10);
    }
    // Middle-aged - 50-80% of average lifespan
    else if (pet.age > lifeExpectancy.average * 0.5) {
      score = Math.max(75, 95 - (pet.age / lifeExpectancy.average) * 5);
    }
    // Young adult/puppy - prime health years
    else {
      score = 100;
    }
  }

  const direction: 'up' | 'down' | 'stable' = pet.age && pet.age > lifeExpectancy.average * 0.8 ? 'down' : 'stable';

  return {
    score: Math.round(score),
    trend: {
      direction,
      value: pet.age
        ? (pet.age > lifeExpectancy.average ? `${pet.age}yr (senior)` : `${pet.age}yr old`)
        : 'Age unknown',
      isGood: score >= 70
    },
    isCritical,
    reason
  };
}

function calculateMedicalScore(pet: Pet, appointments: any[]): number {
  let score = 100;

  const petAppointments = appointments.filter(a => a.petId === pet.id);
  const recentAppointments = petAppointments.filter(a => 
    new Date(a.date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );

  if (recentAppointments.length === 0) {
    score -= 20;
  } else if (recentAppointments.length === 1) {
    score -= 5;
  }

  return Math.max(0, score);
}

function calculateAlertScore(pet: Pet, alerts: Alert[]): number {
  const petAlerts = alerts.filter(a => a.petId === pet.id && !a.resolved);
  
  if (petAlerts.length === 0) return 100;

  let score = 100;
  petAlerts.forEach(alert => {
    if (alert.severity === 'high') score -= 30;
    else if (alert.severity === 'medium') score -= 15;
    else score -= 5;
  });

  return Math.max(0, score);
}

export interface HealthRecord {
  id: string;
  petId: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  recordedAt: string;
  createdAt: string;
}

/**
 * Build real historical data from health records
 * Only shows data for days where records exist
 */
function buildHistoryFromRecords(
  pet: Pet,
  healthRecords: HealthRecord[],
  currentScore: number
): { scores: number[]; weights: number[]; activities: number[] } {
  // Filter records for this pet
  const petRecords = healthRecords.filter(r => r.petId === pet.id);

  // Get pet creation date
  const petCreatedAt = pet.createdAt ? new Date(pet.createdAt) : new Date();
  const now = new Date();
  const daysSinceCreation = Math.ceil((now.getTime() - petCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  // Limit to max 60 days, but only show days since pet was created
  const maxDays = Math.min(60, Math.max(1, daysSinceCreation));

  // Organize records by date
  const recordsByDate = new Map<string, { weights: number[]; activities: number[] }>();

  petRecords.forEach(record => {
    const date = new Date(record.recordedAt || record.createdAt).toISOString().split('T')[0];
    if (!recordsByDate.has(date)) {
      recordsByDate.set(date, { weights: [], activities: [] });
    }
    const dayData = recordsByDate.get(date)!;

    if (record.type === 'weight') {
      dayData.weights.push(record.value);
    } else if (record.type === 'activity' || record.type === 'exercise') {
      dayData.activities.push(record.value);
    }
  });

  // Build arrays for each day
  const scores: number[] = [];
  const weights: number[] = [];
  const activities: number[] = [];

  for (let i = maxDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = recordsByDate.get(dateStr);

    if (dayData) {
      // Use average if multiple records on same day
      if (dayData.weights.length > 0) {
        weights.push(dayData.weights.reduce((a, b) => a + b, 0) / dayData.weights.length);
      }
      if (dayData.activities.length > 0) {
        activities.push(dayData.activities.reduce((a, b) => a + b, 0) / dayData.activities.length);
      }
    }
  }

  // For scores, calculate based on existing component data for each day we have weights
  // If no weights recorded, just use today's score
  if (weights.length === 0 && pet.weight) {
    weights.push(pet.weight);
  }

  // Calculate score for each weight entry we have
  weights.forEach((weight, index) => {
    // Simplified score calculation based on weight deviation from ideal
    const { min, max, ideal } = getIdealWeight(pet);
    let weightScore = 100;
    if (weight < min) {
      const deficit = ((min - weight) / min) * 100;
      weightScore = Math.max(20, 100 - deficit * 2);
    } else if (weight > max) {
      const excess = ((weight - max) / max) * 100;
      weightScore = Math.max(20, 100 - excess * 2);
    }
    scores.push(Math.round(weightScore));
  });

  // If we still have no data at all, just show today's values
  if (scores.length === 0) {
    scores.push(currentScore);
  }
  if (weights.length === 0 && pet.weight) {
    weights.push(pet.weight);
  }
  if (activities.length === 0) {
    // Show 0 if no activity recorded
    activities.push(0);
  }

  return { scores, weights, activities };
}

/**
 * Calculate AI insights score based on recent insights
 * This considers both positive and negative insights from AI conversations
 */
function calculateAIInsightsScore(aiInsights: AIInsight[]): number {
  if (aiInsights.length === 0) return 100; // No insights = neutral/good

  let totalImpact = 0;
  for (const insight of aiInsights) {
    totalImpact += insight.scoreImpact;
  }

  // Convert total impact to a 0-100 score
  // Impact ranges from -30 to +15, map to 70-115 (capped at 100)
  const score = Math.round(100 + totalImpact);
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate automatic alerts based on pet data
 * This should be called when saving pet data to create alerts in the database
 */
export interface GeneratedAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
}

export function generateHealthAlerts(pet: Pet): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];
  const lifeExpectancy = getLifeExpectancy(pet);
  const { min, max } = getIdealWeight(pet);
  const absoluteMax = getAbsoluteMaxWeight(pet.species);

  // Age-based alerts
  if (pet.age) {
    if (pet.age > lifeExpectancy.max) {
      alerts.push({
        type: 'impossible_age',
        severity: 'high',
        message: `Age of ${pet.age} years exceeds maximum life expectancy (${lifeExpectancy.max} years) for ${pet.breed || pet.species}`,
        recommendation: 'Please verify the age is correct. This age is biologically impossible for this species/breed.'
      });
    } else if (pet.age > lifeExpectancy.average * 1.3) {
      alerts.push({
        type: 'geriatric_pet',
        severity: 'high',
        message: `${pet.name} is ${pet.age} years old - well beyond average lifespan of ${lifeExpectancy.average} years`,
        recommendation: 'Schedule frequent vet checkups (every 3-4 months). Monitor for age-related conditions closely.'
      });
    } else if (pet.age > lifeExpectancy.average) {
      alerts.push({
        type: 'senior_pet',
        severity: 'medium',
        message: `${pet.name} is a senior ${pet.species.toLowerCase()} at ${pet.age} years old`,
        recommendation: 'Consider twice-yearly vet visits and age-appropriate diet adjustments.'
      });
    }
  }

  // Weight-based alerts
  if (pet.weight) {
    // Extreme overweight
    if (pet.weight > absoluteMax) {
      alerts.push({
        type: 'extreme_overweight',
        severity: 'high',
        message: `Weight of ${pet.weight}kg is dangerously above healthy range (max ${absoluteMax}kg for ${pet.species})`,
        recommendation: 'URGENT: Consult veterinarian immediately. This weight level poses serious health risks including joint damage, heart disease, and reduced lifespan.'
      });
    } else if (pet.weight > max * 1.5) {
      // Morbidly obese (50%+ over max)
      alerts.push({
        type: 'morbidly_obese',
        severity: 'high',
        message: `${pet.name} is morbidly obese at ${pet.weight}kg (healthy range: ${min}-${max}kg)`,
        recommendation: 'Create a structured weight loss plan with your vet. Reduce food by 25-30% and increase exercise gradually.'
      });
    } else if (pet.weight > max * 1.25) {
      // Obese (25-50% over)
      alerts.push({
        type: 'obese',
        severity: 'medium',
        message: `${pet.name} is obese at ${pet.weight}kg (${((pet.weight - max) / max * 100).toFixed(0)}% above healthy maximum)`,
        recommendation: 'Reduce daily food intake by 15-20%. Consider a weight management diet formula.'
      });
    } else if (pet.weight > max) {
      // Overweight
      alerts.push({
        type: 'overweight',
        severity: 'low',
        message: `${pet.name} is ${(pet.weight - max).toFixed(1)}kg overweight`,
        recommendation: 'Monitor portions and increase daily activity by 15-20 minutes.'
      });
    }

    // Underweight alerts
    if (pet.weight < min * 0.7) {
      // Severely underweight (30%+ under min)
      alerts.push({
        type: 'severely_underweight',
        severity: 'high',
        message: `${pet.name} is severely underweight at ${pet.weight}kg (healthy minimum: ${min}kg)`,
        recommendation: 'URGENT: Consult veterinarian to rule out illness. May need high-calorie diet or medical intervention.'
      });
    } else if (pet.weight < min * 0.85) {
      // Moderately underweight
      alerts.push({
        type: 'underweight',
        severity: 'medium',
        message: `${pet.name} is underweight at ${pet.weight}kg (${((min - pet.weight) / min * 100).toFixed(0)}% below healthy minimum)`,
        recommendation: 'Increase food portions gradually. Consider higher calorie food or adding healthy supplements.'
      });
    } else if (pet.weight < min) {
      alerts.push({
        type: 'slightly_underweight',
        severity: 'low',
        message: `${pet.name} is ${(min - pet.weight).toFixed(1)}kg below ideal weight range`,
        recommendation: 'Slightly increase daily food portions and monitor weight weekly.'
      });
    }
  }

  return alerts;
}

/**
 * COMPREHENSIVE ALERT GENERATOR
 * Analyzes pet data + health records for complete health assessment
 * Considers: weight, age, activity levels, vaccination status, weight trends
 * No AI API calls - pure algorithmic analysis for speed and accuracy
 */
export interface ComprehensiveAlertInput {
  pet: Pet;
  healthRecords?: HealthRecord[];
  lastVaccinationDate?: Date;
  activityMinutesThisWeek?: number;
}

export function generateComprehensiveAlerts(input: ComprehensiveAlertInput): GeneratedAlert[] {
  const { pet, healthRecords = [], lastVaccinationDate, activityMinutesThisWeek } = input;

  // Start with basic pet data alerts
  const alerts = generateHealthAlerts(pet);
  const lifeExpectancy = getLifeExpectancy(pet);

  // --- ACTIVITY ALERTS ---
  if (activityMinutesThisWeek !== undefined) {
    // Calculate expected activity based on species and age
    let recommendedWeeklyMinutes: number;
    const ageRatio = pet.age ? pet.age / lifeExpectancy.average : 0.5;

    if (pet.species.toLowerCase() === 'dog') {
      // Dogs need more exercise, adjusted by age
      if (ageRatio > 0.8) {
        recommendedWeeklyMinutes = 150; // Senior dogs: ~20 min/day
      } else if (ageRatio > 0.5) {
        recommendedWeeklyMinutes = 300; // Adult dogs: ~45 min/day
      } else {
        recommendedWeeklyMinutes = 420; // Young dogs: ~60 min/day
      }
    } else if (pet.species.toLowerCase() === 'cat') {
      // Cats need less but still important
      recommendedWeeklyMinutes = ageRatio > 0.8 ? 70 : 150; // 10-20 min/day
    } else {
      // Other species - generic
      recommendedWeeklyMinutes = 100;
    }

    const activityPercent = (activityMinutesThisWeek / recommendedWeeklyMinutes) * 100;

    if (activityPercent < 30) {
      alerts.push({
        type: 'severely_low_activity',
        severity: 'high',
        message: `${pet.name}'s activity is critically low - only ${activityMinutesThisWeek} minutes this week (${activityPercent.toFixed(0)}% of recommended)`,
        recommendation: `Increase activity immediately. ${pet.species === 'Dog' ? 'Start with short 10-minute walks 3x daily' : 'Add interactive play sessions daily'}. Low activity leads to obesity, joint problems, and behavioral issues.`
      });
    } else if (activityPercent < 50) {
      alerts.push({
        type: 'low_activity',
        severity: 'medium',
        message: `${pet.name} needs more exercise - ${activityMinutesThisWeek} minutes this week (${activityPercent.toFixed(0)}% of recommended ${recommendedWeeklyMinutes} min)`,
        recommendation: `Aim for ${Math.ceil(recommendedWeeklyMinutes / 7)} minutes of activity daily. Regular exercise improves health, mood, and longevity.`
      });
    } else if (activityPercent < 70) {
      alerts.push({
        type: 'moderate_activity',
        severity: 'low',
        message: `${pet.name}'s activity is below optimal at ${activityMinutesThisWeek} minutes this week`,
        recommendation: `Try adding ${Math.ceil((recommendedWeeklyMinutes * 0.7 - activityMinutesThisWeek) / 7)} more minutes daily for better health.`
      });
    }
  }

  // --- VACCINATION ALERTS ---
  if (lastVaccinationDate) {
    const daysSinceVaccination = Math.floor((Date.now() - lastVaccinationDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthsSinceVaccination = daysSinceVaccination / 30;

    // Most vaccines need annual boosters
    if (monthsSinceVaccination > 14) {
      alerts.push({
        type: 'vaccination_overdue',
        severity: 'high',
        message: `${pet.name}'s vaccinations are ${Math.floor(monthsSinceVaccination - 12)} months overdue`,
        recommendation: 'Schedule a vet appointment immediately for booster shots. Outdated vaccinations leave your pet vulnerable to serious diseases.'
      });
    } else if (monthsSinceVaccination > 11) {
      alerts.push({
        type: 'vaccination_due_soon',
        severity: 'medium',
        message: `${pet.name}'s annual vaccinations are due within ${Math.ceil(12 - monthsSinceVaccination)} month(s)`,
        recommendation: 'Schedule a vet visit for annual booster vaccinations. Staying current protects against rabies, distemper, and other diseases.'
      });
    }
  } else {
    // No vaccination record at all
    alerts.push({
      type: 'no_vaccination_record',
      severity: 'medium',
      message: `No vaccination records found for ${pet.name}`,
      recommendation: 'Upload vaccination records or schedule a vet visit to ensure your pet is up-to-date on all shots.'
    });
  }

  // --- WEIGHT TREND ANALYSIS (from health records) ---
  const weightRecords = healthRecords
    .filter(r => r.type === 'weight')
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  if (weightRecords.length >= 3) {
    const recentWeight = weightRecords[0].value;
    const olderWeights = weightRecords.slice(1, 4).map(r => r.value);
    const avgOlderWeight = olderWeights.reduce((a, b) => a + b, 0) / olderWeights.length;

    const weightChangePercent = ((recentWeight - avgOlderWeight) / avgOlderWeight) * 100;

    if (weightChangePercent > 15) {
      alerts.push({
        type: 'rapid_weight_gain',
        severity: 'high',
        message: `${pet.name} has gained ${weightChangePercent.toFixed(1)}% weight recently (${avgOlderWeight.toFixed(1)}kg → ${recentWeight.toFixed(1)}kg)`,
        recommendation: 'Rapid weight gain may indicate overfeeding, reduced activity, or medical conditions like hypothyroidism. Consult your vet.'
      });
    } else if (weightChangePercent > 8) {
      alerts.push({
        type: 'weight_gain_trend',
        severity: 'medium',
        message: `${pet.name} is showing a weight gain trend (+${weightChangePercent.toFixed(1)}%)`,
        recommendation: 'Review food portions and treat frequency. Consider increasing activity to prevent obesity.'
      });
    } else if (weightChangePercent < -10) {
      alerts.push({
        type: 'rapid_weight_loss',
        severity: 'high',
        message: `${pet.name} has lost ${Math.abs(weightChangePercent).toFixed(1)}% weight recently (${avgOlderWeight.toFixed(1)}kg → ${recentWeight.toFixed(1)}kg)`,
        recommendation: 'IMPORTANT: Sudden weight loss can indicate illness, parasites, or dental problems. Schedule a vet checkup soon.'
      });
    } else if (weightChangePercent < -5) {
      alerts.push({
        type: 'weight_loss_trend',
        severity: 'medium',
        message: `${pet.name} is showing a weight loss trend (-${Math.abs(weightChangePercent).toFixed(1)}%)`,
        recommendation: 'Monitor food intake and appetite. Consider increasing portions or consulting your vet if it continues.'
      });
    }
  }

  // --- AGE + WEIGHT COMBINATION ALERTS ---
  if (pet.age && pet.weight) {
    const ageRatio = pet.age / lifeExpectancy.average;
    const { max: maxWeight } = getIdealWeight(pet);
    const weightRatio = pet.weight / maxWeight;

    // Senior + overweight is especially dangerous
    if (ageRatio > 0.8 && weightRatio > 1.2) {
      const existingObesityAlert = alerts.find(a =>
        a.type.includes('obese') || a.type.includes('overweight')
      );
      if (!existingObesityAlert) {
        alerts.push({
          type: 'senior_overweight_risk',
          severity: 'high',
          message: `${pet.name} is a senior pet carrying excess weight - this significantly increases health risks`,
          recommendation: 'Senior pets with extra weight face higher risks of arthritis, heart disease, and diabetes. Work with your vet on a gentle weight management plan.'
        });
      }
    }
  }

  // --- APPETITE ALERTS (from health records) ---
  const recentAppetiteRecords = healthRecords
    .filter(r => r.type === 'appetite')
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 5);

  if (recentAppetiteRecords.length > 0) {
    const avgAppetite = recentAppetiteRecords.reduce((sum, r) => sum + r.value, 0) / recentAppetiteRecords.length;
    const latestAppetite = recentAppetiteRecords[0].value;

    // Appetite is on 1-5 scale: 1=refusing food, 3=normal, 5=excessive
    if (latestAppetite <= 1.5 || avgAppetite <= 1.5) {
      alerts.push({
        type: 'poor_appetite',
        severity: 'high',
        message: `${pet.name} has poor appetite (${latestAppetite.toFixed(1)}/5) - refusing or barely eating`,
        recommendation: 'URGENT: Loss of appetite can indicate pain, infection, dental issues, or organ problems. Contact your vet within 24-48 hours if appetite doesn\'t improve.'
      });
    } else if (latestAppetite <= 2 || avgAppetite <= 2) {
      alerts.push({
        type: 'reduced_appetite',
        severity: 'medium',
        message: `${pet.name}'s appetite is below normal (${latestAppetite.toFixed(1)}/5)`,
        recommendation: 'Monitor food intake closely. Try warming food slightly or adding low-sodium broth. If it persists more than 2-3 days, consult your vet.'
      });
    } else if (latestAppetite >= 4.5 || avgAppetite >= 4.5) {
      alerts.push({
        type: 'excessive_appetite',
        severity: 'medium',
        message: `${pet.name} shows excessive appetite (${latestAppetite.toFixed(1)}/5) - constantly hungry`,
        recommendation: 'Excessive hunger can indicate diabetes, hyperthyroidism, or intestinal parasites. Consider a vet checkup if accompanied by weight changes.'
      });
    }
  }

  // --- TEMPERATURE ALERTS (from health records) ---
  const vitalRanges = getVitalSignRanges(pet);
  const recentTempRecords = healthRecords
    .filter(r => r.type === 'temperature')
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  if (recentTempRecords.length > 0) {
    const latestTemp = recentTempRecords[0].value;
    const tempRange = vitalRanges.temperature;

    if (latestTemp >= tempRange.critical_high) {
      alerts.push({
        type: 'critical_fever',
        severity: 'high',
        message: `CRITICAL: ${pet.name}'s temperature is dangerously high at ${latestTemp}°C (normal: ${tempRange.min}-${tempRange.max}°C)`,
        recommendation: 'EMERGENCY: This is a life-threatening temperature. Seek emergency veterinary care immediately. Apply cool (not cold) water to paw pads while transporting.'
      });
    } else if (latestTemp <= tempRange.critical_low) {
      alerts.push({
        type: 'critical_hypothermia',
        severity: 'high',
        message: `CRITICAL: ${pet.name}'s temperature is dangerously low at ${latestTemp}°C (normal: ${tempRange.min}-${tempRange.max}°C)`,
        recommendation: 'EMERGENCY: This is a life-threatening temperature. Wrap in warm blankets and seek emergency veterinary care immediately.'
      });
    } else if (latestTemp > tempRange.max) {
      alerts.push({
        type: 'fever',
        severity: 'medium',
        message: `${pet.name} has a fever at ${latestTemp}°C (normal: ${tempRange.min}-${tempRange.max}°C)`,
        recommendation: 'Fever often indicates infection or inflammation. Keep pet hydrated and monitor closely. Consult vet if fever persists more than 24 hours.'
      });
    } else if (latestTemp < tempRange.min) {
      alerts.push({
        type: 'low_temperature',
        severity: 'medium',
        message: `${pet.name}'s temperature is below normal at ${latestTemp}°C (normal: ${tempRange.min}-${tempRange.max}°C)`,
        recommendation: 'Low body temperature can indicate shock, illness, or hypothermia. Keep pet warm and consult your vet.'
      });
    }
  }

  // --- HEART RATE ALERTS (from health records) ---
  const recentHRRecords = healthRecords
    .filter(r => r.type === 'heart_rate')
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  if (recentHRRecords.length > 0) {
    const latestHR = recentHRRecords[0].value;
    const hrRange = vitalRanges.heartRate;

    if (latestHR >= hrRange.critical_high) {
      alerts.push({
        type: 'critical_tachycardia',
        severity: 'high',
        message: `CRITICAL: ${pet.name}'s heart rate is dangerously high at ${latestHR} bpm (normal: ${hrRange.min}-${hrRange.max} bpm)`,
        recommendation: 'EMERGENCY: Extremely rapid heart rate requires immediate veterinary attention. Keep pet calm and cool during transport.'
      });
    } else if (latestHR <= hrRange.critical_low) {
      alerts.push({
        type: 'critical_bradycardia',
        severity: 'high',
        message: `CRITICAL: ${pet.name}'s heart rate is dangerously low at ${latestHR} bpm (normal: ${hrRange.min}-${hrRange.max} bpm)`,
        recommendation: 'EMERGENCY: Very slow heart rate can indicate heart block or toxicity. Seek emergency veterinary care immediately.'
      });
    } else if (latestHR > hrRange.max) {
      alerts.push({
        type: 'elevated_heart_rate',
        severity: 'medium',
        message: `${pet.name}'s heart rate is elevated at ${latestHR} bpm (normal: ${hrRange.min}-${hrRange.max} bpm)`,
        recommendation: 'Elevated heart rate can indicate pain, stress, fever, or heart conditions. If persistent at rest, consult your vet.'
      });
    } else if (latestHR < hrRange.min) {
      alerts.push({
        type: 'low_heart_rate',
        severity: 'medium',
        message: `${pet.name}'s heart rate is below normal at ${latestHR} bpm (normal: ${hrRange.min}-${hrRange.max} bpm)`,
        recommendation: 'Low heart rate can be normal for athletic dogs or indicate heart issues. If pet seems lethargic, consult your vet.'
      });
    }
  }

  // --- CLINICAL SUMMARY / VET VISIT ALERTS (from extracted OCR data) ---
  // Analyzes clinical summaries from vet visits for actionable follow-ups
  const clinicalRecords = healthRecords
    .filter(r => r.type === 'clinical_summary' || r.type === 'diagnosis' || r.type === 'medication')
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  if (clinicalRecords.length > 0) {
    const latestClinical = clinicalRecords[0];
    const notes = latestClinical.notes?.toLowerCase() || '';
    const daysSinceVisit = Math.floor((Date.now() - new Date(latestClinical.recordedAt).getTime()) / (1000 * 60 * 60 * 24));

    // Check for concerning keywords in clinical notes
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'immediate', 'surgery', 'hospitalize'];
    const followUpKeywords = ['follow-up', 'recheck', 'return', 'monitor', 'review in'];
    const medicationKeywords = ['medication', 'prescription', 'antibiotic', 'steroid', 'daily', 'twice daily'];
    const conditionKeywords = ['infection', 'tumor', 'mass', 'disease', 'diabetes', 'kidney', 'liver', 'heart murmur'];

    const hasUrgent = urgentKeywords.some(k => notes.includes(k));
    const hasFollowUp = followUpKeywords.some(k => notes.includes(k));
    const hasMedication = medicationKeywords.some(k => notes.includes(k));
    const hasCondition = conditionKeywords.some(k => notes.includes(k));

    // Generate alerts based on clinical content
    if (hasUrgent && daysSinceVisit <= 7) {
      alerts.push({
        type: 'urgent_clinical_attention',
        severity: 'high',
        message: `${pet.name} has urgent clinical notes from ${daysSinceVisit === 0 ? 'today' : `${daysSinceVisit} days ago`}`,
        recommendation: 'Review the clinical summary carefully and ensure all urgent recommendations are being followed. Contact your vet if unsure.'
      });
    }

    if (hasFollowUp && daysSinceVisit > 7) {
      alerts.push({
        type: 'followup_reminder',
        severity: 'medium',
        message: `${pet.name} may need a follow-up visit (last clinical notes: ${daysSinceVisit} days ago)`,
        recommendation: 'Check your clinical records - a follow-up visit may have been recommended. Schedule with your vet if overdue.'
      });
    }

    if (hasMedication && daysSinceVisit > 14) {
      alerts.push({
        type: 'medication_check',
        severity: 'low',
        message: `${pet.name} was prescribed medication ${daysSinceVisit} days ago`,
        recommendation: 'Ensure medication course is complete. If symptoms persist or worsen, consult your vet about next steps.'
      });
    }

    if (hasCondition) {
      alerts.push({
        type: 'condition_monitoring',
        severity: 'medium',
        message: `${pet.name} has a diagnosed condition that requires ongoing monitoring`,
        recommendation: 'Pets with chronic conditions benefit from regular check-ups. Keep track of any symptom changes and maintain medication schedules.'
      });
    }
  }

  // --- MISSING RECENT DATA ALERTS ---
  // Encourage users to track regularly
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRecords = healthRecords.filter(r => new Date(r.recordedAt) > oneWeekAgo);

  if (recentRecords.length === 0 && healthRecords.length > 0) {
    alerts.push({
      type: 'no_recent_tracking',
      severity: 'low',
      message: `No health data logged for ${pet.name} in the past week`,
      recommendation: 'Regular tracking helps catch health issues early. Log weight, activity, or appetite today to maintain health visibility.'
    });
  }

  return alerts;
}

/**
 * Calculate activity score from health records
 * Uses actual recorded activity minutes vs recommended for species/age
 * NOW USES SPECIES-SPECIFIC ACTIVITY RECOMMENDATIONS FOR ALL PETS
 */
function calculateActivityFromRecords(pet: Pet, healthRecords: HealthRecord[]): { score: number; minutesThisWeek: number; recommendation: number; activityType: string } {
  // Get species-specific activity recommendation (already age-adjusted)
  const activityRec = getActivityRecommendation(pet);

  // Calculate recommended weekly minutes (optimal daily * 7)
  const recommendedWeeklyMinutes = activityRec.optimalDaily * 7;
  const minWeeklyMinutes = activityRec.minDaily * 7;

  // Get activity records from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activityRecords = healthRecords.filter(r =>
    (r.type === 'activity' || r.type === 'exercise') &&
    r.petId === pet.id &&
    new Date(r.recordedAt) > oneWeekAgo
  );

  const totalMinutes = activityRecords.reduce((sum, r) => sum + r.value, 0);
  const activityPercent = (totalMinutes / recommendedWeeklyMinutes) * 100;
  const minPercent = (totalMinutes / minWeeklyMinutes) * 100;

  let score: number;
  if (activityPercent >= 100) score = 100;
  else if (activityPercent >= 80) score = 90;
  else if (activityPercent >= 60) score = 75;
  else if (minPercent >= 100) score = 65; // Meeting minimum but not optimal
  else if (minPercent >= 70) score = 50;
  else if (minPercent >= 50) score = 40;
  else if (minPercent >= 30) score = 30;
  else score = 20;

  return {
    score,
    minutesThisWeek: totalMinutes,
    recommendation: recommendedWeeklyMinutes,
    activityType: activityRec.description
  };
}

/**
 * Calculate appetite score from health records
 * Appetite is rated 1-5 scale: 1=poor/refusing food, 3=normal, 5=excellent
 * Low appetite can indicate illness, while excessive appetite may signal metabolic issues
 */
function calculateAppetiteScore(pet: Pet, healthRecords: HealthRecord[]): { score: number; recentAppetite: number | null; trend: 'improving' | 'declining' | 'stable' | 'unknown'; hasRecentData: boolean } {
  // Get appetite records from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const appetiteRecords = healthRecords.filter(r =>
    r.type === 'appetite' &&
    r.petId === pet.id &&
    new Date(r.recordedAt) > oneWeekAgo
  ).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  if (appetiteRecords.length === 0) {
    return { score: 75, recentAppetite: null, trend: 'unknown', hasRecentData: false }; // No data - neutral score
  }

  // Most recent appetite value (1-5 scale)
  const recentAppetite = appetiteRecords[0].value;

  // Calculate average over the week
  const avgAppetite = appetiteRecords.reduce((sum, r) => sum + r.value, 0) / appetiteRecords.length;

  // Determine trend (compare recent to average)
  let trend: 'improving' | 'declining' | 'stable' | 'unknown' = 'stable';
  if (appetiteRecords.length >= 2) {
    const recentAvg = appetiteRecords.slice(0, Math.ceil(appetiteRecords.length / 2)).reduce((s, r) => s + r.value, 0) / Math.ceil(appetiteRecords.length / 2);
    const olderAvg = appetiteRecords.slice(Math.ceil(appetiteRecords.length / 2)).reduce((s, r) => s + r.value, 0) / (appetiteRecords.length - Math.ceil(appetiteRecords.length / 2)) || recentAvg;
    if (recentAvg > olderAvg + 0.3) trend = 'improving';
    else if (recentAvg < olderAvg - 0.3) trend = 'declining';
  }

  // Score calculation: Normal (3) is optimal, both extremes are concerning
  // 3 = 100 points, 2.5/3.5 = 90, 2/4 = 75, 1.5/4.5 = 60, 1/5 = 40
  let score: number;
  const deviation = Math.abs(avgAppetite - 3);
  if (deviation <= 0.2) score = 100; // Normal appetite
  else if (deviation <= 0.5) score = 90;
  else if (deviation <= 1) score = 75;
  else if (deviation <= 1.5) score = 55;
  else score = 35; // Very poor (1) or excessive (5) appetite

  // Extra penalty for declining trend
  if (trend === 'declining') {
    score = Math.max(20, score - 10);
  }

  return { score, recentAppetite, trend, hasRecentData: true };
}

/**
 * Calculate vaccination score from health records
 * Checks for up-to-date vaccinations and missing records
 */
function calculateVaccinationScore(pet: Pet, healthRecords: HealthRecord[]): { score: number; lastVaccination?: Date; monthsOverdue: number } {
  const vaccinationRecords = healthRecords.filter(r =>
    r.type === 'vaccination' && r.petId === pet.id
  ).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  if (vaccinationRecords.length === 0) {
    return { score: 60, monthsOverdue: -1 }; // No records - medium concern
  }

  const lastVaccination = new Date(vaccinationRecords[0].recordedAt);
  const monthsSince = (Date.now() - lastVaccination.getTime()) / (1000 * 60 * 60 * 24 * 30);

  let score: number;
  let monthsOverdue = 0;

  if (monthsSince <= 11) {
    score = 100; // Up to date
  } else if (monthsSince <= 12) {
    score = 90; // Due soon
  } else {
    monthsOverdue = Math.floor(monthsSince - 12);
    score = Math.max(20, 80 - monthsOverdue * 10); // Overdue
  }

  return { score, lastVaccination, monthsOverdue };
}

/**
 * Calculate score from OCR medical document data
 * Looks for blood work, lab results, diagnoses, medications, and other medical metrics
 * NOW USES SPECIES-SPECIFIC VITAL SIGN RANGES FOR ALL PETS
 * Only uses ACTUAL data from health_records table - no hallucination
 */
function calculateOCRMedicalScore(pet: Pet, healthRecords: HealthRecord[]): { score: number; hasRecentData: boolean; issues: string[] } {
  // All record types that contain medical data
  const ocrRecordTypes = ['blood_work', 'lab_result', 'medical_report', 'ocr_data', 'checkup', 'diagnosis', 'medication', 'temperature', 'heart_rate', 'respiratory_rate', 'blood_glucose', 'blood_pressure'];
  const ocrRecords = healthRecords.filter(r =>
    ocrRecordTypes.includes(r.type) && r.petId === pet.id
  ).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const issues: string[] = [];

  if (ocrRecords.length === 0) {
    return { score: 70, hasRecentData: false, issues: ['No medical records on file'] };
  }

  // Check if we have recent OCR data (within 6 months)
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const recentOCR = ocrRecords.filter(r => new Date(r.recordedAt) > sixMonthsAgo);

  if (recentOCR.length === 0) {
    return { score: 60, hasRecentData: false, issues: ['Medical records are older than 6 months'] };
  }

  let score = 100;

  // Get species-specific vital sign ranges for accurate scoring
  const vitalRanges = getVitalSignRanges(pet);

  // Check for diagnoses - any active diagnosis reduces score
  const diagnoses = recentOCR.filter(r => r.type === 'diagnosis');
  for (const diagnosis of diagnoses) {
    // severity: 1=low, 2=medium, 3=high
    if (diagnosis.value === 3) {
      score -= 25;
      issues.push(`High severity condition: ${diagnosis.notes || 'Unknown'}`);
    } else if (diagnosis.value === 2) {
      score -= 15;
      issues.push(`Medium severity condition: ${diagnosis.notes || 'Unknown'}`);
    } else {
      score -= 5;
    }
  }

  // Check for abnormal lab results (check notes for HIGH/LOW/CRITICAL)
  const labResults = recentOCR.filter(r => r.type === 'lab_result');
  for (const lab of labResults) {
    const notes = lab.notes?.toUpperCase() || '';
    if (notes.includes('CRITICAL')) {
      score -= 20;
      issues.push(`Critical lab result: ${lab.notes}`);
    } else if (notes.includes('HIGH') || notes.includes('LOW')) {
      score -= 10;
      issues.push(`Abnormal lab result: ${lab.notes}`);
    }
  }

  // === TEMPERATURE CHECK - Using species-specific ranges ===
  const tempRecords = recentOCR.filter(r => r.type === 'temperature');
  if (tempRecords.length > 0) {
    const latestTemp = tempRecords[0].value;
    const tempRange = vitalRanges.temperature;

    // Critical temperature (life-threatening)
    if (latestTemp >= tempRange.critical_high || latestTemp <= tempRange.critical_low) {
      score -= 25;
      issues.push(`CRITICAL temperature: ${latestTemp}°C (normal: ${tempRange.min}-${tempRange.max}°C)`);
    }
    // Abnormal but not critical
    else if (latestTemp > tempRange.max || latestTemp < tempRange.min) {
      score -= 15;
      issues.push(`Abnormal temperature: ${latestTemp}°C (normal: ${tempRange.min}-${tempRange.max}°C)`);
    }
    // Slightly outside optimal but within acceptable
    else if (latestTemp > tempRange.max - 0.3 || latestTemp < tempRange.min + 0.3) {
      score -= 5;
    }
  }

  // === HEART RATE CHECK - Using species-specific ranges ===
  const heartRateRecords = recentOCR.filter(r => r.type === 'heart_rate');
  if (heartRateRecords.length > 0) {
    const latestHR = heartRateRecords[0].value;
    const hrRange = vitalRanges.heartRate;

    // Critical heart rate
    if (latestHR >= hrRange.critical_high || latestHR <= hrRange.critical_low) {
      score -= 25;
      issues.push(`CRITICAL heart rate: ${latestHR} bpm (normal: ${hrRange.min}-${hrRange.max})`);
    }
    // Abnormal but not critical
    else if (latestHR > hrRange.max || latestHR < hrRange.min) {
      score -= 15;
      issues.push(`Abnormal heart rate: ${latestHR} bpm (normal: ${hrRange.min}-${hrRange.max})`);
    }
    // Slightly outside optimal
    else if (latestHR > hrRange.max * 0.95 || latestHR < hrRange.min * 1.05) {
      score -= 5;
    }
  }

  // === RESPIRATORY RATE CHECK - Using species-specific ranges ===
  const respRecords = recentOCR.filter(r => r.type === 'respiratory_rate');
  if (respRecords.length > 0) {
    const latestResp = respRecords[0].value;
    const respRange = vitalRanges.respiratoryRate;

    // Critical respiratory rate
    if (latestResp >= respRange.critical_high || latestResp <= respRange.critical_low) {
      score -= 25;
      issues.push(`CRITICAL respiratory rate: ${latestResp}/min (normal: ${respRange.min}-${respRange.max})`);
    }
    // Abnormal but not critical
    else if (latestResp > respRange.max || latestResp < respRange.min) {
      score -= 15;
      issues.push(`Abnormal respiratory rate: ${latestResp}/min (normal: ${respRange.min}-${respRange.max})`);
    }
  }

  // Active medications - not necessarily bad, but indicates ongoing treatment
  const medications = recentOCR.filter(r => r.type === 'medication');
  if (medications.length > 3) {
    score -= 10;
    issues.push(`On ${medications.length} medications - complex treatment regimen`);
  } else if (medications.length > 0) {
    score -= 3 * medications.length;
  }

  // Bonus for recent checkup
  const checkups = recentOCR.filter(r => r.type === 'checkup' || r.type === 'medical_report');
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentCheckup = checkups.some(r => new Date(r.recordedAt) > threeMonthsAgo);
  if (recentCheckup) {
    score += 5; // Bonus for recent vet visit
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), hasRecentData: true, issues };
}

/**
 * Calculate weight score from health records (trends and current)
 */
function calculateWeightFromRecords(pet: Pet, healthRecords: HealthRecord[]): { score: number; trend: string; currentVsIdeal: number } {
  const weightRecords = healthRecords
    .filter(r => r.type === 'weight' && r.petId === pet.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  // Use most recent weight from records if pet.weight is not set
  const currentWeight = weightRecords.length > 0 ? weightRecords[0].value : pet.weight;

  if (!currentWeight) {
    return { score: 50, trend: 'unknown', currentVsIdeal: 0 };
  }

  const { min, max, ideal } = getIdealWeight(pet);
  const absoluteMax = getAbsoluteMaxWeight(pet.species);

  let score = 100;
  let trend = 'stable';

  // Check for weight trend
  if (weightRecords.length >= 3) {
    const recentWeight = weightRecords[0].value;
    const olderWeights = weightRecords.slice(1, 4).map(r => r.value);
    const avgOlderWeight = olderWeights.reduce((a, b) => a + b, 0) / olderWeights.length;
    const changePercent = ((recentWeight - avgOlderWeight) / avgOlderWeight) * 100;

    if (changePercent > 10) trend = 'gaining';
    else if (changePercent < -10) trend = 'losing';
  }

  // Critical check: exceeds absolute max
  if (currentWeight > absoluteMax) {
    score = Math.max(5, 20 - Math.floor((currentWeight - absoluteMax) / 10) * 5);
  } else if (currentWeight < min) {
    const deficit = ((min - currentWeight) / min) * 100;
    score = Math.max(15, 100 - deficit * 2);
  } else if (currentWeight > max) {
    const excess = ((currentWeight - max) / max) * 100;
    score = Math.max(15, 100 - excess * 1.5);
  }

  return { score: Math.round(score), trend, currentVsIdeal: currentWeight - ideal };
}

/**
 * MAIN CALCULATION - Used EVERYWHERE
 * COMPREHENSIVE: Uses ALL metrics including OCR, vaccination, activity records
 * Uses REAL health records data, not fake generated history
 * IMPROVED: Realistic scoring with critical flags for impossible values
 */
export function calculateUnifiedHealthScore(
  pet: Pet,
  alerts: Alert[],
  appointments: any[],
  aiInsightsData: AIInsight[] = [],
  healthRecords: HealthRecord[] = []
): UnifiedHealthScore {
  // Calculate all component scores from ACTUAL data
  const weightResult = calculateWeightScore(pet);
  const activityResult = calculateActivityScore(pet);
  const medicalScore = calculateMedicalScore(pet, appointments);
  const alertScore = calculateAlertScore(pet, alerts);
  const aiInsightsScore = calculateAIInsightsScore(aiInsightsData);

  // NEW: Calculate scores from health records (activity, vaccination, OCR, weight trends, appetite)
  const activityFromRecords = calculateActivityFromRecords(pet, healthRecords);
  const vaccinationData = calculateVaccinationScore(pet, healthRecords);
  const ocrData = calculateOCRMedicalScore(pet, healthRecords);
  const weightFromRecords = calculateWeightFromRecords(pet, healthRecords);
  const appetiteData = calculateAppetiteScore(pet, healthRecords);

  // Blend activity score with records-based activity (prefer records if available)
  const blendedActivityScore = activityFromRecords.minutesThisWeek > 0
    ? Math.round((activityResult.score * 0.3) + (activityFromRecords.score * 0.7))
    : activityResult.score;

  // Blend weight score with records-based weight (prefer records if available)
  const blendedWeightScore = healthRecords.filter(r => r.type === 'weight' && r.petId === pet.id).length > 0
    ? Math.round((weightResult.score * 0.3) + (weightFromRecords.score * 0.7))
    : weightResult.score;

  // Check for critical conditions - determine severity level
  const hasCriticalWeight = weightResult.isCritical;
  const hasCriticalAge = activityResult.isCritical;

  // Blend medical score with vaccination and OCR data
  const blendedMedicalScore = Math.round(
    medicalScore * 0.4 +
    vaccinationData.score * 0.35 +
    ocrData.score * 0.25
  );

  // Calculate weighted average - NOW USES ALL METRICS INCLUDING APPETITE
  // Weights: weight 18%, activity 18%, medical+vaccination+OCR 22%, alerts 12%, AI insights 10%, age 10%, appetite 10%
  // Only include appetite in calculation if we have appetite data
  const appetiteWeight = appetiteData.hasRecentData ? 0.10 : 0;
  const otherWeightMultiplier = appetiteData.hasRecentData ? 0.90 : 1.0; // Scale other weights if appetite has data

  let overall = Math.round(
    blendedWeightScore * 0.20 * otherWeightMultiplier +        // Weight (from records if available)
    blendedActivityScore * 0.20 * otherWeightMultiplier +       // Activity (from records if available)
    blendedMedicalScore * 0.25 * otherWeightMultiplier +        // Medical (appointments + vaccination + OCR)
    alertScore * 0.15 * otherWeightMultiplier +                 // Unresolved alerts
    aiInsightsScore * 0.10 * otherWeightMultiplier +            // AI-derived insights
    activityResult.score * 0.10 * otherWeightMultiplier +       // Age/lifecycle score
    appetiteData.score * appetiteWeight                          // Appetite (10% if data exists)
  );

  // SEVERITY-BASED CAPPING: More nuanced approach
  // 1. Truly impossible values (age > absolute max) = hard cap at 15
  // 2. Dangerous but possible values (severely overweight, very old) = cap at 35
  // 3. Concerning values = cap at 50
  const lifeExpectancy = getLifeExpectancy(pet);
  const absoluteMaxWeight = getAbsoluteMaxWeight(pet.species);

  // Determine severity level
  let severityLevel: 'impossible' | 'dangerous' | 'concerning' | 'normal' = 'normal';

  if (pet.age && pet.age > lifeExpectancy.max) {
    // Age exceeds biological maximum - likely data error
    severityLevel = 'impossible';
  } else if (pet.weight && pet.weight > absoluteMaxWeight * 1.5) {
    // Weight 50%+ over absolute max - dangerous obesity
    severityLevel = 'impossible';
  } else if (hasCriticalWeight || hasCriticalAge) {
    // Critical but possible - very concerning health state
    severityLevel = 'dangerous';
  } else if (weightResult.score < 40 || activityResult.score < 40) {
    // Poor scores but not critical
    severityLevel = 'concerning';
  }

  // Apply severity caps
  if (severityLevel === 'impossible') {
    overall = Math.min(overall, 15); // Hard cap for impossible data
  } else if (severityLevel === 'dangerous') {
    overall = Math.min(overall, 35); // Cap for dangerous health state
  } else if (severityLevel === 'concerning') {
    overall = Math.min(overall, 55); // Cap for concerning state
  }

  let status: UnifiedHealthScore['status'];
  let statusColor: string;
  let statusBg: string;

  // Adjusted thresholds - based on severity level
  if (severityLevel === 'impossible' || severityLevel === 'dangerous') {
    status = 'critical';
    statusColor = 'text-red-700';
    statusBg = 'bg-red-100';
  } else if (overall >= 85) {
    status = 'excellent';
    statusColor = 'text-green-700';
    statusBg = 'bg-green-100';
  } else if (overall >= 70) {
    status = 'good';
    statusColor = 'text-blue-700';
    statusBg = 'bg-blue-100';
  } else if (overall >= 50) {
    status = 'fair';
    statusColor = 'text-amber-700';
    statusBg = 'bg-amber-100';
  } else if (overall >= 30) {
    status = 'poor';
    statusColor = 'text-orange-700';
    statusBg = 'bg-orange-100';
  } else {
    status = 'critical';
    statusColor = 'text-red-700';
    statusBg = 'bg-red-100';
  }

  const overallTrend: UnifiedHealthScore['trends']['overall']['direction'] = 
    weightResult.trend.isGood && activityResult.trend.isGood ? 'improving' :
    !weightResult.trend.isGood || !activityResult.trend.isGood ? 'declining' :
    'stable';

  const insights: string[] = [];
  const { min, max } = getIdealWeight(pet);

  // Weight insights
  if (blendedWeightScore < 70) {
    if (pet.weight && pet.weight < min) {
      const deficit = min - pet.weight;
      insights.push(`${pet.name} is ${deficit.toFixed(1)}kg underweight (ideal: ${min}-${max}kg)`);
    } else if (pet.weight && pet.weight > max) {
      const excess = pet.weight - max;
      insights.push(`${pet.name} is ${excess.toFixed(1)}kg overweight (ideal: ${min}-${max}kg)`);
    }
  }

  // Activity insights from ACTUAL records
  if (activityFromRecords.minutesThisWeek > 0) {
    const activityPercent = (activityFromRecords.minutesThisWeek / activityFromRecords.recommendation) * 100;
    if (activityPercent < 70) {
      insights.push(`Activity ${activityPercent.toFixed(0)}% of target - ${pet.name} needs ${activityFromRecords.recommendation - activityFromRecords.minutesThisWeek} more minutes this week`);
    }
  } else if (activityResult.score < 80) {
    insights.push(`Activity declining - ${pet.age}yr old ${pet.breed || pet.species} needs ${pet.species === 'Dog' ? '60-90min' : '30-45min'} daily`);
  }

  // Vaccination insights
  if (vaccinationData.monthsOverdue > 0) {
    insights.push(`Vaccinations ${vaccinationData.monthsOverdue} month${vaccinationData.monthsOverdue > 1 ? 's' : ''} overdue - schedule vet visit`);
  } else if (vaccinationData.monthsOverdue === -1) {
    insights.push(`No vaccination records on file - upload records or schedule checkup`);
  }

  // Medical/OCR insights
  if (!ocrData.hasRecentData && medicalScore < 85) {
    insights.push(`No recent medical records - schedule veterinary checkup`);
  }

  // Add OCR-detected issues to insights
  if (ocrData.issues && ocrData.issues.length > 0) {
    // Add top 2 most important OCR issues
    for (const issue of ocrData.issues.slice(0, 2)) {
      if (!issue.includes('No medical records')) {
        insights.push(issue);
      }
    }
  }

  // Alert insights
  if (alertScore < 80) {
    const urgentAlerts = alerts.filter(a => a.petId === pet.id && !a.resolved && a.severity === 'high');
    if (urgentAlerts.length > 0) {
      insights.push(`${urgentAlerts.length} urgent ${urgentAlerts.length === 1 ? 'alert requires' : 'alerts require'} immediate attention`);
    }
  }

  // AI-derived insights
  const unresolvedAIInsights = aiInsightsData.filter(i => i.scoreImpact < 0);
  if (unresolvedAIInsights.length > 0) {
    const highSeverityCount = unresolvedAIInsights.filter(i => i.severity === 'high').length;
    if (highSeverityCount > 0) {
      insights.push(`${highSeverityCount} health concern${highSeverityCount > 1 ? 's' : ''} identified from AI chat history`);
    } else if (unresolvedAIInsights.length > 0) {
      insights.push(`${unresolvedAIInsights.length} observation${unresolvedAIInsights.length > 1 ? 's' : ''} from recent conversations`);
    }
  }

  // Appetite insights
  if (appetiteData.hasRecentData && appetiteData.recentAppetite !== null) {
    if (appetiteData.score < 60) {
      // Poor appetite (1) or excessive appetite (5)
      if (appetiteData.recentAppetite <= 2) {
        insights.push(`${pet.name}'s appetite is low (${appetiteData.recentAppetite}/5) - monitor for illness or stress`);
      } else if (appetiteData.recentAppetite >= 4) {
        insights.push(`${pet.name}'s appetite is elevated (${appetiteData.recentAppetite}/5) - monitor for medical causes`);
      }
    }
    if (appetiteData.trend === 'declining') {
      insights.push(`Appetite trend declining - schedule vet check if continues`);
    }
  }

  const recommendations: string[] = [];
  if (overall < 75) {
    recommendations.push('Book comprehensive health assessment within 2 weeks');
  }
  if (weightResult.score < 80) {
    const { ideal } = getIdealWeight(pet);
    if (pet.weight && pet.weight > ideal) {
      recommendations.push(`Reduce daily food by 15-20%, target weight: ${ideal.toFixed(1)}kg`);
    } else if (pet.weight && pet.weight < ideal) {
      recommendations.push(`Increase food gradually, target weight: ${ideal.toFixed(1)}kg`);
    }
  }
  if (activityResult.score < 80) {
    recommendations.push(`Add 15min walking sessions, 2x daily`);
  }
  if (appetiteData.hasRecentData && appetiteData.score < 70) {
    if (appetiteData.recentAppetite && appetiteData.recentAppetite <= 2) {
      recommendations.push(`Try warming food slightly or adding low-sodium broth to encourage eating`);
    } else if (appetiteData.recentAppetite && appetiteData.recentAppetite >= 4) {
      recommendations.push(`Rule out medical causes for increased appetite - consult vet`);
    }
  }

  const { ideal } = getIdealWeight(pet);

  // Use REAL historical data from health records, not fake generated data
  const realHistory = buildHistoryFromRecords(pet, healthRecords, overall);

  return {
    overall,
    components: {
      weight: blendedWeightScore,
      activity: blendedActivityScore,
      medical: blendedMedicalScore,
      alerts: alertScore,
      aiInsights: aiInsightsScore,
      appetite: appetiteData.score,
    },
    status,
    statusColor,
    statusBg,
    trends: {
      weight: weightResult.trend,
      activity: activityResult.trend,
      appetite: { direction: appetiteData.trend, isGood: appetiteData.trend !== 'declining' },
      overall: { direction: overallTrend },
    },
    insights,
    recommendations,
    aiInsights: aiInsightsData,
    history: realHistory,
  };
}

/**
 * MEANINGFUL METRICS - Each one tells user something actionable
 */
export function getMeaningfulMetrics(
  pet: Pet,
  healthScore: UnifiedHealthScore
): MeaningfulMetric[] {
  const { min, max, ideal } = getIdealWeight(pet);
  const currentWeight = pet.weight || ideal;
  const weightDeficit = currentWeight - ideal;

  // Activity target based on age + species (in MINUTES, not steps!)
  const activityTarget = pet.species === 'Dog'
    ? (pet.age && pet.age > 8 ? 60 : 90)
    : (pet.age && pet.age > 8 ? 30 : 45);
  const currentActivity = healthScore.history.activities[healthScore.history.activities.length - 1];
  const activityPercent = Math.round((currentActivity / activityTarget) * 100);

  return [
    {
      title: 'Weight Status',
      current: currentWeight,
      ideal: { min, max },
      unit: 'kg',
      status: Math.abs(weightDeficit) < 2 ? 'excellent' : Math.abs(weightDeficit) < 4 ? 'good' : 'needs_attention',
      explanation: weightDeficit > 4 
        ? `${weightDeficit.toFixed(1)}kg OVER ideal - diet adjustment needed`
        : weightDeficit > 0
        ? `${weightDeficit.toFixed(1)}kg above ideal - monitor portion sizes`
        : weightDeficit < -2
        ? `${Math.abs(weightDeficit).toFixed(1)}kg UNDER ideal - increase food intake`
        : `Perfect weight! Maintain current diet`,
      recommendation: weightDeficit > 4 
        ? `Reduce portions by 20%, target: ${ideal.toFixed(1)}kg`
        : weightDeficit < -2
        ? `Increase portions by 15%, target: ${ideal.toFixed(1)}kg`
        : undefined,
      sparklineData: healthScore.history.weights.slice(-14),
      trend: healthScore.trends.weight.direction,
      trendValue: healthScore.trends.weight.value,
      color: 'green'
    },
    {
      title: 'Daily Activity',
      current: currentActivity,
      ideal: activityTarget,
      unit: 'minutes',
      status: activityPercent >= 90 ? 'excellent' : activityPercent >= 70 ? 'good' : 'needs_attention',
      explanation: activityPercent >= 90
        ? `Meeting daily target! Keep it up`
        : `${100 - activityPercent}% BELOW target for ${pet.age}yr ${pet.breed}`,
      recommendation: activityPercent < 90
        ? `Add ${Math.round(activityTarget - currentActivity)} more minutes of activity`
        : undefined,
      sparklineData: healthScore.history.activities.slice(-14),
      trend: healthScore.trends.activity.direction,
      trendValue: `${activityPercent}% of goal`,
      color: 'blue'
    }
  ];
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
}

export function formatHealthScore(score: number, format: 'percentage' | 'outof100' = 'percentage'): string {
  return format === 'percentage' ? `${score}%` : `${score}/100`;
}

