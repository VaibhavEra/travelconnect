-- ============================================================================
-- MIGRATION 1: FIX DUPLICATE SLOT TRIGGERS (CRITICAL BUG)
-- Created: 2026-01-29
-- Issue: Slots decrement by 2 instead of 1 on acceptance
-- Cause: Multiple triggers firing on same event
-- ============================================================================

-- Drop all existing slot-related triggers
DROP TRIGGER IF EXISTS trigger_update_trip_slots ON parcel_requests;
DROP TRIGGER IF EXISTS update_trip_slots_on_request_status ON parcel_requests;
DROP TRIGGER IF EXISTS return_slot_on_cancel ON parcel_requests;

-- Drop their functions (will recreate unified version)
DROP FUNCTION IF EXISTS update_trip_slots_on_request_status();
DROP FUNCTION IF EXISTS update_trip_slots();
DROP FUNCTION IF EXISTS return_slot_on_cancellation();

-- Create single unified slot management function
CREATE OR REPLACE FUNCTION manage_trip_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle status change from pending to accepted (DECREMENT)
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE trips
    SET available_slots = GREATEST(available_slots - 1, 0)
    WHERE id = NEW.trip_id;

    RAISE NOTICE 'Slot decremented for trip % (request %)', NEW.trip_id, NEW.id;

  -- Handle cancellation or rejection from accepted state (INCREMENT BACK)
  ELSIF OLD.status = 'accepted' AND NEW.status IN ('cancelled', 'rejected') THEN
    UPDATE trips
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = NEW.trip_id;

    RAISE NOTICE 'Slot returned for trip % (request %)', NEW.trip_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create single trigger
CREATE TRIGGER manage_trip_slots_trigger
  AFTER UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION manage_trip_slots();

-- Verify: Count remaining triggers on parcel_requests
DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'parcel_requests'
  AND t.tgisinternal = false
  AND t.tgname LIKE '%slot%';

  RAISE NOTICE 'Slot-related triggers on parcel_requests: %', v_trigger_count;

  IF v_trigger_count != 1 THEN
    RAISE WARNING 'Expected 1 slot trigger, found %', v_trigger_count;
  END IF;
END $$;

-- Test the fix (if you have test data)
-- UPDATE parcel_requests SET status = 'accepted' WHERE id = '<some-pending-request-id>';
-- Check: SELECT available_slots FROM trips WHERE id = '<trip-id>';
-- Should decrease by EXACTLY 1

COMMENT ON FUNCTION manage_trip_slots() IS 
'Unified slot management: decrements on acceptance, increments on cancellation/rejection from accepted state';