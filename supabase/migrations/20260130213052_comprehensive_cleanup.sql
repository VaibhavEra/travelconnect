-- ============================================================================
-- TRAVELCONNECT COMPREHENSIVE DATABASE CLEANUP (CORRECTED)
-- Generated: Saturday, January 31, 2026, 3:04 AM IST
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP DEPENDENT TRIGGERS FIRST (BEFORE DROPPING FUNCTIONS)
-- ----------------------------------------------------------------------------

-- Drop trigger that depends on handle_trip_cancellation
DROP TRIGGER IF EXISTS handle_trip_cancellation_trigger ON trips;

-- Drop trigger that depends on cancel_trip_requests (if exists)
DROP TRIGGER IF EXISTS cancel_trip_requests_trigger ON trips;

-- ----------------------------------------------------------------------------
-- 2. FIX OTP FUNCTION RETURN TYPES (CRITICAL)
-- ----------------------------------------------------------------------------

-- Drop existing verify_pickup_otp
DROP FUNCTION IF EXISTS verify_pickup_otp(uuid, text);

-- Recreate with JSON return type
CREATE OR REPLACE FUNCTION verify_pickup_otp(
  p_request_id UUID,
  p_otp TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_delivery_otp TEXT;
  v_delivery_otp_expiry TIMESTAMP;
BEGIN
  -- Get request with lock
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Check status
  IF v_request.status != 'accepted' THEN
    RAISE EXCEPTION 'Request must be in accepted status';
  END IF;

  -- Check if blocked
  IF v_request.pickup_blocked_until IS NOT NULL 
     AND v_request.pickup_blocked_until > NOW() THEN
    RAISE EXCEPTION 'Too many failed attempts. Try again later.';
  END IF;

  -- Check OTP expiry
  IF v_request.pickup_otp_expiry < NOW() THEN
    RAISE EXCEPTION 'Pickup OTP has expired';
  END IF;

  -- Verify OTP
  IF v_request.pickup_otp != p_otp THEN
    -- Increment failed attempts
    UPDATE parcel_requests
    SET failed_pickup_attempts = COALESCE(failed_pickup_attempts, 0) + 1,
        pickup_blocked_until = CASE 
          WHEN COALESCE(failed_pickup_attempts, 0) + 1 >= 3 
          THEN NOW() + INTERVAL '15 minutes'
          ELSE NULL
        END
    WHERE id = p_request_id;
    
    RAISE EXCEPTION 'Invalid OTP';
  END IF;

  -- Generate delivery OTP
  v_delivery_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  v_delivery_otp_expiry := NOW() + INTERVAL '48 hours';

  -- Update request to picked_up
  UPDATE parcel_requests
  SET status = 'picked_up',
      picked_up_at = NOW(),
      delivery_otp = v_delivery_otp,
      delivery_otp_expiry = v_delivery_otp_expiry,
      failed_pickup_attempts = 0,
      pickup_blocked_until = NULL,
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Return JSON result
  RETURN json_build_object(
    'request_id', p_request_id,
    'status', 'picked_up',
    'delivery_otp', v_delivery_otp,
    'delivery_otp_expiry', v_delivery_otp_expiry
  );
END;
$$;

-- Drop existing verify_delivery_otp
DROP FUNCTION IF EXISTS verify_delivery_otp(uuid, text);

-- Recreate with JSON return type
CREATE OR REPLACE FUNCTION verify_delivery_otp(
  p_request_id UUID,
  p_otp TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_delivered_at TIMESTAMP;
BEGIN
  -- Get request with lock
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Check status
  IF v_request.status != 'picked_up' THEN
    RAISE EXCEPTION 'Request must be in picked_up status';
  END IF;

  -- Check if blocked
  IF v_request.delivery_blocked_until IS NOT NULL 
     AND v_request.delivery_blocked_until > NOW() THEN
    RAISE EXCEPTION 'Too many failed attempts. Try again later.';
  END IF;

  -- Check OTP expiry
  IF v_request.delivery_otp_expiry < NOW() THEN
    RAISE EXCEPTION 'Delivery OTP has expired';
  END IF;

  -- Verify OTP
  IF v_request.delivery_otp != p_otp THEN
    -- Increment failed attempts
    UPDATE parcel_requests
    SET failed_delivery_attempts = COALESCE(failed_delivery_attempts, 0) + 1,
        delivery_blocked_until = CASE 
          WHEN COALESCE(failed_delivery_attempts, 0) + 1 >= 3 
          THEN NOW() + INTERVAL '15 minutes'
          ELSE NULL
        END
    WHERE id = p_request_id;
    
    RAISE EXCEPTION 'Invalid OTP';
  END IF;

  v_delivered_at := NOW();

  -- Update request to delivered
  UPDATE parcel_requests
  SET status = 'delivered',
      delivered_at = v_delivered_at,
      failed_delivery_attempts = 0,
      delivery_blocked_until = NULL,
      updated_at = v_delivered_at
  WHERE id = p_request_id;

  -- Return JSON result
  RETURN json_build_object(
    'request_id', p_request_id,
    'status', 'delivered',
    'delivered_at', v_delivered_at
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. REMOVE DUPLICATE FUNCTIONS
-- ----------------------------------------------------------------------------

-- Now we can safely drop the functions
DROP FUNCTION IF EXISTS cancel_trip_requests();
DROP FUNCTION IF EXISTS handle_trip_cancellation();

-- We keep cascade_trip_cancellation as the primary one

-- Drop the overloaded version with p_sender_id (security risk)
DROP FUNCTION IF EXISTS create_request_with_validation(
  uuid, uuid, text, text, text, text[], text, text, text
);

-- ----------------------------------------------------------------------------
-- 4. REMOVE DUPLICATE CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE trips DROP CONSTRAINT IF EXISTS logical_slots;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS positive_available_slots;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_available_slots_check;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS valid_slots;

-- Keep only valid_capacity and positive_total_slots

-- ----------------------------------------------------------------------------
-- 5. ADD PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_requests_status_sender 
ON parcel_requests(sender_id, status);

CREATE INDEX IF NOT EXISTS idx_requests_status_trip 
ON parcel_requests(trip_id, status);

CREATE INDEX IF NOT EXISTS idx_trips_traveller_status 
ON trips(traveller_id, status);

-- ----------------------------------------------------------------------------
-- 6. ENSURE CASCADE_TRIP_CANCELLATION TRIGGER EXISTS
-- ----------------------------------------------------------------------------

-- Make sure the cascade_trip_cancellation trigger is properly set up
DROP TRIGGER IF EXISTS cascade_trip_cancellation_trigger ON trips;

CREATE TRIGGER cascade_trip_cancellation_trigger
AFTER UPDATE OF status ON trips
FOR EACH ROW
EXECUTE FUNCTION cascade_trip_cancellation();

-- ----------------------------------------------------------------------------
-- 7. ADD MISSING TRIGGER FOR AUTO-COMPLETE TRIP
-- ----------------------------------------------------------------------------

-- Drop old trigger if exists with different name
DROP TRIGGER IF EXISTS trigger_auto_complete_trip ON parcel_requests;
DROP TRIGGER IF EXISTS check_trip_completion_on_delivery ON parcel_requests;

-- Ensure trigger for auto-completing trips exists
CREATE OR REPLACE FUNCTION auto_complete_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_requests INTEGER;
  v_delivered_requests INTEGER;
BEGIN
  -- Only run on delivery status change
  IF NEW.status = 'delivered' AND OLD.status = 'picked_up' THEN
    -- Count non-cancelled/rejected requests
    SELECT COUNT(*) INTO v_total_requests
    FROM parcel_requests
    WHERE trip_id = NEW.trip_id
    AND status NOT IN ('cancelled', 'rejected', 'expired', 'failed');

    -- Count delivered requests
    SELECT COUNT(*) INTO v_delivered_requests
    FROM parcel_requests
    WHERE trip_id = NEW.trip_id
    AND status = 'delivered';

    -- Auto-complete trip if all delivered
    IF v_total_requests > 0 AND v_total_requests = v_delivered_requests THEN
      UPDATE trips
      SET status = 'completed',
          updated_at = NOW()
      WHERE id = NEW.trip_id
      AND status NOT IN ('completed', 'cancelled');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_complete_trip
AFTER UPDATE OF status ON parcel_requests
FOR EACH ROW
EXECUTE FUNCTION auto_complete_trip();

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
