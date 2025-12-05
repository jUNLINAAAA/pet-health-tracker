-- ============================================================================
-- HEALTH SCORE COMPUTATION FUNCTION
-- Calculates and caches health scores based on pet data, alerts, appointments
-- ============================================================================

-- ============================================================================
-- 1. COMPUTE HEALTH SCORE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_health_score(p_pet_id UUID)
RETURNS TABLE (
  score INTEGER,
  components JSONB,
  status TEXT,
  insights TEXT[],
  recommendations TEXT[]
) AS $$
DECLARE
  v_pet RECORD;
  v_weight_score INTEGER := 100;
  v_activity_score INTEGER := 100;
  v_medical_score INTEGER := 100;
  v_alert_score INTEGER := 100;
  v_overall_score INTEGER;
  v_status TEXT;
  v_insights TEXT[] := ARRAY[]::TEXT[];
  v_recommendations TEXT[] := ARRAY[]::TEXT[];
  v_ideal_weight_min NUMERIC;
  v_ideal_weight_max NUMERIC;
  v_ideal_weight NUMERIC;
  v_unresolved_alerts INTEGER;
  v_high_alerts INTEGER;
  v_medium_alerts INTEGER;
  v_recent_appointments INTEGER;
  v_user_id UUID;
BEGIN
  -- Get pet data
  SELECT p.*, p.user_id INTO v_pet FROM pets p WHERE p.id = p_pet_id;

  IF v_pet IS NULL THEN
    RAISE EXCEPTION 'Pet not found: %', p_pet_id;
  END IF;

  v_user_id := v_pet.user_id;

  -- ========================================================================
  -- WEIGHT SCORE CALCULATION
  -- ========================================================================
  -- Get breed-specific ideal weights
  SELECT
    CASE v_pet.breed
      WHEN 'Golden Retriever' THEN 25
      WHEN 'Labrador Retriever' THEN 25
      WHEN 'German Shepherd' THEN 22
      WHEN 'Border Collie' THEN 18
      WHEN 'Beagle' THEN 9
      WHEN 'Siamese' THEN 2.5
      WHEN 'Persian' THEN 3
      WHEN 'Maine Coon' THEN 5.5
      ELSE CASE WHEN v_pet.species = 'Dog' THEN 10 ELSE 3 END
    END,
    CASE v_pet.breed
      WHEN 'Golden Retriever' THEN 34
      WHEN 'Labrador Retriever' THEN 36
      WHEN 'German Shepherd' THEN 40
      WHEN 'Border Collie' THEN 22
      WHEN 'Beagle' THEN 11
      WHEN 'Siamese' THEN 5
      WHEN 'Persian' THEN 5.5
      WHEN 'Maine Coon' THEN 8
      ELSE CASE WHEN v_pet.species = 'Dog' THEN 30 ELSE 6 END
    END
  INTO v_ideal_weight_min, v_ideal_weight_max;

  v_ideal_weight := (v_ideal_weight_min + v_ideal_weight_max) / 2;

  IF v_pet.weight IS NOT NULL THEN
    IF v_pet.weight < v_ideal_weight_min THEN
      -- Underweight
      v_weight_score := GREATEST(20, 100 - ((v_ideal_weight_min - v_pet.weight) / v_ideal_weight_min * 100 * 2)::INTEGER);
      v_insights := array_append(v_insights, format('%s is %skg underweight (ideal: %s-%skg)',
        v_pet.name, ROUND(v_ideal_weight_min - v_pet.weight, 1), v_ideal_weight_min, v_ideal_weight_max));
      v_recommendations := array_append(v_recommendations, format('Increase food gradually, target weight: %skg', v_ideal_weight));
    ELSIF v_pet.weight > v_ideal_weight_max THEN
      -- Overweight
      v_weight_score := GREATEST(20, 100 - ((v_pet.weight - v_ideal_weight_max) / v_ideal_weight_max * 100 * 2)::INTEGER);
      v_insights := array_append(v_insights, format('%s is %skg overweight (ideal: %s-%skg)',
        v_pet.name, ROUND(v_pet.weight - v_ideal_weight_max, 1), v_ideal_weight_min, v_ideal_weight_max));
      v_recommendations := array_append(v_recommendations, format('Reduce daily food by 15-20%%, target: %skg', v_ideal_weight));
    END IF;
  ELSE
    v_weight_score := 50; -- Unknown weight
  END IF;

  -- ========================================================================
  -- ACTIVITY SCORE (age-based)
  -- ========================================================================
  IF v_pet.age IS NOT NULL THEN
    IF v_pet.age > 12 THEN
      v_activity_score := 70;
      v_insights := array_append(v_insights, format('%s is a senior pet - activity monitoring important', v_pet.name));
    ELSIF v_pet.age > 8 THEN
      v_activity_score := 85;
    ELSIF v_pet.age > 5 THEN
      v_activity_score := 95;
    END IF;
  END IF;

  -- ========================================================================
  -- MEDICAL SCORE (appointment history)
  -- ========================================================================
  SELECT COUNT(*) INTO v_recent_appointments
  FROM appointments
  WHERE pet_id = p_pet_id
    AND user_id = v_user_id
    AND date > (CURRENT_DATE - INTERVAL '365 days');

  IF v_recent_appointments = 0 THEN
    v_medical_score := 80;
    v_insights := array_append(v_insights, 'No checkup in past year - schedule veterinary visit');
    v_recommendations := array_append(v_recommendations, 'Book comprehensive health assessment within 2 weeks');
  ELSIF v_recent_appointments = 1 THEN
    v_medical_score := 95;
  END IF;

  -- ========================================================================
  -- ALERT SCORE
  -- ========================================================================
  SELECT
    COUNT(*) FILTER (WHERE NOT resolved),
    COUNT(*) FILTER (WHERE NOT resolved AND severity = 'high'),
    COUNT(*) FILTER (WHERE NOT resolved AND severity = 'medium')
  INTO v_unresolved_alerts, v_high_alerts, v_medium_alerts
  FROM alerts
  WHERE pet_id = p_pet_id AND user_id = v_user_id;

  v_alert_score := 100 - (v_high_alerts * 30) - (v_medium_alerts * 15) - ((v_unresolved_alerts - v_high_alerts - v_medium_alerts) * 5);
  v_alert_score := GREATEST(0, v_alert_score);

  IF v_high_alerts > 0 THEN
    v_insights := array_append(v_insights, format('%s urgent alert(s) require immediate attention', v_high_alerts));
  END IF;

  -- ========================================================================
  -- OVERALL SCORE CALCULATION
  -- ========================================================================
  v_overall_score := (
    v_weight_score * 30 +
    v_activity_score * 25 +
    v_medical_score * 25 +
    v_alert_score * 20
  ) / 100;

  -- Determine status
  v_status := CASE
    WHEN v_overall_score >= 90 THEN 'excellent'
    WHEN v_overall_score >= 75 THEN 'good'
    WHEN v_overall_score >= 60 THEN 'fair'
    WHEN v_overall_score >= 40 THEN 'poor'
    ELSE 'critical'
  END;

  -- ========================================================================
  -- CACHE THE SCORE
  -- ========================================================================
  INSERT INTO health_scores (pet_id, user_id, score, components, created_at)
  VALUES (
    p_pet_id,
    v_user_id,
    v_overall_score,
    jsonb_build_object(
      'weight', v_weight_score,
      'activity', v_activity_score,
      'medical', v_medical_score,
      'alerts', v_alert_score
    ),
    NOW()
  );

  -- Return the computed score
  RETURN QUERY SELECT
    v_overall_score,
    jsonb_build_object(
      'weight', v_weight_score,
      'activity', v_activity_score,
      'medical', v_medical_score,
      'alerts', v_alert_score
    ),
    v_status,
    v_insights,
    v_recommendations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION compute_health_score(UUID) TO authenticated;

