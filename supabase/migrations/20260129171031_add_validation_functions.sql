-- ============================================================================
-- MIGRATION 5: ADD VALIDATION FUNCTIONS
-- ============================================================================

-- Function 1: Check if trip can be edited
CREATE OR REPLACE FUNCTION can_edit_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip RECORD;
  v_has_accepted_requests BOOLEAN;
  v_hours_until_departure INTERVAL;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM parcel_requests 
    WHERE trip_id = p_trip_id 
    AND status IN ('accepted', 'picked_up', 'delivered')
  ) INTO v_has_accepted_requests;
  
  v_hours_until_departure := (v_trip.departure_date::timestamp + v_trip.departure_time::time) - NOW();
  
  RETURN (v_hours_until_departure > INTERVAL '24 hours' AND NOT v_has_accepted_requests);
END;
$$;

-- Function 2: Validate slot reduction
CREATE OR REPLACE FUNCTION validate_slot_reduction(
  p_trip_id uuid,
  p_new_total_slots integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_accepted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_accepted_count
  FROM parcel_requests
  WHERE trip_id = p_trip_id
  AND status IN ('accepted', 'picked_up', 'delivered');
  
  IF p_new_total_slots < v_accepted_count THEN
    RAISE EXCEPTION 'Cannot reduce slots to % when % requests already accepted', 
                    p_new_total_slots, v_accepted_count;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function 3: Validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'parcel_requests' THEN
    IF OLD.status = 'delivered' AND NEW.status != 'delivered' THEN
      RAISE EXCEPTION 'Cannot change status from delivered to %', NEW.status;
    END IF;
    
    IF OLD.status IN ('pending', 'accepted') AND NEW.status = 'delivered' THEN
      RAISE EXCEPTION 'Cannot mark as delivered without pickup verification';
    END IF;
    
    IF OLD.status = 'picked_up' AND NEW.status IN ('accepted', 'pending') THEN
      RAISE EXCEPTION 'Cannot revert from picked_up to %', NEW.status;
    END IF;
    
    IF OLD.status IN ('picked_up', 'delivered') AND NEW.status = 'cancelled' THEN
      RAISE EXCEPTION 'Cannot cancel request after pickup';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS enforce_request_status_transitions ON parcel_requests;
CREATE TRIGGER enforce_request_status_transitions
  BEFORE UPDATE ON parcel_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_status_transition();
