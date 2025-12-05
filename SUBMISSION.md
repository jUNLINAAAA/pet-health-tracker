# Pet Health Tracker - Final Submission

**Team:** Total-H3
**Date:** December 5, 2025

---

## 1. Product Access Link

**Live Application:** https://pet-health-tracker-hazel.vercel.app

You can access the full application immediately at the link above. No installation required.

**Demo Login Credentials:**
- Email: `demo@pethealth.local`
- Password: `demo123456`

If you prefer to run the application locally, all instructions are in the GitHub repository below.

---

## 2. GitHub Repository Link

**Repository:** https://github.com/jUNLINAAAA/pet-health-tracker

The repository contains:
- **README.md** - Step-by-step instructions for launching and using the product
- **CODEBOOK.md** - Complete data dictionary with all variables, tables, and their descriptions
- **Source code** - Full Next.js application with TypeScript
- **Test suites** - Clinical validation tests and stress tests

### Quick Start (from README)

```bash
# Clone the repository
git clone https://github.com/jUNLINAAAA/pet-health-tracker.git
cd pet-health-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Latest Updates (December 2025)

- **Historical Charts**: Weight, activity, and score trends now display real backend data (60-day history)
- **Realtime Updates**: Dashboard syncs instantly via Supabase Realtime subscriptions
- **Comprehensive Alerts**: Rule-based alerts analyze ALL metrics (weight, activity, appetite, temperature, heart rate, clinical notes, vaccinations)
- **Auth Session Handling**: Fixed race condition ensuring data loads after authentication completes
- **Multi-User Support**: Full data isolation with Row Level Security (RLS) - each user sees only their own data
- **Quick Insights**: Sidebar shows wellness index and alert status computed live from backend
- **Sparklines**: Activity trend charts display proper 7-day time-series data with meaningful variations
- **Hydration Fix**: Prevents flash of unstyled content during hard refresh with proper loading states
- **Responsive Design**: Premium mobile-first UI with adaptive layouts for all screen sizes

---

## Evaluation Criteria Response

### Tool Implementation (60 pts)

#### Does it run? (30 pts)

**Yes, the tool runs successfully.**

We verified this by running the build process:

```
> npm run build

