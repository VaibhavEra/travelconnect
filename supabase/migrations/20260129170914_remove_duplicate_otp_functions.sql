-- ============================================================================
-- MIGRATION 3: REMOVE DUPLICATE OTP FUNCTIONS
-- ============================================================================

DO $migration$
DECLARE
  v_pickup_count INTEGER;
  v_delivery_count INTEGER;
BEGIN
  -- Drop old simple verify_pickup_otp (uses wrong column names)
  DROP FUNCTION IF EXISTS verify_pickup_otp(uuid, character varying);
  
  -- Drop old simple verify_delivery_otp (uses wrong column names)
  DROP FUNCTION IF EXISTS verify_delivery_otp(uuid, character varying);
  
  -- Verify only correct versions remain
  SELECT COUNT(*) INTO v_pickup_count
  FROM pg_proc
  WHERE proname = 'verify_pickup_otp';
  
  SELECT COUNT(*) INTO v_delivery_count
  FROM pg_proc
  WHERE proname = 'verify_delivery_otp';
  
  IF v_pickup_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 verify_pickup_otp function, found %', v_pickup_count;
  END IF;
  
  IF v_delivery_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 verify_delivery_otp function, found %', v_delivery_count;
  END IF;
  
  RAISE NOTICE '✓ Duplicate functions removed successfully';
END $migration$;
