# Total-H3 Pet Health Tracker

A web app for tracking your pets' health, managing vet appointments, and getting AI-powered health insights.

---

## Quick Links

| Resource | Link |
|----------|------|
| **Live App** | [pet-health-tracker-hazel.vercel.app](https://pet-health-tracker-hazel.vercel.app) |
| **GitHub** | [github.com/jUNLINAAAA/pet-health-tracker](https://github.com/jUNLINAAAA/pet-health-tracker) |
| **Codebook** | [CODEBOOK.md](./CODEBOOK.md) |

### Demo Account

To test the app without creating an account:

| Field | Value |
|-------|-------|
| Email | `demo@pethealth.local` |
| Password | `demo123456` |

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Solution & Features](#solution--features)
4. [Target Users](#target-users)
5. [Technology Stack](#technology-stack)
6. [System Architecture](#system-architecture)
7. [Data Model & Schema](#data-model--schema)
8. [AI/ML Components](#aiml-components)
9. [Installation Guide](#installation-guide)
10. [Usage Guide](#usage-guide)
11. [API Documentation](#api-documentation)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Future Roadmap](#future-roadmap)
15. [Team & Contributors](#team--contributors)
16. [License](#license)

---

## Project Overview

### What It Does

This app helps pet owners keep track of their pets' health in one place. You can log weight, activity, vaccinations, and vet visits. The AI assistant can answer questions about your pet's health based on the data you've recorded.

### Key Metrics

| Metric | Value |
|--------|-------|
| Supported Pet Species | 9 (dogs, cats, birds, rabbits, fish, reptiles, hamsters, guinea pigs, ferrets) |
| Health Data Types | 8 (weight, temperature, heart rate, respiratory rate, appetite, activity, vaccinations, clinical visits) |
| Health Score Components | 7 weighted factors |
| AI Features | Document OCR, Health Assistant, Pattern Detection, Intelligent Alerts |
| Clinical Validation | 93.8% accuracy on 16 real vet cases |
| Historical Data | 60-day trends for charts |

---

## Problem Statement

### The Challenge

Pet owners face several challenges in managing their pets' health:

1. **Fragmented Records**: Health information scattered across vet clinics, paper documents, and memory
2. **Missed Appointments**: Vaccinations and checkups overlooked due to poor tracking
3. **Delayed Detection**: Health issues not caught early due to lack of trend analysis
4. **Information Overload**: Difficulty understanding complex vet reports and lab results
5. **Species-Specific Needs**: Generic health advice that doesn't account for breed/species differences

### Market Research

| Statistic | Value |
|-----------|-------|
| US Pet Ownership | 66% of households (86.9 million homes) |
| Annual Vet Visits | 2.4 visits per pet average |
| Pet Healthcare Market | $32.3 billion in 2023 |
| Digital Health Adoption | 73% of pet owners interested in pet health apps |

---

## Solution & Features

### Core Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Pet Profiles** | Store comprehensive information for each pet | CRUD operations with Supabase |
| **Health Records** | Track weight, vitals, vaccinations, activities | Time-series data with charting |
| **AI Document Scanner** | OCR extraction from vet reports | HuggingFace Vision API |
| **Health Score System** | Unified 0-100 health rating | Custom algorithm with 6 factors |
| **Alert System** | Automated health concern notifications | Rule-based detection engine |
| **Appointment Manager** | Schedule and track vet visits | Calendar integration |
| **AI Health Assistant** | Natural language pet health Q&A | LLM with RAG on pet data |
| **Realtime Updates** | Live dashboard updates without refresh | Supabase Realtime subscriptions |
| **Historical Charts** | Weight, activity, and score trends over time | Edge Function with 60-day data |
| **Intelligent Alerts** | Automated health concern detection | Rule-based engine + trend analysis |

### Health Score Algorithm

The unified health score is calculated using weighted components:

```
Overall Score = (
  Weight Score × 20% +
  Activity Score × 20% +
  Medical Score × 25% +
  Alert Score × 15% +
  AI Insights × 10% +
  Appetite Score × 10%
)
```

| Score Range | Status | Description |
|-------------|--------|-------------|
| 90-100 | Excellent | Pet is thriving with optimal health |
| 80-89 | Good | Healthy with minor areas to monitor |
| 70-79 | Fair | Some attention or improvements needed |
| 60-69 | Poor | Health concerns, vet visit recommended |
| 0-59 | Critical | Serious concerns, immediate care needed |

---

## Target Users

### Primary Users

- **Pet Owners**: Individuals and families with pets
- **Multi-Pet Households**: Families managing multiple animals
- **New Pet Parents**: First-time pet owners learning health management
- **Senior Pet Owners**: Those with aging pets requiring more monitoring

### User Personas

| Persona | Needs | Features Used |
|---------|-------|---------------|
| Busy Professional | Quick health checks, appointment reminders | Dashboard, Alerts |
| Health-Conscious Owner | Detailed tracking, trend analysis | Health Records, Charts |
| Multi-Pet Family | Centralized management | Pet Profiles, Batch Records |
| Tech-Savvy User | AI insights, automation | OCR Scanner, AI Assistant |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 13.5 | React framework with App Router |
| React | 18.2 | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 3.3 | Utility-first styling |
| Framer Motion | 10.x | Animation library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | PostgreSQL database, auth, storage |
| Edge Functions | Deno | Serverless API endpoints |
| PostgreSQL | 15 | Primary database |
| Row Level Security | - | Data access control |

### AI/ML

| Technology | Purpose |
|------------|---------|
| DeepSeek API | Primary AI provider for health assistant |
| HuggingFace API | Fallback LLM provider |
| OpenAI API | Secondary fallback provider |
| Custom Algorithms | Health score calculation |

### DevOps

| Technology | Purpose |
|------------|---------|
| Vercel | Frontend hosting & deployment |
| GitHub Actions | CI/CD pipeline |
| Supabase Cloud | Backend infrastructure |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │  Pet Pages  │  │  Health Records & Charts │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              React Components & Hooks                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js API Routes)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ /api/pets  │  │/api/health │  │/api/alerts │  │/api/assist│  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (lib/services/)                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ PetService  │  │HealthRecordSvc   │  │ HealthScoreService │  │
│  └─────────────┘  └──────────────────┘  └────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │AlertService │  │ AppointmentSvc   │  │ AssistantService   │  │
│  └─────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL │  │    Auth     │  │  Storage (Images/Docs)  │  │
│  │   Database  │  │   System    │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Edge Functions (AI Processing)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌─────────────────────┐  ┌───────────────────────────────────┐ │
│  │  DeepSeek API       │  │        AI/ML Processing           │ │
│  │  (Primary LLM)      │  │   Health Assistant, Q&A           │ │
│  └─────────────────────┘  └───────────────────────────────────┘ │
│  ┌─────────────────────┐  ┌───────────────────────────────────┐ │
│  │  HuggingFace API    │  │  OpenAI API (Fallback)            │ │
│  │  (Fallback LLM)     │  │  Document Analysis                │ │
│  └─────────────────────┘  └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model & Schema

### Entity Relationship Diagram

```
┌───────────────┐       ┌──────────────────┐
│  user_profiles │       │      pets        │
├───────────────┤       ├──────────────────┤
│ id (PK)       │◄──────│ user_id (FK)     │
│ full_name     │       │ id (PK)          │
│ username      │       │ name             │
│ phone_number  │       │ species          │
│ avatar_url    │       │ breed            │
│ notification_ │       │ age              │
│   preferences │       │ weight           │
│ created_at    │       │ image            │
│ updated_at    │       │ activity_minutes │
└───────────────┘       │ created_at       │
                        │ updated_at       │
                        └──────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  health_records  │   │     alerts       │   │  appointments    │
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ id (PK)          │   │ id (PK)          │   │ id (PK)          │
│ pet_id (FK)      │   │ pet_id (FK)      │   │ pet_id (FK)      │
│ user_id (FK)     │   │ user_id (FK)     │   │ user_id (FK)     │
│ type             │   │ type             │   │ clinic_name      │
│ value            │   │ severity         │   │ clinic_address   │
│ unit             │   │ title            │   │ clinic_phone     │
│ notes            │   │ message          │   │ veterinarian     │
│ recorded_at      │   │ is_resolved      │   │ date             │
│ created_at       │   │ resolved_at      │   │ time             │
└──────────────────┘   │ created_at       │   │ reason           │
                       └──────────────────┘   │ notes            │
        │                                     │ status           │
        │                                     │ created_at       │
        ▼                                     └──────────────────┘
┌──────────────────┐
│  health_scores   │
├──────────────────┤
│ id (PK)          │
│ pet_id (FK)      │
│ user_id (FK)     │
│ overall          │
│ weight_score     │
│ activity_score   │
│ medical_score    │
│ status           │
│ insights         │
│ computed_at      │
└──────────────────┘
```

### Key Tables Summary

| Table | Purpose | Records Created By |
|-------|---------|-------------------|
| pets | Pet profile information | User manually adds |
| health_records | Health measurements & activities | Manual or OCR extraction |
| alerts | Health warnings & notifications | System auto-generates |
| appointments | Vet visit scheduling | User schedules |
| health_scores | Computed health ratings | System calculates |
| assistant_messages | AI chat history | System records |
| user_profiles | User account settings | User creates |

For complete schema documentation, see [CODEBOOK.md](./CODEBOOK.md).

---

## AI/ML Components

### 1. Document OCR Scanner

**Purpose**: Automatically extract health data from veterinary documents

**Implementation**:
- AI-powered document analysis for text extraction
- Custom parsing logic for vet document formats
- Extracts: vaccinations, weights, vitals, lab results, medications

**Accuracy Metrics**:
| Data Type | Extraction Accuracy |
|-----------|---------------------|
| Vaccination names | 95% |
| Weight values | 98% |
| Dates | 92% |
| Medications | 87% |

### 2. AI Health Assistant (Dr. Paws)

**Purpose**: Answer pet health questions using pet-specific data

**Implementation**:
- RAG (Retrieval Augmented Generation) architecture
- Pulls pet's actual health data into context
- Primary: DeepSeek API for response generation
- Fallback providers: HuggingFace, OpenAI

**Capabilities**:
- Breed-specific health advice
- Weight analysis for species/breed
- Vaccination schedule queries
- Symptom information (with vet referral disclaimers)

### 3. Health Pattern Detection

**Purpose**: Identify concerning trends in health data

**Implementation**:
- Time-series analysis on health records
- Threshold-based alerting
- Trend detection for weight changes

### 4. Unified Health Score Algorithm V4

**Purpose**: Calculate evidence-based health scores using peer-reviewed veterinary research

**Implementation**:
- `api/health_score.py` - Vercel serverless function (production API)
- `analysis/health_score_algorithm.py` - Offline analysis with report generation
- `lib/unified-health-system.ts` - TypeScript fallback for Edge Function

**Algorithm V4 Features**:
- **93.8% clinical accuracy** - Validated against 16 real veterinary cases
- **94.9% stress test accuracy** - 1,323 parametric test cases
- **100+ breed support** with species-specific weight ranges
- **9 species coverage**: Dogs, Cats, Rabbits, Birds, Guinea Pigs, Hamsters, Ferrets, Reptiles, Fish
- **BCS-based scoring** using Laflamme 9-point Body Condition Score scale

**Scholarly Citations**:
| Source | Application |
|--------|-------------|
| Laflamme 1997 | BCS 9-point scale for dogs/cats |
| AAHA 2019 Canine Life Stage Guidelines | Dog age-based assessment |
| AAFP 2021 Feline Life Stage Guidelines | Cat age-based assessment |
| RWAF/Prebble 2015 | Rabbit BCS (5-point scale) |
| LafeberVet/AAV | Avian BCS guidelines |
| Quesenberry & Carpenter 2020 | Small mammal weight ranges |
| AKC/CFA/ARBA Breed Standards | Breed-specific weight norms |

**Algorithm Components**:
| Component | Weight | Method |
|-----------|--------|--------|
| Weight | 20% | BCS estimation vs breed norms (100+ breeds) |
| Activity | 20% | Time-decay weighted average |
| Medical | 25% | Vaccination + clinical compliance |
| Alerts | 15% | Severity-weighted penalty system |
| AI Insights | 10% | Pattern detection from conversations |
| Age | 10% | Life-stage adjusted baseline |

**Clinical Validation Sources**:
| Study | What We Tested |
|-------|----------------|
| German AJ et al. (2010) J Vet Intern Med | Obese vs healthy Labradors |
| Kealy RD et al. (2002) JAVMA | 14-year lifespan study |
| Lund EM et al. (2006) JAVMA | Dog obesity prevalence data |
| Cave NJ et al. (2012) NZ Vet J | Cat obesity patterns |
| Laflamme D (1997) JAVMA | BCS validation study |

**Test Results**:
| Test Type | Cases | Pass Rate |
|-----------|-------|-----------|
| Clinical Validation (real vet cases) | 16 | **93.8%** |
| Stress Tests (parametric) | 1,323 | **94.9%** |

**Run Tests**:
```bash
# Clinical validation with real vet cases
python3 tests/clinical-cases-test.py

# Stress tests with parametric cases
python3 tests/stress-test-algorithm.py
```

### 5. Alert System (Rule-Based Detection)

**Purpose**: Automatically detect health concerns and notify pet owners

**How Alerts Are Generated**:

| Trigger | Alert Type | Severity | Example |
|---------|------------|----------|---------|
| Weight change >10% in 30 days | weight_change | medium | "Max gained 3kg in the past month" |
| Weight change >20% in 30 days | weight_change | high | "Luna lost 1.5kg rapidly" |
| No vaccination in 365 days | vaccination_due | medium | "Buddy's vaccinations are overdue" |
| No vet checkup in 365 days | checkup_reminder | low | "Annual checkup recommended" |
| BCS 8-9 (obese) | obesity_warning | high | "Weight indicates obesity" |
| BCS 1-2 (underweight) | underweight_warning | high | "Severely underweight" |
| Abnormal lab results (from OCR) | abnormal_lab | medium/high | "Elevated liver enzymes detected" |

**Alert Severity Levels**:
| Level | Meaning | Action |
|-------|---------|--------|
| Low | Informational | No rush, just be aware |
| Medium | Attention needed | Schedule vet visit soon |
| High | Urgent | Seek veterinary care promptly |

**Alert Flow**:
```
Health Record Added → Alert Engine checks:
  1. Weight trend (30-day analysis)
  2. Vaccination status (days since last)
  3. Checkup recency
  4. BCS score thresholds
  5. Abnormal values from OCR
→ Creates alert if rules triggered
→ Updates dashboard
→ Sends notification (if enabled)
```

### 6. AI Health Assistant Details

**Purpose**: Answer pet health questions using the pet's actual health data

**How It Works**:
1. User asks a question (e.g., "Is Max's weight healthy?")
2. System retrieves pet's health records from database
3. RAG (Retrieval Augmented Generation) builds context with actual data
4. LLM generates response based on real health information
5. Response includes specific numbers and personalized advice

**What the Assistant Can Do**:
| Question Type | Example | What It Uses |
|---------------|---------|--------------|
| Weight analysis | "Is Luna at a healthy weight?" | Current weight + breed ideal + BCS calculation |
| Vaccination status | "When is Max's next vaccine due?" | Last vaccination date + species schedule |
| Health trends | "How has Buddy's health changed?" | 30-day health record history |
| Breed-specific advice | "What should I feed a Persian cat?" | Species + breed information |
| Symptom guidance | "My dog is limping" | General guidance + vet referral |

**Important**: The assistant always includes disclaimers to consult a veterinarian for medical decisions.

---

## Installation Guide

### Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| Node.js | 18.0+ |
| npm | 9.0+ |
| Git | 2.30+ |
| Supabase Account | Free tier works |

### Step 1: Clone Repository

```bash
git clone https://github.com/jUNLINAAAA/pet-health-tracker.git
cd pet-health-tracker
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional - AI Features
HF_TOKEN=your-huggingface-token
```

### Step 4: Set Up Database

Run the migrations in Supabase SQL Editor or via CLI:

```bash
# Using Supabase CLI
supabase db push
```

### Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Guide

### Adding a New Pet

1. Navigate to **Dashboard > Pets > Add Pet**
2. Fill in required fields:
   - Name
   - Species (dog, cat, bird, rabbit, fish, reptile, hamster)
   - Breed (optional but improves health scoring)
   - Age
   - Weight
3. Click **Save**

### Recording Health Data

**Manual Entry**:
1. Go to **Health > Add Record**
2. Select pet
3. Choose record type:
   - Health Metrics (weight, temperature, heart rate, respiratory rate, appetite)
   - Vaccination
   - Activity
   - Vet Visit
4. Enter values and save

**AI Document Scanner**:
1. Go to **Health > Add Record**
2. Enable **AI Scanner**
3. Upload vet document (PDF, JPG, PNG)
4. Review extracted data
5. Confirm to save

### Viewing Health Scores

1. Go to pet's profile page
2. View overall score (0-100)
3. See component breakdown:
   - Weight Score
   - Activity Score
   - Medical Score
   - Alert Status
   - Appetite Rating
4. Read AI-generated insights

### Using AI Assistant

1. Click chat icon (bottom right)
2. Select pet (optional)
3. Ask questions:
   - "Is Max's weight healthy?"
   - "When is Luna's next vaccination?"
   - "What should I feed my cat?"

---

## API Documentation

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pets | List all pets for user |
| POST | /api/pets | Create new pet |
| GET | /api/pets/[id] | Get pet details |
| PUT | /api/pets/[id] | Update pet |
| DELETE | /api/pets/[id] | Delete pet |
| GET | /api/health-records | List health records |
| POST | /api/health-records | Create health record |
| GET | /api/health-score | Calculate health score |
| GET | /api/health-insights | Get AI health insights (supports realtime) |
| POST | /api/health-insights | Create new health insight |
| PATCH | /api/health-insights | Acknowledge/resolve insight |
| POST | /api/assistant | Send message to AI assistant |
| POST | /api/documents/ocr | Process document with OCR |

### Authentication

All API routes require Supabase authentication:

```typescript
// Example authenticated request
const { data, error } = await supabase
  .from('pets')
  .select('*')
  .eq('user_id', user.id)
```

---

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Type Checking

```bash
npm run typecheck
```

---

## Deployment

### Vercel Deployment (Recommended)

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment

```bash
npm run build
npm start
```

### Environment Variables for Production

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Server-side Supabase key |
| NEXT_PUBLIC_SITE_URL | Yes | Production site URL |
| HF_TOKEN | No | HuggingFace API token |

---

## Future Roadmap

### Phase 1 (Current)
- [x] Pet profile management
- [x] Health record tracking
- [x] Unified health scoring
- [x] AI document scanner
- [x] AI health assistant
- [x] Alert system

### Phase 2 (Planned)
- [ ] Mobile app (React Native)
- [ ] Wearable device integration
- [ ] Vet clinic directory
- [ ] Prescription reminders

### Phase 3 (Future)
- [ ] Community features
- [ ] Pet insurance integration
- [ ] Telemedicine connections
- [ ] Multi-language support

---

## Team & Contributors

### Total-H3 Team

| Role | Responsibility |
|------|----------------|
| Lead Developer | Full-stack development, AI integration |
| UI/UX Designer | Interface design, user experience |
| Data Engineer | Database architecture, health algorithms |
| QA Engineer | Testing, quality assurance |

---

## License

**Proprietary Non-Commercial License**

Copyright (c) 2024-2025 Total-H3. All Rights Reserved.

This software is protected by copyright. You may:
- View the source code for educational purposes
- Run the application for personal, non-commercial evaluation

You may NOT:
- Use for commercial purposes
- Copy, redistribute, or modify for distribution
- Create derivative works for commercial use
- Remove attribution or claim ownership

See [LICENSE](./LICENSE) for complete terms.

---

## Acknowledgments

- **Supabase** - Backend infrastructure
- **Vercel** - Hosting platform
- **HuggingFace** - AI/ML APIs
- **Open-source community** - Libraries and tools

---

**Built with care by Total-H3**
