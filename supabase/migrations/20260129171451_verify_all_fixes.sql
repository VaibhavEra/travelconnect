-- ============================================================================
-- MIGRATION 10: VERIFY ALL FIXES
-- ============================================================================

DO $migration$
DECLARE
  v_count INTEGER;
  v_check BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TravelConnect Migration Verification';
  RAISE NOTICE '========================================';
  
  -- Check 1: Slot trigger
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'parcel_requests'
  AND t.tgname LIKE '%slot%'
  AND t.tgisinternal = false;
  
  IF v_count = 1 THEN
    RAISE NOTICE '✓ Slot management trigger: PASS';
  ELSE
    RAISE NOTICE '✗ Slot management trigger: FAIL (found % triggers)', v_count;
  END IF;
  
  -- Check 2: generate_pickup_otp exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc WHERE proname = 'generate_pickup_otp'
  ) INTO v_check;
  
  IF v_check THEN
    RAISE NOTICE '✓ generate_pickup_otp: PASS';
  ELSE
    RAISE NOTICE '✗ generate_pickup_otp: FAIL';
  END IF;
  
  -- Check 3: OTP function duplicates removed
  SELECT COUNT(*) INTO v_count FROM pg_proc WHERE proname = 'verify_pickup_otp';
  
  IF v_count = 1 THEN
    RAISE NOTICE '✓ verify_pickup_otp unique: PASS';
  ELSE
    RAISE NOTICE '✗ verify_pickup_otp duplicates: FAIL (found %)', v_count;
  END IF;
  
  -- Check 4: Status enums updated
  SELECT pg_get_constraintdef(oid)::TEXT LIKE '%upcoming%' 
         AND pg_get_constraintdef(oid)::TEXT LIKE '%locked%'
  INTO v_check
  FROM pg_constraint WHERE conname = 'trips_status_check';
  
  IF v_check THEN
    RAISE NOTICE '✓ Trip status enum: PASS';
  ELSE
    RAISE NOTICE '✗ Trip status enum: FAIL';
  END IF;
  
  -- Check 5: Validation functions
  SELECT COUNT(*) INTO v_count FROM pg_proc 
  WHERE proname IN ('can_edit_trip', 'validate_slot_reduction', 'validate_status_transition');
  
  IF v_count = 3 THEN
    RAISE NOTICE '✓ Validation functions: PASS';
  ELSE
    RAISE NOTICE '✗ Validation functions: FAIL (found %)', v_count;
  END IF;
  
  -- Check 6: Auto-lock trigger
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger WHERE tgname = 'auto_lock_trip_on_acceptance_trigger'
  ) INTO v_check;
  
  IF v_check THEN
    RAISE NOTICE '✓ Auto-lock trigger: PASS';
  ELSE
    RAISE NOTICE '✗ Auto-lock trigger: FAIL';
  END IF;
  
  -- Check 7: Expire function
  SELECT EXISTS(
    SELECT 1 FROM pg_proc WHERE proname = 'expire_old_requests'
  ) INTO v_check;
  
  IF v_check THEN
    RAISE NOTICE '✓ Expire function: PASS';
  ELSE
    RAISE NOTICE '✗ Expire function: FAIL';
  END IF;
  
  -- Check 8: Constraints
  SELECT COUNT(*) INTO v_count FROM pg_constraint 
  WHERE conname IN ('positive_available_slots', 'logical_slots', 'positive_total_slots');
  
  IF v_count = 3 THEN
    RAISE NOTICE '✓ Data integrity constraints: PASS';
  ELSE
    RAISE NOTICE '✗ Data integrity constraints: FAIL (found %)', v_count;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification Complete!';
  RAISE NOTICE '========================================';
END $migration$;
