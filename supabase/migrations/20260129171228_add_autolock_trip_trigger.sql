-- ============================================================================
-- MIGRATION 6: ADD AUTO-LOCK TRIP TRIGGER
-- ============================================================================

DO $migration$
BEGIN
  -- Drop triggers if they exist
  DROP TRIGGER IF EXISTS auto_lock_trip_on_acceptance_trigger ON parcel_requests;
  DROP TRIGGER IF EXISTS update_trip_status_trigger ON parcel_requests;
END $migration$;

-- Function to auto-lock trip on first acceptance
CREATE OR REPLACE FUNCTION auto_lock_trip_on_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_status TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT status INTO v_trip_status
    FROM trips
    WHERE id = NEW.trip_id;
    
    IF v_trip_status = 'upcoming' THEN
      UPDATE trips
      SET status = 'locked',
          updated_at = NOW()
      WHERE id = NEW.trip_id
      AND status = 'upcoming';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to transition trip status based on request statuses
CREATE OR REPLACE FUNCTION update_trip_status_from_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_picked_up BOOLEAN;
  v_all_delivered BOOLEAN;
  v_accepted_count INTEGER;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM parcel_requests 
    WHERE trip_id = NEW.trip_id 
    AND status = 'picked_up'
  ) INTO v_has_picked_up;
  
  SELECT COUNT(*) INTO v_accepted_count
  FROM parcel_requests
  WHERE trip_id = NEW.trip_id
  AND status IN ('accepted', 'picked_up', 'delivered');
  
  SELECT NOT EXISTS(
    SELECT 1 FROM parcel_requests
    WHERE trip_id = NEW.trip_id
    AND status IN ('accepted', 'picked_up')
  ) AND v_accepted_count > 0
  INTO v_all_delivered;
  
  IF v_all_delivered THEN
    UPDATE trips 
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.trip_id AND status != 'completed';
    
  ELSIF v_has_picked_up THEN
    UPDATE trips 
    SET status = 'in_progress', updated_at = NOW()
    WHERE id = NEW.trip_id AND status NOT IN ('in_progress', 'completed');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER auto_lock_trip_on_acceptance_trigger
  AFTER UPDATE ON parcel_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION auto_lock_trip_on_acceptance();

CREATE TRIGGER update_trip_status_trigger
  AFTER UPDATE ON parcel_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_trip_status_from_requests();
