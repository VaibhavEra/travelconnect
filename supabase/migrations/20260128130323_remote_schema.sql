alter table "public"."trips" drop constraint "trips_capacity_check";

alter table "public"."trips" drop constraint "trips_status_check";

alter table "public"."trips" drop constraint "trips_total_slots_check";

alter table "public"."trips" drop constraint "trips_transport_mode_check";

alter table "public"."trips" drop constraint "valid_capacity";

alter table "public"."failed_login_attempts" enable row level security;

alter table "public"."parcel_requests" drop column "delivery_otp_expires_at";

alter table "public"."parcel_requests" drop column "pickup_otp_expires_at";

alter table "public"."parcel_requests" add column "cancelled_by" character varying(10);

alter table "public"."parcel_requests" add column "delivery_blocked_until" timestamp with time zone;

alter table "public"."parcel_requests" add column "delivery_otp_expiry" timestamp with time zone;

alter table "public"."parcel_requests" add column "failed_delivery_attempts" integer default 0;

alter table "public"."parcel_requests" add column "failed_pickup_attempts" integer default 0;

alter table "public"."parcel_requests" add column "pickup_blocked_until" timestamp with time zone;

alter table "public"."parcel_requests" add column "pickup_otp_expiry" timestamp with time zone;

alter table "public"."parcel_requests" alter column "parcel_photos" set not null;

CREATE INDEX idx_trips_departure_date ON public.trips USING btree (departure_date);

CREATE INDEX idx_trips_search_available ON public.trips USING btree (source, destination, departure_date, status) WHERE ((status = 'open'::text) AND (available_slots > 0));

alter table "public"."parcel_requests" add constraint "parcel_photos_exactly_2" CHECK ((array_length(parcel_photos, 1) = 2)) not valid;

alter table "public"."parcel_requests" validate constraint "parcel_photos_exactly_2";

alter table "public"."parcel_requests" add constraint "parcel_requests_cancelled_by_check" CHECK (((cancelled_by)::text = ANY ((ARRAY['sender'::character varying, 'traveller'::character varying])::text[]))) not valid;

alter table "public"."parcel_requests" validate constraint "parcel_requests_cancelled_by_check";

alter table "public"."trips" add constraint "valid_capacity" CHECK ((((total_slots >= 1) AND (total_slots <= 5)) AND (available_slots >= 0) AND (available_slots <= total_slots))) not valid;

