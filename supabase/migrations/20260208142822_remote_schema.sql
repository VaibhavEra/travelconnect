drop trigger if exists "manage_trip_slots_trigger" on "public"."parcel_requests";

alter table "public"."parcel_requests" drop constraint "parcel_requests_cancelled_by_check";

alter table "public"."trips" drop constraint "trips_parcel_size_capacity_check";

drop function if exists "public"."create_trip_with_validation"(p_source text, p_destination text, p_departure_date date, p_departure_time time without time zone, p_arrival_date date, p_arrival_time time without time zone, p_transport_mode text, p_parcel_size_capacity text, p_pnr_number text, p_ticket_file_url text, p_allowed_categories text[], p_notes text);

drop function if exists "public"."create_trip_with_validation"(p_source text, p_destination text, p_departure_date date, p_departure_time time without time zone, p_arrival_date date, p_arrival_time time without time zone, p_transport_mode text, p_pnr_number text, p_ticket_file_url text, p_total_slots integer, p_allowed_categories text[], p_notes text);

drop function if exists "public"."manage_trip_slots"();

alter table "public"."parcel_requests" add constraint "parcel_requests_cancelled_by_check" CHECK (((cancelled_by)::text = ANY ((ARRAY['sender'::character varying, 'traveller'::character varying])::text[]))) not valid;

alter table "public"."parcel_requests" validate constraint "parcel_requests_cancelled_by_check";

alter table "public"."trips" add constraint "trips_parcel_size_capacity_check" CHECK (((parcel_size_capacity)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying])::text[]))) not valid;

alter table "public"."trips" validate constraint "trips_parcel_size_capacity_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_trip_with_validation(p_source text, p_destination text, p_departure_date text, p_departure_time text, p_arrival_date text, p_arrival_time text, p_transport_mode text, p_parcel_size_capacity text, p_pnr_number text, p_ticket_file_url text, p_allowed_categories text[], p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_trip_id UUID;
  v_departure_ts TIMESTAMPTZ;
  v_arrival_ts TIMESTAMPTZ;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate and convert departure datetime
  BEGIN
    v_departure_ts := (p_departure_date || ' ' || p_departure_time)::TIMESTAMPTZ;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid departure date or time format';
  END;
  
  IF v_departure_ts <= NOW() + INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Departure must be at least 1 hour in the future';
  END IF;

  -- Validate and convert arrival datetime
  BEGIN
    v_arrival_ts := (p_arrival_date || ' ' || p_arrival_time)::TIMESTAMPTZ;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid arrival date or time format';
  END;
  
  IF v_arrival_ts <= v_departure_ts THEN
    RAISE EXCEPTION 'Arrival must be after departure';
  END IF;

  -- Validate parcel size capacity
  IF p_parcel_size_capacity NOT IN ('small', 'medium', 'large') THEN
    RAISE EXCEPTION 'Invalid parcel size capacity';
  END IF;

  -- Validate transport mode
  IF p_transport_mode NOT IN ('train', 'bus', 'flight', 'car') THEN
    RAISE EXCEPTION 'Invalid transport mode';
  END IF;

  -- Validate categories
  IF array_length(p_allowed_categories, 1) IS NULL OR array_length(p_allowed_categories, 1) = 0 THEN
    RAISE EXCEPTION 'At least one category must be selected';
  END IF;

  -- Validate source != destination
  IF LOWER(TRIM(p_source)) = LOWER(TRIM(p_destination)) THEN
    RAISE EXCEPTION 'Source and destination must be different';
  END IF;

  -- Insert trip
  INSERT INTO trips (
    traveller_id,
    source,
    destination,
    departure_date,
    departure_time,
    arrival_date,
    arrival_time,
    transport_mode,
    parcel_size_capacity,
    pnr_number,
    ticket_file_url,
    allowed_categories,
    notes,
    status,
    created_at,
    updated_at
  )
  VALUES (
    auth.uid(),
    p_source,
    p_destination,
    p_departure_date::DATE,
    p_departure_time::TIME,
    p_arrival_date::DATE,
    p_arrival_time::TIME,
    p_transport_mode,
    p_parcel_size_capacity,
    p_pnr_number,
    p_ticket_file_url,
    p_allowed_categories,
    p_notes,
    'upcoming',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_trip_id;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create trip';
  END IF;

  RETURN v_trip_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_request_atomic(p_request_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_trip_id UUID;
  v_pickup_otp TEXT;
  v_trip_status TEXT;
BEGIN
  -- Get trip_id from request
  SELECT trip_id INTO v_trip_id 
  FROM parcel_requests 
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Check trip status (must be 'upcoming' to accept)
  SELECT status INTO v_trip_status 
  FROM trips 
  WHERE id = v_trip_id 
  FOR UPDATE;
  
  IF v_trip_status != 'upcoming' THEN
    RAISE EXCEPTION 'Trip is no longer available for new requests';
  END IF;
  
  -- Generate pickup OTP
  v_pickup_otp := generate_pickup_otp(p_request_id);
  
  -- Update request status to accepted
  UPDATE parcel_requests
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Return result with pickup OTP
  RETURN json_build_object(
    'request_id', p_request_id,
    'status', 'accepted',
    'pickup_otp', v_pickup_otp
  );
END;
$function$
;


  create policy "sender_update_receiver_details_before_delivery"
  on "public"."parcel_requests"
  as permissive
  for update
  to public
using (((sender_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'picked_up'::text]))))
with check (((sender_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'picked_up'::text]))));



  create policy "Users can view trips"
  on "public"."trips"
  as permissive
  for select
  to authenticated
using (((auth.uid() = traveller_id) OR ((status = 'upcoming'::text) AND (departure_date >= CURRENT_DATE) AND (traveller_id <> auth.uid()))));



