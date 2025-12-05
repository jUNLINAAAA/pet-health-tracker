# Pet Health Tracker - Data Codebook

This document describes all data tables, variables, and their meanings used in the Pet Health Tracker application.

---

## Overview

The application uses a PostgreSQL database (via Supabase) with the following main tables:

| Table | Purpose | Records Created By |
|-------|---------|-------------------|
| pets | Pet profile information | User manually adds pets |
| health_records | Health measurements and activities | User manual entry or AI OCR extraction |
| alerts | Health warnings and notifications | System automatically generates |
| appointments | Vet visit scheduling | User manually schedules |
| health_scores | Computed health ratings | System automatically calculates |
| assistant_messages | AI chat history | System records conversations |
| ai_health_insights | AI-detected health patterns | System extracts from conversations |
| user_profiles | User account settings | User creates on signup |

---

## System Integration Flow

All components are connected in a unified data pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INPUT SOURCES                           │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Manual Entry   │   OCR Scanner   │      AI Assistant           │
│  (Add Record)   │  (Upload Doc)   │    (Chat Messages)          │
└────────┬────────┴────────┬────────┴────────────┬────────────────┘
         │                 │                     │
         v                 v                     v
┌─────────────────────────────────────────────────────────────────┐
│                    health_records table                          │
│  (All data converges here - weight, vitals, vaccinations, etc.) │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              v               v               v
     ┌────────────────┐ ┌──────────┐ ┌──────────────────┐
     │ Alert Engine   │ │ Health   │ │ AI Insights      │
     │ (2-tier check) │ │ Score    │ │ Pattern Detector │
     └────────┬───────┘ │ Calc     │ └────────┬─────────┘
              │         └────┬─────┘          │
              v              v                v
     ┌────────────────┐ ┌──────────┐ ┌──────────────────┐
     │ alerts table   │ │ health_  │ │ ai_health_       │
     │                │ │ scores   │ │ insights table   │
     └────────────────┘ └──────────┘ └──────────────────┘