alter table "public"."trips" validate constraint "valid_capacity";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_request_atomic(p_request_id uuid, p_traveller_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_trip RECORD;
  v_request RECORD;
  v_departure_time TIMESTAMPTZ;
BEGIN
  -- Get request with row lock
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Check request status
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending';
  END IF;

  -- Get trip with row lock
  SELECT * INTO v_trip
  FROM trips
  WHERE id = v_request.trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- Check traveller ownership
  IF v_trip.traveller_id != p_traveller_id THEN
    RAISE EXCEPTION 'Not authorized to accept this request';
  END IF;

  -- NEW: Check if trip has already departed
  v_departure_time := v_trip.departure_date + v_trip.departure_time::TIME;
  
  IF v_departure_time < NOW() THEN
    RAISE EXCEPTION 'Cannot accept request - trip has already departed';
  END IF;

  -- Check available slots
  IF v_trip.available_slots <= 0 THEN
    RAISE EXCEPTION 'No available slots on this trip';
  END IF;

  -- Accept request atomically
  UPDATE parcel_requests
  SET 
    status = 'accepted',
    traveller_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Decrement available slots
  UPDATE trips
  SET 
    available_slots = available_slots - 1,
    updated_at = NOW()
  WHERE id = v_request.trip_id;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_request_atomic(p_request_id uuid, p_traveller_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_trip RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending';
  END IF;

  SELECT * INTO v_trip
  FROM trips
  WHERE id = v_request.trip_id
  FOR UPDATE;

  IF v_trip.traveller_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not the owner of this trip';
  END IF;

  IF v_trip.available_slots <= 0 THEN
    RAISE EXCEPTION 'No available slots on this trip';
  END IF;

  IF v_trip.status != 'open' THEN
    RAISE EXCEPTION 'Trip is no longer accepting requests';
  END IF;

  UPDATE parcel_requests
  SET status = 'accepted',
      traveller_notes = COALESCE(p_traveller_notes, traveller_notes),
      updated_at = NOW()
  WHERE id = p_request_id;

  SELECT json_build_object(
    'id', pr.id,
    'status', pr.status,
    'traveller_notes', pr.traveller_notes,
    'trip_id', pr.trip_id
  ) INTO v_result
  FROM parcel_requests pr
  WHERE pr.id = p_request_id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_request_with_validation(p_request_id uuid, p_cancelled_by text, p_cancellation_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_trip RECORD;
  v_departure_datetime TIMESTAMP;
  v_hours_until_departure NUMERIC;
  v_result JSON;
BEGIN
  IF p_cancelled_by NOT IN ('sender', 'traveller') THEN
    RAISE EXCEPTION 'cancelled_by must be either sender or traveller';
  END IF;

  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Cannot cancel request';
  END IF;

  SELECT * INTO v_trip
  FROM trips
  WHERE id = v_request.trip_id;

  v_departure_datetime := v_trip.departure_date + v_trip.departure_time;
  v_hours_until_departure := EXTRACT(EPOCH FROM (v_departure_datetime - NOW())) / 3600;

  IF v_request.status = 'accepted' AND v_hours_until_departure < 24 THEN
    RAISE EXCEPTION 'Cannot cancel within 24 hours of departure';
  END IF;

  IF p_cancelled_by = 'sender' AND v_request.sender_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the sender can cancel as sender';
  END IF;

  IF p_cancelled_by = 'traveller' AND v_trip.traveller_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the traveller can cancel as traveller';
  END IF;

  UPDATE parcel_requests
  SET status = 'cancelled',
      cancelled_by = p_cancelled_by,
      rejection_reason = p_cancellation_reason,
      updated_at = NOW()
  WHERE id = p_request_id;

  SELECT json_build_object(
    'id', pr.id,
    'status', pr.status,
    'cancelled_by', pr.cancelled_by
  ) INTO v_result
  FROM parcel_requests pr
  WHERE pr.id = p_request_id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_trip_requests()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If trip status changed from non-cancelled to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    
    -- Cancel all pending, accepted, and picked_up requests for this trip
    UPDATE parcel_requests
    SET 
      status = 'cancelled',
      cancelled_by = 'traveller',
      rejection_reason = 'Trip was cancelled by the traveller',
      updated_at = NOW()
    WHERE trip_id = NEW.id
    AND status IN ('pending', 'accepted', 'picked_up');
    
    -- Log the cascade action
    RAISE NOTICE 'Cancelled % requests for trip %', 
      (SELECT COUNT(*) FROM parcel_requests WHERE trip_id = NEW.id AND status = 'cancelled'),
      NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cascade_trip_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    UPDATE parcel_requests
    SET status = 'cancelled',
        cancelled_by = 'traveller',
        updated_at = NOW()
    WHERE trip_id = NEW.id
    AND status IN ('pending', 'accepted', 'picked_up');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_request_with_validation(p_sender_id uuid, p_trip_id uuid, p_item_description text, p_category text, p_size text, p_parcel_photos text[], p_delivery_contact_name text, p_delivery_contact_phone text, p_sender_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request_id UUID;
  v_trip RECORD;
BEGIN
  -- Validate parcel photos (exactly 2)
  IF array_length(p_parcel_photos, 1) != 2 THEN
    RAISE EXCEPTION 'Exactly 2 parcel photos are required';
  END IF;

  -- Get trip details
  SELECT * INTO v_trip
  FROM trips
  WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- NEW: Prevent self-requests
  IF v_trip.traveller_id = p_sender_id THEN
    RAISE EXCEPTION 'Cannot create request for your own trip';
  END IF;

  -- Check if trip has departed
  IF (v_trip.departure_date + v_trip.departure_time::TIME) < NOW() THEN
    RAISE EXCEPTION 'Cannot create request for a trip that has already departed';
  END IF;

  -- Check available slots
  IF v_trip.available_slots <= 0 THEN
    RAISE EXCEPTION 'No available slots on this trip';
  END IF;

  -- Check if category is allowed
  IF NOT (p_category = ANY(v_trip.allowed_categories)) THEN
    RAISE EXCEPTION 'This category is not allowed on this trip';
  END IF;

  -- Create request
  INSERT INTO parcel_requests (
    sender_id,
    trip_id,
    item_description,
    category,
    size,
    parcel_photos,
    delivery_contact_name,
    delivery_contact_phone,
    sender_notes,
    status,
    pickup_otp,
    pickup_otp_expiry
  ) VALUES (
    p_sender_id,
    p_trip_id,
    p_item_description,
    p_category,
    p_size,
    p_parcel_photos,
    p_delivery_contact_name,
    p_delivery_contact_phone,
    p_sender_notes,
    'pending',
    LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_request_with_validation(p_trip_id uuid, p_item_description text, p_category text, p_size text, p_parcel_photos text[], p_delivery_contact_name text, p_delivery_contact_phone text, p_sender_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request_id UUID;
  v_trip RECORD;
  v_pickup_otp TEXT;
  v_pickup_otp_expiry TIMESTAMP;
BEGIN
  IF array_length(p_parcel_photos, 1) != 2 THEN
    RAISE EXCEPTION 'Exactly 2 photos are required';
  END IF;

  IF p_category NOT IN ('documents', 'electronics', 'clothing', 'food', 'medicines', 'books', 'gifts', 'others') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;

  IF p_size NOT IN ('small', 'medium', 'large') THEN
    RAISE EXCEPTION 'Invalid size';
  END IF;

  IF NOT is_trip_available(p_trip_id) THEN
    RAISE EXCEPTION 'Trip is not available for new requests';
  END IF;

  SELECT * INTO v_trip
  FROM trips
  WHERE id = p_trip_id;

  IF p_category != ALL(v_trip.allowed_categories) THEN
    RAISE EXCEPTION 'Category not allowed on this trip';
  END IF;

  v_pickup_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  v_pickup_otp_expiry := (v_trip.departure_date + v_trip.departure_time) + INTERVAL '24 hours';

  INSERT INTO parcel_requests (
    sender_id, trip_id, item_description,
    category, size, parcel_photos,
    delivery_contact_name, delivery_contact_phone,
    sender_notes, pickup_otp, pickup_otp_expiry,
    status
  ) VALUES (
    auth.uid(), p_trip_id, p_item_description,
    p_category, p_size, p_parcel_photos,
    p_delivery_contact_name, p_delivery_contact_phone,
    p_sender_notes, v_pickup_otp, v_pickup_otp_expiry,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_trip_with_validation(p_source text, p_destination text, p_departure_date date, p_departure_time time without time zone, p_arrival_date date, p_arrival_time time without time zone, p_transport_mode text, p_pnr_number text, p_ticket_file_url text, p_total_slots integer, p_allowed_categories text[], p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_trip_id UUID;
BEGIN
  PERFORM validate_trip_dates(
    p_departure_date,
    p_departure_time,
    p_arrival_date,
    p_arrival_time
  );

  IF p_transport_mode NOT IN ('flight', 'train', 'bus', 'car') THEN
    RAISE EXCEPTION 'Invalid transport mode';
  END IF;

  IF p_total_slots < 1 OR p_total_slots > 10 THEN
    RAISE EXCEPTION 'Total slots must be between 1 and 10';
  END IF;

  INSERT INTO trips (
    traveller_id, source, destination,
    departure_date, departure_time,
    arrival_date, arrival_time,
    transport_mode, pnr_number, ticket_file_url,
    total_slots, available_slots,
    allowed_categories, notes, status
  ) VALUES (
    auth.uid(), p_source, p_destination,
    p_departure_date, p_departure_time,
    p_arrival_date, p_arrival_time,
    p_transport_mode, p_pnr_number, p_ticket_file_url,
    p_total_slots, p_total_slots,
    p_allowed_categories, p_notes, 'open'
  )
  RETURNING id INTO v_trip_id;

  RETURN v_trip_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_trip_available(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  trip_record RECORD;
  departure_datetime TIMESTAMP;
BEGIN
  SELECT * INTO trip_record 
  FROM trips 
  WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;
  
  departure_datetime := trip_record.departure_date + trip_record.departure_time;
  
  IF departure_datetime < NOW() + INTERVAL '1 hour' THEN
    RETURN FALSE;
  END IF;
  
  IF trip_record.status != 'open' OR trip_record.available_slots <= 0 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.return_slot_on_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only return slot if status changed from 'accepted' to 'cancelled'
  IF OLD.status = 'accepted' AND NEW.status = 'cancelled' THEN
    UPDATE trips 
    SET available_slots = available_slots + 1,
        updated_at = NOW()
    WHERE id = OLD.trip_id
      AND available_slots < total_slots; -- Safety check
    
    -- Log the slot return
    RAISE NOTICE 'Returned slot for trip % after request % cancellation', OLD.trip_id, OLD.id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_trip_slots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    UPDATE trips 
    SET available_slots = available_slots - 1,
        updated_at = NOW()
    WHERE id = NEW.trip_id
    AND available_slots > 0;
  END IF;

  IF NEW.status = 'cancelled' AND (OLD.status = 'accepted' OR OLD.status = 'pending') THEN
    IF OLD.status = 'accepted' AND NEW.cancelled_by = 'sender' THEN
      UPDATE trips 
      SET available_slots = available_slots + 1,
          updated_at = NOW()
      WHERE id = NEW.trip_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_trip_dates(p_departure_date date, p_departure_time time without time zone, p_arrival_date date, p_arrival_time time without time zone)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  departure_datetime TIMESTAMP;
  arrival_datetime TIMESTAMP;
BEGIN
  departure_datetime := p_departure_date + p_departure_time;
  arrival_datetime := p_arrival_date + p_arrival_time;
  
  IF departure_datetime < NOW() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Departure cannot be in the past';
  END IF;
  
  IF arrival_datetime <= departure_datetime + INTERVAL '30 minutes' THEN
    RAISE EXCEPTION 'Arrival must be at least 30 minutes after departure';
  END IF;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_delivery_otp(p_request_id uuid, p_otp text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Check if blocked
  IF v_request.delivery_blocked_until IS NOT NULL 
     AND v_request.delivery_blocked_until > NOW() THEN
    RAISE EXCEPTION 'Too many failed attempts. Try again after %', 
                    v_request.delivery_blocked_until::TEXT;
  END IF;

  -- Check if picked up
  IF v_request.status != 'picked_up' THEN
    RAISE EXCEPTION 'Request status must be picked_up to verify delivery';
  END IF;

  -- Check OTP expiry
  IF v_request.delivery_otp_expiry < NOW() THEN
    RAISE EXCEPTION 'Delivery OTP has expired';
  END IF;

  -- Verify OTP
  IF v_request.delivery_otp = p_otp THEN
    -- SUCCESS: Mark as delivered
    UPDATE parcel_requests
    SET 
      status = 'delivered',
      failed_delivery_attempts = 0, -- Reset on success
      delivery_blocked_until = NULL,
      updated_at = NOW()
    WHERE id = p_request_id;
    
    v_is_valid := TRUE;
  ELSE
    -- FAILURE: Increment counter
    UPDATE parcel_requests
    SET 
      failed_delivery_attempts = failed_delivery_attempts + 1,
      -- Block for 1 hour after 5 failed attempts
      delivery_blocked_until = CASE 
        WHEN failed_delivery_attempts + 1 >= 5 
        THEN NOW() + INTERVAL '1 hour'
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Check if now blocked
    IF v_request.failed_delivery_attempts + 1 >= 5 THEN
      RAISE EXCEPTION 'Too many failed attempts. Blocked for 1 hour';
    ELSE
      RAISE EXCEPTION 'Invalid OTP. % attempts remaining', 
                      (5 - v_request.failed_delivery_attempts - 1);
    END IF;
  END IF;

  RETURN v_is_valid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_pickup_otp(p_request_id uuid, p_otp text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Check if blocked
  IF v_request.pickup_blocked_until IS NOT NULL 
     AND v_request.pickup_blocked_until > NOW() THEN
    RAISE EXCEPTION 'Too many failed attempts. Try again after %', 
                    v_request.pickup_blocked_until::TEXT;
  END IF;

  -- Check if already picked up
  IF v_request.status != 'accepted' THEN
    RAISE EXCEPTION 'Request status must be accepted to verify pickup';
  END IF;

  -- Check OTP expiry
  IF v_request.pickup_otp_expiry < NOW() THEN
    RAISE EXCEPTION 'Pickup OTP has expired';
  END IF;

  -- Verify OTP
  IF v_request.pickup_otp = p_otp THEN
    -- SUCCESS: Generate delivery OTP and update status
    UPDATE parcel_requests
    SET 
      status = 'picked_up',
      delivery_otp = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
      delivery_otp_expiry = NOW() + INTERVAL '72 hours',
      failed_pickup_attempts = 0, -- Reset on success
      pickup_blocked_until = NULL,
      updated_at = NOW()
    WHERE id = p_request_id;
    
    v_is_valid := TRUE;
  ELSE
    -- FAILURE: Increment counter
    UPDATE parcel_requests
    SET 
      failed_pickup_attempts = failed_pickup_attempts + 1,
      -- Block for 1 hour after 5 failed attempts
      pickup_blocked_until = CASE 
        WHEN failed_pickup_attempts + 1 >= 5 
        THEN NOW() + INTERVAL '1 hour'
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Check if now blocked
    IF v_request.failed_pickup_attempts + 1 >= 5 THEN
      RAISE EXCEPTION 'Too many failed attempts. Blocked for 1 hour';
    ELSE
      RAISE EXCEPTION 'Invalid OTP. % attempts remaining', 
                      (5 - v_request.failed_pickup_attempts - 1);
    END IF;
  END IF;

  RETURN v_is_valid;
END;
$function$
;


  create policy "Users can view profiles of connected users"
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM (public.parcel_requests pr
     JOIN public.trips t ON ((pr.trip_id = t.id)))
  WHERE ((t.traveller_id = auth.uid()) AND (pr.sender_id = profiles.id) AND (pr.status = ANY (ARRAY['accepted'::text, 'picked_up'::text, 'delivered'::text, 'cancelled'::text, 'rejected'::text]))))) OR (EXISTS ( SELECT 1
   FROM (public.parcel_requests pr
     JOIN public.trips t ON ((pr.trip_id = t.id)))
  WHERE ((pr.sender_id = auth.uid()) AND (t.traveller_id = profiles.id) AND (pr.status = ANY (ARRAY['accepted'::text, 'picked_up'::text, 'delivered'::text, 'cancelled'::text, 'rejected'::text])))))));



  create policy "Users can view related profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM (public.parcel_requests pr
     JOIN public.trips t ON ((t.id = pr.trip_id)))
  WHERE ((t.traveller_id = auth.uid()) AND (pr.sender_id = profiles.id)))) OR (EXISTS ( SELECT 1
   FROM (public.parcel_requests pr
     JOIN public.trips t ON ((t.id = pr.trip_id)))
  WHERE ((pr.sender_id = auth.uid()) AND (t.traveller_id = profiles.id))))));


CREATE TRIGGER return_slot_on_cancel AFTER UPDATE ON public.parcel_requests FOR EACH ROW WHEN (((old.status = 'accepted'::text) AND (new.status = 'cancelled'::text))) EXECUTE FUNCTION public.return_slot_on_cancellation();

CREATE TRIGGER update_trip_slots_on_request_status AFTER UPDATE ON public.parcel_requests FOR EACH ROW EXECUTE FUNCTION public.update_trip_slots();

CREATE TRIGGER cascade_trip_cancellation AFTER UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.cascade_trip_cancellation();

CREATE TRIGGER trigger_cancel_trip_requests AFTER UPDATE ON public.trips FOR EACH ROW WHEN (((new.status = 'cancelled'::text) AND (old.status <> 'cancelled'::text))) EXECUTE FUNCTION public.cancel_trip_requests();


  create policy "Ticket files are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'trip-tickets'::text));



  create policy "Users can delete their own tickets"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'trip-tickets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own tickets"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'trip-tickets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