✓ Compiled successfully
✓ Generating static pages (31/31)
✓ Finalizing page optimization
```

The application is deployed and accessible at https://pet-health-tracker-hazel.vercel.app

**What we built:**
- A Next.js 13.5 web application with React 18 and TypeScript
- Connected to Supabase PostgreSQL database for data persistence
- Deployed on Vercel with automatic HTTPS and global CDN
- 63 unit tests passing (run with `npm test`)

**Technology choices and why:**
| Technology | Purpose | Why We Chose It |
|------------|---------|-----------------|
| Next.js 13.5 | Framework | Server-side rendering for fast page loads, built-in API routes |
| Supabase | Database + Auth | Free tier, real-time subscriptions, PostgreSQL reliability |
| Vercel | Hosting | Zero-config deployment, automatic HTTPS, global edge network |
| TypeScript | Language | Catches bugs at compile time, better code documentation |

---

#### Does it make sense? (30 pts)

**Yes, the tool performs valid, evidence-based health analysis.**

Our health scoring algorithm was validated against real clinical cases from peer-reviewed veterinary studies:

**Clinical Validation Results:**
- **93.8% accuracy** on 16 real veterinary cases
- **94.9% accuracy** on 1,323 parametric stress tests

**How we validated:**

We tested our algorithm against actual patient data from published veterinary research:

| Study | What They Measured | How We Used It |
|-------|-------------------|----------------|
| German AJ et al. (2010) | Labrador obesity outcomes | Tested obese vs healthy Labs |
| Kealy RD et al. (2002) | 14-year dog lifespan study | Validated lean vs overweight scoring |
| Cave NJ et al. (2012) | Cat obesity patterns | Tested DSH cats at different weights |
| Laflamme (1997) | Body Condition Score validation | Built our BCS-to-score mapping |

**Example of algorithm in action:**

When a user enters a 42kg Labrador (breed ideal: 30kg), our algorithm:
1. Calculates deviation: 42kg is 40% above ideal
2. Maps to BCS 8 (obese) using Laflamme scale
3. Assigns weight score: 45/100
4. Generates insight: "Obese: 42kg (40% above ideal)"

This matches what a veterinarian would assess clinically.

**The algorithm uses these evidence-based components:**

| Component | Weight | What It Measures | Source |
|-----------|--------|------------------|--------|
| Body Weight | 20% | BCS score from weight vs breed ideal | Laflamme 1997 |
| Activity Level | 20% | Minutes of daily exercise vs targets | AAHA 2019 guidelines |
| Medical History | 25% | Vaccinations, checkups, treatments | Standard veterinary practice |
| Active Alerts | 15% | Current health concerns | Rule-based detection |
| Age Factor | 10% | Life stage adjustments | AAHA/AAFP life stage guidelines |
| AI Insights | 10% | Pattern detection from conversations | Context-aware analysis |

---

### Tool Design (30 pts)

#### Scope matches product development plan (10 pts)

**Delivered all planned features:**

| Planned Feature | Delivered? | How It Works |
|-----------------|------------|--------------|
| Pet profiles | Yes | Create/edit pets with name, species, breed, age, weight, photo |
| Health tracking | Yes | Log weight, activity, temperature, appetite, heart rate, symptoms |
| Health scoring | Yes | Automated 7-component algorithm calculates overall health |
| AI document scanner | Yes | Upload vet documents, AI extracts health data automatically |
| AI health assistant | Yes | Chat with AI that knows your pet's health history |
| Alert system | Yes | **Comprehensive algorithm-based alerts** (see below) |
| Appointment scheduling | Yes | Track vet appointments with reminders |

**Alert System - All Metrics Analyzed:**

The alert system uses a rule-based algorithm that analyzes ALL collected health metrics:

| Metric | Alert Types Generated | Clinical Basis |
|--------|----------------------|----------------|
| **Weight** | obese, overweight, underweight, rapid_weight_gain, rapid_weight_loss | BCS scale (Laflamme 1997) + breed-specific ideals |
| **Activity** | severely_low_activity, low_activity, moderate_activity | AAHA exercise guidelines, age-adjusted |
| **Appetite** | poor_appetite, reduced_appetite, excessive_appetite | 1-5 scale; abnormal = possible illness |
| **Temperature** | critical_fever, fever, hypothermia, low_temperature | Species-specific ranges (Dogs: 38-39.2°C) |
| **Heart Rate** | critical_tachycardia, elevated_heart_rate, critical_bradycardia, low_heart_rate | Species-specific (Dogs: 60-140 bpm, Cats: 140-220 bpm) |
| **Vaccinations** | vaccination_overdue, vaccination_due_soon, no_vaccination_record | Annual booster schedule |
| **Age** | senior_pet, geriatric_pet, impossible_age | Life expectancy by species/breed |
| **Clinical Notes** | urgent_clinical_attention, followup_reminder, medication_check, condition_monitoring | OCR-extracted vet records |
| **Tracking** | no_recent_tracking | Encourages consistent data logging |

**System integration (everything connects):**

```
User adds health record → Triggers health score recalculation
                       → Checks for alert conditions
                       → Updates dashboard display (REALTIME)
                       → AI assistant gains new context

User uploads vet document → AI extracts data (vaccinations, weight, labs)
                         → Creates health records automatically
                         → Triggers alerts if abnormal results found