```

### Integration Details

| Input | Creates | Triggers |
|-------|---------|----------|
| Manual health record | health_records entry | Score recalculation + Alert check |
| OCR document upload | Multiple health_records | Score recalculation + Alert check |
| AI chat message | ai_health_insights | Pattern-based alerts |
| New pet added | Initial alerts | Breed-specific health checks |

---

## Table: pets

Stores basic information about each pet.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | Unique identifier | "a1b2c3d4-..." |
| user_id | uuid | Yes | Owner's user ID (foreign key to auth.users) | "e5f6g7h8-..." |
| name | text | Yes | Pet's name | "Max", "Luna", "Buddy" |
| species | text | Yes | Animal type | "dog", "cat", "bird", "rabbit", "fish", "reptile", "hamster" |
| breed | text | No | Specific breed within species | "Golden Retriever", "Persian", "Cockatiel" |
| age | integer | No | Age in years | 3, 7, 12 |
| weight | decimal | No | Current weight in kilograms | 5.2, 25.5, 0.03 |
| image | text | No | URL to pet photo in storage | "https://...supabase.co/storage/..." |
| activity_minutes | integer | No | Total activity minutes recorded | 120, 450, 30 |
| created_at | timestamp | Yes | When pet was added | "2024-01-15T10:30:00Z" |
| updated_at | timestamp | Yes | Last profile update | "2024-03-20T14:45:00Z" |

**Species Values Explained**:
- `dog` - Dogs of any breed
- `cat` - Cats of any breed
- `bird` - Birds including parrots, canaries, finches, etc.
- `rabbit` - Rabbits and bunnies
- `fish` - Aquarium fish of any type
- `reptile` - Snakes, lizards, turtles, etc.
- `hamster` - Hamsters, guinea pigs, gerbils, and other small mammals

---

## Table: health_records

Stores all health measurements, activities, and medical records.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | Unique identifier | "x1y2z3..." |
| pet_id | uuid | Yes | Which pet this record belongs to | "a1b2c3d4-..." |
| user_id | uuid | Yes | Owner's user ID | "e5f6g7h8-..." |
| type | text | Yes | Type of health record | See "Record Types" below |
| value | decimal | Yes | Numeric measurement | 5.2, 38.5, 120, 30 |
| unit | text | Yes | Unit of measurement | See "Units" below |
| notes | text | No | Additional context or details | "After morning walk" |
| recorded_at | timestamp | Yes | When measurement was taken | "2024-03-20T09:00:00Z" |
| created_at | timestamp | Yes | When record was created | "2024-03-20T09:15:00Z" |

### Record Types

| Type Value | What It Measures | Typical Range | Unit |
|------------|------------------|---------------|------|
| weight | Body weight | 0.01 - 100 kg | kg |
| temperature | Body temperature | 35 - 42 °C | °C |
| heart_rate | Heart beats per minute | 40 - 300 bpm | bpm |
| respiratory_rate | Breaths per minute | 10 - 60 brpm | brpm |
| appetite | Eating behavior (1=poor, 5=excellent) | 1 - 5 | /5 |
| activity | Exercise duration | 1 - 480 minutes | minutes |
| vaccination | Vaccine administered | 1 (always) | dose |
| clinical_summary | Vet visit summary | 1 (always) | visit |

### Units Explained

| Unit | Full Name | Used For |
|------|-----------|----------|
| kg | Kilograms | Weight measurements |
| °C | Degrees Celsius | Body temperature |
| bpm | Beats per minute | Heart rate |
| brpm | Breaths per minute | Respiratory rate |
| /5 | Scale of 5 | Appetite rating |
| minutes | Minutes | Activity duration |
| dose | Single dose | Vaccination count |
| visit | Single visit | Clinical visit count |

---

## Table: alerts

Stores health warnings and notifications for pets.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | Unique identifier | "m1n2o3..." |
| pet_id | uuid | Yes | Which pet this alert is for | "a1b2c3d4-..." |
| user_id | uuid | Yes | Owner's user ID | "e5f6g7h8-..." |
| type | text | Yes | Category of alert | "weight", "vaccination", "checkup" |
| severity | text | Yes | How urgent the alert is | "low", "medium", "high" |
| title | text | Yes | Short alert headline | "Weight gain detected" |
| message | text | Yes | Detailed alert message | "Max has gained 2kg in the past month..." |
| is_resolved | boolean | Yes | Whether alert has been addressed | true, false |
| resolved_at | timestamp | No | When alert was resolved | "2024-03-25T10:00:00Z" |
| created_at | timestamp | Yes | When alert was created | "2024-03-20T08:00:00Z" |

### Alert Severity Levels

| Severity | Meaning | Action Needed |
|----------|---------|---------------|
| low | Informational | No immediate action, just awareness |
| medium | Attention needed | Schedule a vet visit soon |
| high | Urgent | Seek veterinary care promptly |

### Alert Types

| Type | What It Detects |
|------|-----------------|
| weight_change | Significant weight change (gain or loss) |
| vaccination_due | Vaccination due or overdue |
| checkup_reminder | Regular checkup reminder |
| obesity_warning | BCS 8-9 indicating obesity |
| underweight_warning | BCS 1-2 indicating severe underweight |
| abnormal_lab | Abnormal values detected from OCR documents |

### Alert Trigger Rules

| Trigger Condition | Alert Type | Severity |
|-------------------|------------|----------|
| Weight change >10% in 30 days | weight_change | medium |
| Weight change >20% in 30 days | weight_change | high |
| No vaccination in 365 days | vaccination_due | medium |
| No vet checkup in 365 days | checkup_reminder | low |
| BCS 8-9 (obese) | obesity_warning | high |
| BCS 1-2 (underweight) | underweight_warning | high |
| Abnormal lab values from OCR | abnormal_lab | medium/high |

---

## Table: appointments

Stores scheduled vet visits and other appointments.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | Unique identifier | "p1q2r3..." |
| pet_id | uuid | Yes | Which pet the appointment is for | "a1b2c3d4-..." |
| user_id | uuid | Yes | Owner's user ID | "e5f6g7h8-..." |
| clinic_name | text | No | Name of veterinary clinic | "Happy Paws Clinic" |
| clinic_address | text | No | Physical address | "123 Main St, City" |
| clinic_phone | text | No | Contact phone number | "+1-555-123-4567" |
| veterinarian | text | No | Vet's name | "Dr. Sarah Smith" |
| date | date | Yes | Appointment date | "2024-04-15" |
| time | time | No | Appointment time | "10:30:00" |
| reason | text | Yes | Purpose of visit | "Annual checkup" |
| notes | text | No | Additional notes | "Bring vaccination records" |
| status | text | Yes | Appointment status | "scheduled", "completed", "cancelled" |
| created_at | timestamp | Yes | When appointment was created | "2024-03-20T11:00:00Z" |

### Appointment Status Values

| Status | Meaning |
|--------|---------|
| scheduled | Upcoming appointment |
| completed | Appointment has happened |
| cancelled | Appointment was cancelled |

---

## Table: health_scores

Stores computed health ratings for each pet.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | Unique identifier | "s1t2u3..." |
| pet_id | uuid | Yes | Which pet this score is for | "a1b2c3d4-..." |
| user_id | uuid | Yes | Owner's user ID | "e5f6g7h8-..." |
| overall | integer | Yes | Total health score (0-100) | 85, 72, 91 |
| weight_score | integer | Yes | Weight component (0-100) | 90, 75, 100 |
| activity_score | integer | Yes | Activity component (0-100) | 80, 60, 95 |
| medical_score | integer | Yes | Medical/vaccination component (0-100) | 85, 70, 88 |
| status | text | Yes | Health status category | "excellent", "good", "fair", "poor" |
| insights | jsonb | No | Additional health insights | ["Weight is ideal", "More activity needed"] |
| computed_at | timestamp | Yes | When score was calculated | "2024-03-20T12:00:00Z" |

### Health Score Ranges

| Score Range | Status | Meaning |
|-------------|--------|---------|
| 90-100 | excellent | Pet is thriving, optimal health |
| 80-89 | good | Healthy with minor areas to monitor |
| 70-79 | fair | Some attention or improvements needed |
| 60-69 | poor | Health concerns, vet visit recommended |
| 0-59 | critical | Serious concerns, seek veterinary care |

### Score Components

Each component is scored 0-100 and contributes to the overall score:

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| Weight | 20% | Is pet's weight in healthy range for species/breed? |
| Activity | 20% | Is pet getting enough exercise? |
| Medical | 25% | Are vaccinations up to date? Recent checkups? |
| Alerts | 15% | Are there unresolved health alerts? |
| AI Insights | 10% | Health patterns detected from conversations |
| Appetite | 10% | Is appetite normal? (3/5 is optimal) |

---

## Table: assistant_messages

Stores AI chat history for the pet health assistant.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | Unique identifier | "v1w2x3..." |
| user_id | uuid | Yes | User who sent/received message | "e5f6g7h8-..." |
| pet_id | uuid | No | Pet being discussed (optional) | "a1b2c3d4-..." |
| role | text | Yes | Who sent the message | "user", "assistant" |
| content | text | Yes | Message text | "Is Max's weight healthy?" |
| metadata | jsonb | No | Additional message data | {"health_insights": [...]} |
| created_at | timestamp | Yes | When message was sent | "2024-03-20T14:00:00Z" |

### Message Roles

| Role | Meaning |
|------|---------|
| user | Message from the pet owner |
| assistant | Response from the AI assistant |

---

## Table: user_profiles

Stores user account settings and preferences.

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| id | uuid | Yes | User ID (matches auth.users.id) | "e5f6g7h8-..." |
| full_name | text | No | User's display name | "John Smith" |
| username | text | No | Username for profile | "johnsmith" |
| phone_number | text | No | Contact phone | "+1-555-987-6543" |
| avatar_url | text | No | Profile picture URL | "https://..." |
| notification_preferences | jsonb | No | Email/push notification settings | {"email": true, "push": false} |
| created_at | timestamp | Yes | Account creation date | "2024-01-01T00:00:00Z" |
| updated_at | timestamp | Yes | Last profile update | "2024-03-15T09:00:00Z" |

---

## Species-Specific Health Ranges

The health score algorithm uses these reference ranges based on species:

### Dogs

| Metric | Normal Range | Critical Low | Critical High |
|--------|--------------|--------------|---------------|
| Temperature | 38.0 - 39.2 °C | < 37.0 °C | > 40.0 °C |
| Heart Rate | 60 - 140 bpm | < 50 bpm | > 160 bpm |
| Respiratory Rate | 15 - 30 brpm | < 10 brpm | > 40 brpm |

### Cats

| Metric | Normal Range | Critical Low | Critical High |
|--------|--------------|--------------|---------------|
| Temperature | 38.1 - 39.2 °C | < 37.0 °C | > 40.0 °C |
| Heart Rate | 140 - 220 bpm | < 120 bpm | > 240 bpm |
| Respiratory Rate | 20 - 30 brpm | < 15 brpm | > 40 brpm |

### Birds

| Metric | Normal Range | Critical Low | Critical High |
|--------|--------------|--------------|---------------|
| Temperature | 40.0 - 42.0 °C | < 39.0 °C | > 43.0 °C |
| Heart Rate | 200 - 500 bpm | < 150 bpm | > 600 bpm |
| Respiratory Rate | 25 - 50 brpm | < 20 brpm | > 60 brpm |

### Rabbits

| Metric | Normal Range | Critical Low | Critical High |
|--------|--------------|--------------|---------------|
| Temperature | 38.5 - 40.0 °C | < 37.5 °C | > 41.0 °C |
| Heart Rate | 130 - 325 bpm | < 100 bpm | > 350 bpm |
| Respiratory Rate | 30 - 60 brpm | < 25 brpm | > 70 brpm |

---

## Appetite Scale

The appetite metric uses a 1-5 scale:

| Value | Label | Description | Score Impact |
|-------|-------|-------------|--------------|
| 1 | Very Poor | Not eating at all, refusing food | -40 points |
| 2 | Poor | Eating much less than normal | -20 points |
| 3 | Normal | Eating as expected | 0 points (optimal) |
| 4 | Increased | Eating more than usual | -10 points |
| 5 | Excessive | Constantly hungry, eating everything | -20 points |

---

## Health Score Algorithm (Bayesian Multi-Factor Analysis)

The health scoring system uses a statistically rigorous approach combining multiple factors with confidence weighting.

### Algorithm Overview

The health score is computed using Bayesian inference:

```
Overall Score = Σ(Component Score × Prior Weight × Confidence) / Σ(Prior Weight × Confidence)
```

### Component Weights

| Component | Weight | Description |
|-----------|--------|-------------|
| Weight | 20% | Gaussian likelihood against breed/species norms |
| Activity | 18% | Time-decay weighted average vs daily target |
| Vitals | 22% | Z-score normalization against species ranges |
| Medical | 15% | Vaccination status + checkup recency |
| Alerts | 15% | Logarithmic penalty for active alerts |
| Age Factor | 10% | Life-stage adjusted baseline |

### Statistical Methods

1. **Z-Score Normalization**: Vital signs are scored using standard deviation from species-specific means
2. **Gaussian Likelihood**: Weight scores use normal distribution probability
3. **Time-Decay Weighting**: Recent data has exponentially higher influence (decay factor: 0.95/day)
4. **Confidence Intervals**: Sparse data receives lower confidence, reducing its influence

### Production Implementation (Supabase Edge Function)

The Bayesian algorithm runs as a **Supabase Edge Function** (`health-score-bayesian`) in production:

```
/api/health-score?petId=xxx  →  Edge Function  →  health_scores table
```

**Benefits:**
- Runs on Supabase infrastructure (low latency)
- Automatically triggered when health records are added
- Scores saved to `health_scores` table for historical tracking
- Fallback to TypeScript implementation if Edge Function unavailable

**Edge Function Features:**
- Real-time score recalculation on data changes
- 90-day rolling window for historical data
- Adaptive confidence based on data availability
- Returns component scores + insights + status

### Clinical Validation

The algorithm was validated against peer-reviewed veterinary research:

| Study | Application |
|-------|-------------|
| German AJ et al. (2010) J Vet Intern Med | Obesity outcomes in dogs |
| Kealy RD et al. (2002) JAVMA | 14-year Labrador lifespan study |
| Lund EM et al. (2006) JAVMA | Dog obesity prevalence |
| Cave NJ et al. (2012) NZ Vet J | Cat obesity patterns |
| Laflamme D (1997) JAVMA | Body Condition Score validation |

**Test Results:**
| Test Type | Cases | Accuracy |
|-----------|-------|----------|
| Clinical Validation (real vet cases) | 16 | 93.8% |
| Stress Tests (parametric) | 1,323 | 94.9% |

### Python Analysis Module

A Python implementation (`analysis/health_score_algorithm.py`) provides:
- `HealthScoreV4` class for health score calculation
- Evidence-based BCS scoring
- Breed-specific weight ranges

Run the tests:
```bash
# Clinical validation with real vet cases
python3 tests/clinical-cases-test.py

# Stress tests with parametric cases
python3 tests/stress-test-algorithm.py
```

---

## Data Privacy & Security

- All data is stored in Supabase with Row Level Security (RLS) enabled
- Users can only access their own pets and records
- Passwords are never stored in plain text (handled by Supabase Auth)
- API keys are stored as environment variables, never in code
