-- ============================================================================
-- MIGRATION 8: ADD CONSTRAINT CHECKS
-- ============================================================================

DO $migration$
BEGIN
  -- Prevent negative available_slots
  ALTER TABLE trips DROP CONSTRAINT IF EXISTS positive_available_slots;
  ALTER TABLE trips ADD CONSTRAINT positive_available_slots 
  CHECK (available_slots >= 0);

  -- Ensure available_slots <= total_slots
  ALTER TABLE trips DROP CONSTRAINT IF EXISTS logical_slots;
  ALTER TABLE trips ADD CONSTRAINT logical_slots
  CHECK (available_slots <= total_slots);

  -- Ensure total_slots is between 1-5
  ALTER TABLE trips DROP CONSTRAINT IF EXISTS positive_total_slots;
  ALTER TABLE trips ADD CONSTRAINT positive_total_slots
  CHECK (total_slots > 0 AND total_slots <= 5);
  
  RAISE NOTICE '✓ Added data integrity constraints';
END $migration$;

-- Clear OTP after successful verification
CREATE OR REPLACE FUNCTION clear_otp_after_use()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'picked_up' AND OLD.status = 'accepted' THEN
    NEW.pickup_otp := NULL;
    NEW.pickup_otp_expiry := NULL;
    NEW.failed_pickup_attempts := 0;
    NEW.pickup_blocked_until := NULL;
  END IF;
  
  IF NEW.status = 'delivered' AND OLD.status = 'picked_up' THEN
    NEW.delivery_otp := NULL;
    NEW.delivery_otp_expiry := NULL;
    NEW.failed_delivery_attempts := 0;
    NEW.delivery_blocked_until := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_otp_after_use_trigger ON parcel_requests;
CREATE TRIGGER clear_otp_after_use_trigger
  BEFORE UPDATE ON parcel_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION clear_otp_after_use();

-- Prevent trip cancellation with picked-up parcels
CREATE OR REPLACE FUNCTION prevent_cancellation_with_pickups()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_pickups BOOLEAN;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    SELECT EXISTS(
      SELECT 1 FROM parcel_requests
      WHERE trip_id = NEW.id
      AND status IN ('picked_up', 'delivered')
    ) INTO v_has_pickups;
    
    IF v_has_pickups THEN
      RAISE EXCEPTION 'Cannot cancel trip with picked up or delivered parcels';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_cancellation_with_pickups_trigger ON trips;
CREATE TRIGGER prevent_cancellation_with_pickups_trigger
  BEFORE UPDATE ON trips
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION prevent_cancellation_with_pickups();
