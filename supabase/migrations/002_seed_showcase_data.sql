-- ============================================================================
-- SEED DATA - Showcase Users and Realistic Pet Data
-- Run AFTER 001_initial_schema.sql
-- ============================================================================

-- NOTE: This seed data requires a user to exist in auth.users first.
-- Create a showcase user via Supabase Dashboard or Auth API, then update the UUID below.
--
-- For development/testing, you can use the service role key to insert directly,
-- or create users via the Supabase Auth UI and copy their UUIDs here.

-- ============================================================================
-- PLACEHOLDER: Replace this UUID with your actual showcase user's UUID
-- You can create a user at: Supabase Dashboard > Authentication > Users > Add User
-- ============================================================================
-- Example: DO $$ DECLARE showcase_user_id UUID := 'your-user-uuid-here'; BEGIN ... END $$;

-- ============================================================================
-- FUNCTION: Seed data for a specific user
-- Call this after creating users via Supabase Auth
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_showcase_data(p_user_id UUID)
RETURNS void AS $$
DECLARE
  pet1_id UUID;
  pet2_id UUID;
  pet3_id UUID;
  ref_date TIMESTAMPTZ := '2025-11-08 10:00:00+00';
BEGIN
  -- ========================================================================
  -- 1. CREATE PETS
  -- ========================================================================

  -- Pet 1: Max - Golden Retriever (overweight, needs attention)
  INSERT INTO pets (id, user_id, name, species, breed, age, weight, image, created_at)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    'Max',
    'Dog',
    'Golden Retriever',
    8,
    38.0,
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80',
    ref_date - INTERVAL '3 years'
  )
  RETURNING id INTO pet1_id;

  -- Pet 2: Luna - Siamese Cat (perfect health)
  INSERT INTO pets (id, user_id, name, species, breed, age, weight, image, created_at)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    'Luna',
    'Cat',
    'Siamese',
    3,
    4.2,
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
    ref_date - INTERVAL '1 year'
  )
  RETURNING id INTO pet2_id;

  -- Pet 3: Buddy - Border Collie (young, active)
  INSERT INTO pets (id, user_id, name, species, breed, age, weight, image, created_at)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    'Buddy',
    'Dog',
    'Border Collie',
    2,
    16.0,
    'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&q=80',
    ref_date - INTERVAL '6 months'
  )
  RETURNING id INTO pet3_id;

  -- ========================================================================
  -- 2. CREATE HEALTH RECORDS (Weight tracking over time)
  -- ========================================================================

  -- Max weight history (showing gradual weight gain - concerning trend)
  INSERT INTO health_records (user_id, pet_id, type, value, unit, notes, recorded_at) VALUES
    (p_user_id, pet1_id, 'weight', 35.5, 'kg', 'Annual checkup weight', ref_date - INTERVAL '12 months'),
    (p_user_id, pet1_id, 'weight', 36.2, 'kg', 'Slight increase noted', ref_date - INTERVAL '9 months'),
    (p_user_id, pet1_id, 'weight', 37.1, 'kg', 'Continued increase', ref_date - INTERVAL '6 months'),
    (p_user_id, pet1_id, 'weight', 37.8, 'kg', 'Diet adjustment recommended', ref_date - INTERVAL '3 months'),
    (p_user_id, pet1_id, 'weight', 38.0, 'kg', 'Current weight', ref_date),
    (p_user_id, pet1_id, 'heart_rate', 95, 'bpm', 'Slightly elevated', ref_date - INTERVAL '1 month'),
    (p_user_id, pet1_id, 'temperature', 38.8, '°C', 'Normal range', ref_date - INTERVAL '1 month'),
    (p_user_id, pet1_id, 'activity', 45, 'minutes', 'Below recommended for breed', ref_date - INTERVAL '1 day');

  -- Luna weight history (stable, healthy)
  INSERT INTO health_records (user_id, pet_id, type, value, unit, notes, recorded_at) VALUES
    (p_user_id, pet2_id, 'weight', 4.0, 'kg', 'Initial weight', ref_date - INTERVAL '12 months'),
    (p_user_id, pet2_id, 'weight', 4.1, 'kg', 'Healthy weight', ref_date - INTERVAL '6 months'),
    (p_user_id, pet2_id, 'weight', 4.2, 'kg', 'Perfect weight maintained', ref_date),
    (p_user_id, pet2_id, 'heart_rate', 140, 'bpm', 'Normal for cats', ref_date - INTERVAL '1 month'),
    (p_user_id, pet2_id, 'temperature', 38.5, '°C', 'Normal', ref_date - INTERVAL '1 month'),
    (p_user_id, pet2_id, 'activity', 40, 'minutes', 'Good activity level', ref_date - INTERVAL '1 day');

  -- Buddy weight history (young, still growing)
  INSERT INTO health_records (user_id, pet_id, type, value, unit, notes, recorded_at) VALUES
    (p_user_id, pet3_id, 'weight', 14.0, 'kg', 'Growing puppy', ref_date - INTERVAL '6 months'),
    (p_user_id, pet3_id, 'weight', 15.2, 'kg', 'Healthy growth', ref_date - INTERVAL '3 months'),
    (p_user_id, pet3_id, 'weight', 16.0, 'kg', 'Current weight - slightly under ideal', ref_date),
    (p_user_id, pet3_id, 'heart_rate', 80, 'bpm', 'Athletic, low resting rate', ref_date - INTERVAL '1 month'),
    (p_user_id, pet3_id, 'temperature', 38.6, '°C', 'Normal', ref_date - INTERVAL '1 month'),
    (p_user_id, pet3_id, 'activity', 120, 'minutes', 'Very active - excellent for breed', ref_date - INTERVAL '1 day');

  -- ========================================================================
  -- 3. CREATE ALERTS
  -- ========================================================================

  -- Max alerts (weight issues)
  INSERT INTO alerts (user_id, pet_id, type, severity, message, recommendation, resolved, created_at) VALUES
    (p_user_id, pet1_id, 'weight_gain', 'high', 'Max is 4kg over ideal weight for Golden Retrievers', 'Reduce daily food by 15-20%, increase exercise to 60+ minutes daily', false, ref_date - INTERVAL '1 week'),
    (p_user_id, pet1_id, 'low_activity', 'medium', 'Activity levels below recommended for breed and age', 'Add two 15-minute walks per day', false, ref_date - INTERVAL '3 days'),
    (p_user_id, pet1_id, 'annual_checkup', 'low', 'Annual vaccination due in 30 days', 'Schedule appointment with Dr. Martinez', false, ref_date);

  -- Luna alerts (minor)
  INSERT INTO alerts (user_id, pet_id, type, severity, message, recommendation, resolved, created_at) VALUES
    (p_user_id, pet2_id, 'dental_checkup', 'low', 'Dental cleaning recommended', 'Consider scheduling dental exam', false, ref_date - INTERVAL '2 weeks');

  -- Buddy alerts (minor)
  INSERT INTO alerts (user_id, pet_id, type, severity, message, recommendation, resolved, created_at) VALUES
    (p_user_id, pet3_id, 'weight_monitor', 'low', 'Buddy is 2kg under ideal weight for Border Collies', 'Increase portions slightly, monitor growth', false, ref_date - INTERVAL '1 week');

  -- ========================================================================
  -- 4. CREATE APPOINTMENTS
  -- ========================================================================

  -- Upcoming appointments
  INSERT INTO appointments (user_id, pet_id, title, date, time, location, veterinarian, status, notes, completed) VALUES
    (p_user_id, pet1_id, 'Weight Management Consultation', (ref_date + INTERVAL '7 days')::date, '10:00 AM', 'PetCare Clinic', 'Dr. Sarah Martinez', 'scheduled', 'Discuss diet plan and exercise routine', false),
    (p_user_id, pet2_id, 'Annual Wellness Exam', (ref_date + INTERVAL '14 days')::date, '2:30 PM', 'City Pet Hospital', 'Dr. James Wilson', 'scheduled', 'Routine checkup and vaccinations', false),
    (p_user_id, pet3_id, 'Puppy Growth Check', (ref_date + INTERVAL '21 days')::date, '11:00 AM', 'PetCare Clinic', 'Dr. Sarah Martinez', 'scheduled', 'Monitor growth and development', false);

  -- Past appointments (completed)
  INSERT INTO appointments (user_id, pet_id, title, date, time, location, veterinarian, status, notes, completed) VALUES
    (p_user_id, pet1_id, 'Quarterly Checkup', (ref_date - INTERVAL '3 months')::date, '9:00 AM', 'PetCare Clinic', 'Dr. Sarah Martinez', 'completed', 'Weight increasing, diet adjustment recommended', true),
    (p_user_id, pet1_id, 'Annual Vaccination', (ref_date - INTERVAL '11 months')::date, '10:30 AM', 'City Pet Hospital', 'Dr. James Wilson', 'completed', 'All vaccinations up to date', true),
    (p_user_id, pet2_id, 'Spay Surgery', (ref_date - INTERVAL '10 months')::date, '8:00 AM', 'City Pet Hospital', 'Dr. Emily Chen', 'completed', 'Successful procedure, recovered well', true),
    (p_user_id, pet3_id, 'Puppy Vaccinations', (ref_date - INTERVAL '4 months')::date, '3:00 PM', 'PetCare Clinic', 'Dr. Sarah Martinez', 'completed', 'First round complete', true);

  -- ========================================================================
  -- 5. CREATE INITIAL HEALTH SCORES
  -- ========================================================================

  -- Health scores (calculated based on current data)
  INSERT INTO health_scores (user_id, pet_id, score, components, created_at) VALUES
    (p_user_id, pet1_id, 62, '{"weight": 45, "activity": 55, "medical": 85, "alerts": 40}', ref_date),
    (p_user_id, pet2_id, 92, '{"weight": 95, "activity": 90, "medical": 95, "alerts": 85}', ref_date),
    (p_user_id, pet3_id, 85, '{"weight": 75, "activity": 98, "medical": 90, "alerts": 80}', ref_date);

  RAISE NOTICE 'Seed data created successfully for user %', p_user_id;
  RAISE NOTICE 'Created pets: Max (%), Luna (%), Buddy (%)', pet1_id, pet2_id, pet3_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USAGE INSTRUCTIONS:
--
-- 1. Create a user via Supabase Dashboard > Authentication > Users > Add User
--    Or use the signup flow in your app
--
-- 2. Get the user's UUID from the dashboard
--
-- 3. Run this in SQL Editor:
--    SELECT seed_showcase_data('your-user-uuid-here');
--
-- 4. The function will create 3 pets with full health history for that user
-- ============================================================================

-- Grant execute permission to authenticated users (for self-seeding in dev)
GRANT EXECUTE ON FUNCTION seed_showcase_data(UUID) TO authenticated;

-- ============================================================================
-- HELPER: Clear all data for a user (for testing)
-- ============================================================================
CREATE OR REPLACE FUNCTION clear_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM health_scores WHERE user_id = p_user_id;
  DELETE FROM health_records WHERE user_id = p_user_id;
  DELETE FROM alerts WHERE user_id = p_user_id;
  DELETE FROM appointments WHERE user_id = p_user_id;
  DELETE FROM pets WHERE user_id = p_user_id;
  RAISE NOTICE 'All data cleared for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_user_data(UUID) TO authenticated;
