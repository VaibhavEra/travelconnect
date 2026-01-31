-- ============================================================================
-- MIGRATION 7: ADD AUTO-EXPIRE FUNCTIONS
-- ============================================================================

-- Main expire function
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS TABLE(
  expired_requests_count INTEGER,
  expired_trips_count INTEGER,
  cleaned_attempts_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_requests INTEGER;
  v_expired_trips INTEGER;
  v_cleaned_attempts INTEGER;
BEGIN
  -- Expire requests that weren't picked up before departure
  WITH expired AS (
    UPDATE parcel_requests pr
    SET status = 'expired',
        updated_at = NOW()
    FROM trips t
    WHERE pr.trip_id = t.id
    AND pr.status IN ('pending', 'accepted')
    AND (
      t.departure_date < CURRENT_DATE 
      OR (t.departure_date = CURRENT_DATE AND t.departure_time < CURRENT_TIME)
    )
    RETURNING pr.id
  )
  SELECT COUNT(*) INTO v_expired_requests FROM expired;
  
  -- Expire trips that passed departure without pickups
  WITH expired_trips AS (
    UPDATE trips
    SET status = 'expired',
        updated_at = NOW()
    WHERE status IN ('upcoming', 'locked')
    AND (
      departure_date < CURRENT_DATE 
      OR (departure_date = CURRENT_DATE AND departure_time < CURRENT_TIME)
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_trips FROM expired_trips;
  
  -- Clean old failed login attempts (older than 24h)
  WITH deleted AS (
    DELETE FROM failed_login_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned_attempts FROM deleted;
  
  -- Clear expired OTPs
  UPDATE parcel_requests
  SET pickup_otp = NULL, pickup_otp_expiry = NULL
  WHERE status IN ('expired', 'cancelled', 'rejected')
  AND pickup_otp IS NOT NULL;
  
  UPDATE parcel_requests
  SET delivery_otp = NULL, delivery_otp_expiry = NULL
  WHERE status IN ('delivered', 'failed', 'expired')
  AND delivery_otp IS NOT NULL;
  
  RETURN QUERY SELECT v_expired_requests, v_expired_trips, v_cleaned_attempts;
END;
$$;

-- Function to lock trips approaching 24h mark
CREATE OR REPLACE FUNCTION lock_trips_before_24h()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_count INTEGER;
BEGIN
  WITH locked AS (
    UPDATE trips
    SET status = 'locked',
        updated_at = NOW()
    WHERE status = 'upcoming'
    AND (
      (departure_date::timestamp + departure_time::time) - NOW() <= INTERVAL '24 hours'
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_locked_count FROM locked;
  
  RETURN v_locked_count;
END;
$$;