```

**Real-time Updates:**
- Dashboard metrics update instantly when data changes (via Supabase Realtime)
- Alert resolutions reflect immediately across all views
- Multi-device sync - changes on one device appear on others

**Data Isolation & Security:**
- Row Level Security (RLS) ensures each user only sees their own data
- No data mixing between accounts - complete privacy
- All tables protected: pets, alerts, appointments, health_records, health_scores, ai_health_insights

---

#### Clear user and use case (10 pts)

**Primary Users:**

1. **Pet owners** who want to track their pet's health over time
2. **Multi-pet households** managing several animals from one dashboard
3. **First-time pet parents** learning what's normal for their pet
4. **Caregivers of senior pets** who need to monitor health changes

**Core Use Cases:**

| Situation | What User Does | What System Does |
|-----------|---------------|------------------|
| Daily check-in | Opens dashboard | Shows health score, alerts, upcoming appointments |
| Weekly weigh-in | Enters pet's weight | Calculates trend, updates score, alerts if concerning |
| After vet visit | Uploads document photo | AI extracts vaccinations, test results, creates records |
| Health question | Types question in chat | AI responds using pet's actual health data |
| Scheduling | Creates appointment | Saves to calendar, creates reminder alert |

**Why this matters:**

Pet owners often don't realize their pet is gaining weight or missing vaccines until a vet visit. Our app provides continuous monitoring so issues are caught early.

---

#### Minimal user inputs (10 pts)

**To get started, users only need to enter:**

1. Pet name (text)
2. Species (dropdown: Dog, Cat, Bird, etc.)
3. Age (number)

That's it. Three fields to create a pet and start using the app.

**Optional fields that improve accuracy:**
- Breed (for more accurate weight targets)
- Current weight (for tracking)
- Photo (for identification)

**What the system handles automatically:**
- Health score calculation (no manual scoring)
- Alert generation (rule-based, not user-configured)
- Vaccine reminders (based on species and last recorded vaccine)
- Breed-specific targets (100+ breeds in database)

**We deliberately avoided:**
- Requiring users to know their pet's "ideal weight" (we calculate it from breed data)
- Complex configuration screens (sensible defaults for everything)
- Manual alert setup (alerts trigger automatically based on health data)

---

### Tool Documentation (10 pts)

#### Fully reproducible materials

**README.md includes:**
- Project overview explaining what the app does
- Prerequisites (Node.js 18+, npm 9+)
- Step-by-step installation instructions with copy-paste commands
- Environment variable setup guide
- How to run the development server
- How to run tests
- Technology stack explanation

**CODEBOOK.md includes:**

Complete data dictionary for all 7 database tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `pets` | Pet profiles | id, name, species, breed, age, weight |
| `health_records` | Individual health entries | pet_id, type, value, unit, recorded_at |
| `health_scores` | Calculated scores | pet_id, overall, components, algorithm_version |
| `alerts` | Health warnings | pet_id, type, severity, message, is_resolved |
| `appointments` | Vet visits | pet_id, date_time, clinic_name, purpose |
| `health_documents` | Uploaded files | pet_id, file_name, extracted_data |
| `assistant_messages` | AI chat history | pet_id, role, content |

Each table is documented with:
- Column name and data type
- Whether it's required or optional
- Description of what it stores
- Example values

**Test suites included:**

```bash
# Run unit tests (63 tests)
npm test

# Run clinical validation (16 real vet cases, 93.8% accuracy)
python3 tests/clinical-cases-test.py

# Run stress tests (1,323 parametric cases, 94.9% accuracy)
python3 tests/stress-test-algorithm.py
```

---

## Summary

We built a pet health tracking application that:

1. **Runs correctly** - Builds successfully, deploys to Vercel, all features work
2. **Makes sense** - Uses evidence-based algorithm validated against real clinical data (93.8% accuracy)
3. **Has clear users** - Pet owners who want to monitor their animals' health
4. **Requires minimal input** - Just 3 fields to get started
5. **Is fully documented** - README with launch instructions, CODEBOOK with all data definitions

**Links:**
- Live App: https://pet-health-tracker-hazel.vercel.app
- GitHub: https://github.com/jUNLINAAAA/pet-health-tracker

---

*Built by Total-H3*