-- ============================================================================
-- 2. GET LATEST HEALTH SCORE (reads from cache)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_health_score(p_pet_id UUID)
RETURNS TABLE (
  score INTEGER,
  components JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT hs.score, hs.components, hs.created_at
  FROM health_scores hs
  WHERE hs.pet_id = p_pet_id
  ORDER BY hs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_health_score(UUID) TO authenticated;

-- ============================================================================
-- 3. TRIGGER: Auto-recompute score on data changes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_recompute_health_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Recompute for the affected pet
  IF TG_OP = 'DELETE' THEN
    PERFORM compute_health_score(OLD.pet_id);
  ELSE
    PERFORM compute_health_score(NEW.pet_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to health_records
DROP TRIGGER IF EXISTS recompute_score_on_health_record ON health_records;
CREATE TRIGGER recompute_score_on_health_record
  AFTER INSERT OR UPDATE OR DELETE ON health_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_health_score();

-- Apply trigger to alerts
DROP TRIGGER IF EXISTS recompute_score_on_alert ON alerts;
CREATE TRIGGER recompute_score_on_alert
  AFTER INSERT OR UPDATE OR DELETE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_health_score();

-- Apply trigger to appointments
DROP TRIGGER IF EXISTS recompute_score_on_appointment ON appointments;
CREATE TRIGGER recompute_score_on_appointment
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_health_score();

-- ============================================================================
-- 4. BULK REFRESH SCORES (for all pets of a user)
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_all_health_scores()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_pet_id UUID;
  v_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();

  FOR v_pet_id IN SELECT id FROM pets WHERE user_id = v_user_id
  LOOP
    PERFORM compute_health_score(v_pet_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_all_health_scores() TO authenticated;
