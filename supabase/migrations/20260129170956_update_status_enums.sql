-- ============================================================================
-- MIGRATION 4: UPDATE STATUS ENUMS
-- ============================================================================

DO $migration$
BEGIN
  -- Update existing 'open' trips to 'upcoming'
  UPDATE trips SET status = 'upcoming' WHERE status = 'open';
  
  -- Drop old constraints
  ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
  ALTER TABLE parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_status_check;
  
  -- Add new constraints with all required statuses
  ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('upcoming', 'locked', 'in_progress', 'completed', 'cancelled', 'expired'));
  
  ALTER TABLE parcel_requests ADD CONSTRAINT parcel_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled', 'expired', 'failed'));
  
  -- Update default value
  ALTER TABLE trips ALTER COLUMN status SET DEFAULT 'upcoming';
  
  -- Update indexes
  DROP INDEX IF EXISTS idx_trips_available;
  CREATE INDEX idx_trips_available ON trips (status, available_slots) 
  WHERE status = 'upcoming';
  
  DROP INDEX IF EXISTS idx_trips_search_available;
  CREATE INDEX idx_trips_search_available ON trips (source, destination, departure_date, status) 
  WHERE status = 'upcoming' AND available_slots > 0;
  
  RAISE NOTICE '✓ Status enums updated successfully';
END $migration$;
