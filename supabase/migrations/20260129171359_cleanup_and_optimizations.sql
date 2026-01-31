-- ============================================================================
-- MIGRATION 9: CLEANUP & OPTIMIZATIONS
-- ============================================================================

DO $migration$
BEGIN
  -- Remove redundant indexes
  DROP INDEX IF EXISTS idx_profiles_email;
  DROP INDEX IF EXISTS idx_profiles_phone;
  DROP INDEX IF EXISTS idx_profiles_username;

  -- Add composite index for common queries
  CREATE INDEX IF NOT EXISTS idx_requests_trip_status 
  ON parcel_requests (trip_id, status)
  WHERE status IN ('pending', 'accepted', 'picked_up');

  -- Add index for expiry function performance
  CREATE INDEX IF NOT EXISTS idx_trips_upcoming_departure
  ON trips (departure_date, departure_time)
  WHERE status IN ('upcoming', 'locked');

  CREATE INDEX IF NOT EXISTS idx_requests_pending_accepted
  ON parcel_requests (trip_id, status)
  WHERE status IN ('pending', 'accepted');
  
  RAISE NOTICE '✓ Cleanup and optimizations complete';
END $migration$;

-- Consolidate trip cancellation triggers
CREATE OR REPLACE FUNCTION handle_trip_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE parcel_requests
    SET 
      status = 'cancelled',
      cancelled_by = 'traveller',
      rejection_reason = 'Trip cancelled by traveller',
      updated_at = NOW()
    WHERE trip_id = NEW.id
    AND status NOT IN ('delivered', 'cancelled');
    
    RAISE NOTICE 'Cancelled all pending/accepted requests for trip %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cascade_trip_cancellation ON trips;
DROP TRIGGER IF EXISTS trigger_cancel_trip_requests ON trips;
DROP TRIGGER IF EXISTS handle_trip_cancellation_trigger ON trips;
CREATE TRIGGER handle_trip_cancellation_trigger
  AFTER UPDATE ON trips
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION handle_trip_cancellation();
