


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."cancellation_source" AS ENUM (
    'sender',
    'traveller'
);


ALTER TYPE "public"."cancellation_source" OWNER TO "postgres";


CREATE TYPE "public"."parcel_category" AS ENUM (
    'documents',
    'clothing',
    'medicines',
    'books',
    'small_items'
);


ALTER TYPE "public"."parcel_category" OWNER TO "postgres";


CREATE TYPE "public"."parcel_size" AS ENUM (
    'small',
    'medium',
    'large'
);


ALTER TYPE "public"."parcel_size" OWNER TO "postgres";


CREATE TYPE "public"."request_status" AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'picked_up',
    'delivered',
    'cancelled',
    'expired',
    'failed'
);


ALTER TYPE "public"."request_status" OWNER TO "postgres";


CREATE TYPE "public"."transport_mode" AS ENUM (
    'flight',
    'train',
    'bus',
    'car'
);


ALTER TYPE "public"."transport_mode" OWNER TO "postgres";


CREATE TYPE "public"."trip_status" AS ENUM (
    'upcoming',
    'locked',
    'in_progress',
    'completed',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."trip_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_request_atomic"("p_request_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_trip_id UUID;
  v_pickup_otp TEXT;
  v_trip_status TEXT;
BEGIN
  SELECT trip_id INTO v_trip_id FROM parcel_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  SELECT status INTO v_trip_status FROM trips WHERE id = v_trip_id FOR UPDATE;
  
  IF v_trip_status != 'upcoming' THEN
    RAISE EXCEPTION 'Trip is no longer available';
  END IF;
  
  v_pickup_otp := generate_pickup_otp(p_request_id);
  
  UPDATE parcel_requests
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'request_id', p_request_id,
    'status', 'accepted',
    'pickup_otp', v_pickup_otp
  );
END;
$$;


ALTER FUNCTION "public"."accept_request_atomic"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_complete_trip"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."auto_complete_trip"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_lock_trip_on_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_trip_status TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT status INTO v_trip_status FROM trips WHERE id = NEW.trip_id;
    
    IF v_trip_status = 'upcoming' THEN
      UPDATE trips SET status = 'locked', updated_at = NOW() WHERE id = NEW.trip_id AND status = 'upcoming';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_lock_trip_on_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_request_details"("p_request_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM parcel_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF v_request.sender_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_request.status = 'pending';
END;
$$;


ALTER FUNCTION "public"."can_edit_request_details"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_trip"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."can_edit_trip"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_trip_dates"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_trip RECORD;
  v_has_picked_up BOOLEAN;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF v_trip.traveller_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM parcel_requests
    WHERE trip_id = p_trip_id
    AND status IN ('picked_up', 'delivered')
  ) INTO v_has_picked_up;
  
  IF v_has_picked_up THEN
    RETURN FALSE;
  END IF;
  
  IF v_trip.status IN ('completed', 'cancelled', 'expired') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."can_edit_trip_dates"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_request_with_validation"("p_request_id" "uuid", "p_cancelled_by" "text", "p_cancellation_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."cancel_request_with_validation"("p_request_id" "uuid", "p_cancelled_by" "text", "p_cancellation_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cascade_trip_cancellation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE parcel_requests
    SET status = 'cancelled',
        cancelled_by = 'traveller',
        updated_at = NOW()
    WHERE trip_id = NEW.id
      AND status NOT IN ('delivered', 'cancelled', 'rejected', 'expired');
    
    RAISE NOTICE 'Trip % cancelled, cascading to linked requests', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cascade_trip_cancellation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_available"("check_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;


ALTER FUNCTION "public"."check_email_available"("check_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_parcel_request_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_requests INTEGER;
  delivered_requests INTEGER;
BEGIN
  -- Count non-rejected/cancelled requests
  SELECT COUNT(*) INTO total_requests
  FROM parcel_requests
  WHERE trip_id = NEW.trip_id 
    AND status NOT IN ('rejected', 'cancelled');
  
  -- Count delivered requests
  SELECT COUNT(*) INTO delivered_requests
  FROM parcel_requests
  WHERE trip_id = NEW.trip_id 
    AND status = 'delivered';
  
  -- Auto-complete trip if all delivered
  IF total_requests > 0 AND total_requests = delivered_requests THEN
    UPDATE trips 
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = NEW.trip_id AND status != 'completed';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_parcel_request_completion"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_parcel_request_completion"() IS 'Auto-completes trip when all parcel requests are delivered';



CREATE OR REPLACE FUNCTION "public"."check_phone_available"("check_phone" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE phone = check_phone
  );
END;
$$;


ALTER FUNCTION "public"."check_phone_available"("check_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_username_available"("check_username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;


ALTER FUNCTION "public"."check_username_available"("check_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_failed_attempts"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE email = user_email;
END;
$$;


ALTER FUNCTION "public"."clear_failed_attempts"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_otp_after_use"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."clear_otp_after_use"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_request_with_validation"("p_trip_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[], "p_delivery_contact_name" "text", "p_delivery_contact_phone" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request_id UUID;
  v_trip RECORD;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_trip.status NOT IN ('upcoming') THEN
    RAISE EXCEPTION 'Trip is not available for booking';
  END IF;

  IF v_trip.departure_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Trip departure date has passed';
  END IF;

  IF NOT (p_category = ANY(v_trip.allowed_categories)) THEN
    RAISE EXCEPTION 'Item category not allowed for this trip';
  END IF;

  IF array_length(p_parcel_photos, 1) < 2 THEN
    RAISE EXCEPTION 'At least 2 parcel photos are required';
  END IF;

  INSERT INTO parcel_requests (
    trip_id,
    sender_id,
    item_description,
    category,
    parcel_photos,
    delivery_contact_name,
    delivery_contact_phone,
    status
  ) VALUES (
    p_trip_id,
    auth.uid(),
    p_item_description,
    p_category,
    p_parcel_photos,
    p_delivery_contact_name,
    p_delivery_contact_phone,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;


ALTER FUNCTION "public"."create_request_with_validation"("p_trip_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[], "p_delivery_contact_name" "text", "p_delivery_contact_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_total_slots" integer, "p_allowed_categories" "text"[], "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_trip_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate dates
  IF p_departure_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Departure date cannot be in the past';
  END IF;

  IF p_arrival_date < p_departure_date THEN
    RAISE EXCEPTION 'Arrival date cannot be before departure date';
  END IF;

  -- Validate source and destination are different
  IF LOWER(TRIM(p_source)) = LOWER(TRIM(p_destination)) THEN
    RAISE EXCEPTION 'Source and destination must be different';
  END IF;

  -- Insert trip with 'upcoming' status
  INSERT INTO trips (
    traveller_id,
    source,
    destination,
    departure_date,
    departure_time,
    arrival_date,
    arrival_time,
    transport_mode,
    pnr_number,
    ticket_file_url,
    total_slots,
    available_slots,
    allowed_categories,
    notes,
    status
  )
  VALUES (
    v_user_id,
    p_source,
    p_destination,
    p_departure_date,
    p_departure_time,
    p_arrival_date,
    p_arrival_time,
    p_transport_mode,
    p_pnr_number,
    p_ticket_file_url,
    p_total_slots,
    p_total_slots,
    p_allowed_categories,
    p_notes,
    'upcoming'  -- ✅ FIXED: 'upcoming' instead of 'open'
  )
  RETURNING id INTO v_trip_id;

  RETURN v_trip_id;
END;
$$;


ALTER FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_total_slots" integer, "p_allowed_categories" "text"[], "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_parcel_size_capacity" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_allowed_categories" "text"[], "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_trip_id UUID;
BEGIN
  IF p_parcel_size_capacity NOT IN ('small', 'medium', 'large') THEN
    RAISE EXCEPTION 'Invalid parcel size capacity. Must be small, medium, or large';
  END IF;

  IF NOT validate_trip_dates(p_departure_date, p_departure_time, p_arrival_date, p_arrival_time) THEN
    RAISE EXCEPTION 'Invalid trip dates';
  END IF;

  IF LOWER(TRIM(p_source)) = LOWER(TRIM(p_destination)) THEN
    RAISE EXCEPTION 'Source and destination cannot be the same';
  END IF;

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
    status
  ) VALUES (
    auth.uid(),
    p_source,
    p_destination,
    p_departure_date,
    p_departure_time,
    p_arrival_date,
    p_arrival_time,
    p_transport_mode,
    p_parcel_size_capacity,
    p_pnr_number,
    p_ticket_file_url,
    p_allowed_categories,
    p_notes,
    'upcoming'
  )
  RETURNING id INTO v_trip_id;

  RETURN v_trip_id;
END;
$$;


ALTER FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_parcel_size_capacity" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_allowed_categories" "text"[], "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_requests"() RETURNS TABLE("expired_requests_count" integer, "expired_trips_count" integer, "cleaned_attempts_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_expired_requests INTEGER;
  v_expired_trips INTEGER;
  v_cleaned_attempts INTEGER;
BEGIN
  DELETE FROM failed_login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_cleaned_attempts = ROW_COUNT;
  
  UPDATE trips
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('upcoming', 'locked')
    AND arrival_date < CURRENT_DATE
    AND id NOT IN (
      SELECT DISTINCT trip_id FROM parcel_requests
      WHERE status IN ('picked_up', 'delivered')
    );
  GET DIAGNOSTICS v_expired_trips = ROW_COUNT;
  
  v_expired_requests := 0;
  
  RETURN QUERY SELECT v_expired_requests, v_expired_trips, v_cleaned_attempts;
END;
$$;


ALTER FUNCTION "public"."expire_old_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_pending_requests_on_trip_start"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE parcel_requests
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND trip_id IN (
      SELECT id FROM trips 
      WHERE status = 'in_progress'
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."expire_pending_requests_on_trip_start"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_cancellation_otp"("p_request_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_otp TEXT;
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM parcel_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_current_status NOT IN ('picked_up') THEN
    RAISE EXCEPTION 'Cancellation OTP only available after pickup';
  END IF;
  
  v_new_otp := generate_otp();
  
  UPDATE parcel_requests
  SET cancellation_otp = v_new_otp,
      cancellation_otp_expiry = NOW() + INTERVAL '24 hours',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN v_new_otp;
END;
$$;


ALTER FUNCTION "public"."generate_cancellation_otp"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_otp"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;


ALTER FUNCTION "public"."generate_otp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_pickup_otp"("request_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_otp VARCHAR(6);
BEGIN
  new_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  UPDATE parcel_requests
  SET 
    pickup_otp = new_otp,
    pickup_otp_expiry = NOW() + INTERVAL '24 hours',
    accepted_at = NOW()
  WHERE id = request_id;
  
  RETURN new_otp;
END;
$$;


ALTER FUNCTION "public"."generate_pickup_otp"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only insert if metadata is available
  -- Check if profile already exists to prevent duplicates
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    
    INSERT INTO public.profiles (id, email, username, full_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_locked"("user_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count only attempts within the last 15 minutes
  SELECT COUNT(*) INTO attempt_count
  FROM failed_login_attempts
  WHERE email = user_email
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  RETURN attempt_count >= 5;
END;
$$;


ALTER FUNCTION "public"."is_account_locked"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_trip_available"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_trip RECORD;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_trip.status = 'upcoming' AND v_trip.departure_date >= CURRENT_DATE;
END;
$$;


ALTER FUNCTION "public"."is_trip_available"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_trips_before_24h"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."lock_trips_before_24h"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_trip_slots"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."manage_trip_slots"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manage_trip_slots"() IS 'Unified slot management: decrements on acceptance, increments on cancellation/rejection from accepted state';



CREATE OR REPLACE FUNCTION "public"."prevent_cancellation_with_pickups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."prevent_cancellation_with_pickups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_delivery_otp_on_arrival_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.arrival_date != OLD.arrival_date OR NEW.arrival_time != OLD.arrival_time) THEN
    UPDATE parcel_requests
    SET delivery_otp_expiry = (NEW.arrival_date + NEW.arrival_time)::TIMESTAMPTZ + INTERVAL '72 hours',
        updated_at = NOW()
    WHERE trip_id = NEW.id
      AND status = 'picked_up'
      AND delivery_otp IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recalculate_delivery_otp_on_arrival_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO failed_login_attempts (email, ip_address)
  VALUES (user_email, user_ip);
END;
$$;


ALTER FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_delivery_otp"("p_request_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_otp TEXT;
  v_current_status TEXT;
  v_arrival_datetime TIMESTAMPTZ;
BEGIN
  SELECT pr.status, (t.arrival_date + t.arrival_time)::TIMESTAMPTZ
  INTO v_current_status, v_arrival_datetime
  FROM parcel_requests pr
  JOIN trips t ON pr.trip_id = t.id
  WHERE pr.id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_current_status NOT IN ('failed', 'picked_up') THEN
    RAISE EXCEPTION 'Can only regenerate delivery OTP for picked up or failed requests';
  END IF;
  
  v_new_otp := generate_otp();
  
  UPDATE parcel_requests
  SET delivery_otp = v_new_otp,
      delivery_otp_expiry = v_arrival_datetime + INTERVAL '72 hours',
      status = 'picked_up',
      failed_delivery_attempts = 0,
      delivery_blocked_until = NULL,
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN v_new_otp;
END;
$$;


ALTER FUNCTION "public"."regenerate_delivery_otp"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_pickup_otp"("p_request_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_otp TEXT;
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM parcel_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_current_status NOT IN ('failed', 'accepted') THEN
    RAISE EXCEPTION 'Can only regenerate pickup OTP for accepted or failed requests';
  END IF;
  
  v_new_otp := generate_otp();
  
  UPDATE parcel_requests
  SET pickup_otp = v_new_otp,
      pickup_otp_expiry = NOW() + INTERVAL '24 hours',
      status = 'accepted',
      failed_pickup_attempts = 0,
      pickup_blocked_until = NULL,
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN v_new_otp;
END;
$$;


ALTER FUNCTION "public"."regenerate_pickup_otp"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM parcel_requests WHERE id = p_request_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Can only reject pending or accepted requests';
  END IF;
  
  UPDATE parcel_requests
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      rejected_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'id', p_request_id,
    'status', 'rejected',
    'rejection_reason', p_rejection_reason
  );
END;
$$;


ALTER FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_request_rejected_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    NEW.rejected_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_request_rejected_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_trips_to_in_progress"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE trips
  SET status = 'in_progress',
      updated_at = NOW()
  WHERE status IN ('upcoming', 'locked')
    AND (departure_date + departure_time) <= NOW()
  RETURNING * INTO v_count;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."transition_trips_to_in_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_request_details"("p_request_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
BEGIN
  IF NOT can_edit_request_details(p_request_id) THEN
    RAISE EXCEPTION 'Cannot edit request details after acceptance';
  END IF;
  
  SELECT pr.*, t.allowed_categories
  INTO v_request
  FROM parcel_requests pr
  JOIN trips t ON pr.trip_id = t.id
  WHERE pr.id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF NOT (p_category = ANY(v_request.allowed_categories)) THEN
    RAISE EXCEPTION 'Item category not allowed for this trip';
  END IF;
  
  IF array_length(p_parcel_photos, 1) < 2 THEN
    RAISE EXCEPTION 'At least 2 parcel photos are required';
  END IF;
  
  IF LENGTH(p_item_description) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters';
  END IF;
  
  UPDATE parcel_requests
  SET item_description = p_item_description,
      category = p_category,
      parcel_photos = p_parcel_photos,
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'id', p_request_id,
    'item_description', p_item_description,
    'category', p_category,
    'parcel_photos', p_parcel_photos,
    'message', 'Request details updated successfully'
  );
END;
$$;


ALTER FUNCTION "public"."update_request_details"("p_request_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trip_status_from_requests"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."update_trip_status_from_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."validate_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_trip_dates"("p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_trip_dates"("p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_cancellation_otp_and_cancel_trip"("p_trip_id" "uuid", "p_otp" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM parcel_requests
  WHERE trip_id = p_trip_id AND status = 'picked_up'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No picked up request found for this trip';
  END IF;
  
  IF v_request.cancellation_otp IS NULL THEN
    RAISE EXCEPTION 'No cancellation OTP generated';
  END IF;
  
  IF v_request.cancellation_otp_expiry < NOW() THEN
    RAISE EXCEPTION 'Cancellation OTP has expired';
  END IF;
  
  IF v_request.cancellation_otp != p_otp THEN
    RAISE EXCEPTION 'Invalid cancellation OTP';
  END IF;
  
  UPDATE trips SET status = 'cancelled', updated_at = NOW() WHERE id = p_trip_id;
  
  UPDATE parcel_requests
  SET status = 'cancelled',
      cancelled_by = 'traveller',
      cancellation_otp = NULL,
      cancellation_otp_expiry = NULL,
      updated_at = NOW()
  WHERE id = v_request.id;
  
  RETURN json_build_object(
    'trip_id', p_trip_id,
    'request_id', v_request.id,
    'status', 'cancelled',
    'message', 'Trip and request cancelled successfully'
  );
END;
$$;


ALTER FUNCTION "public"."verify_cancellation_otp_and_cancel_trip"("p_trip_id" "uuid", "p_otp" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_delivery_otp"("p_request_id" "uuid", "p_otp" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
  v_trip_id UUID;
BEGIN
  SELECT * INTO v_request FROM parcel_requests WHERE id = p_request_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status NOT IN ('picked_up', 'failed') THEN
    RAISE EXCEPTION 'Request is not in picked_up or failed status';
  END IF;
  
  IF v_request.delivery_blocked_until IS NOT NULL AND v_request.delivery_blocked_until > NOW() THEN
    RAISE EXCEPTION 'Delivery verification is temporarily blocked. Try again later.';
  END IF;
  
  IF v_request.delivery_otp_expiry < NOW() THEN
    UPDATE parcel_requests SET status = 'failed', updated_at = NOW() WHERE id = p_request_id;
    RAISE EXCEPTION 'Delivery OTP has expired. Please regenerate.';
  END IF;
  
  IF v_request.delivery_otp != p_otp THEN
    UPDATE parcel_requests
    SET failed_delivery_attempts = COALESCE(failed_delivery_attempts, 0) + 1,
        delivery_blocked_until = CASE 
          WHEN COALESCE(failed_delivery_attempts, 0) + 1 >= 3 
          THEN NOW() + INTERVAL '15 minutes' 
          ELSE NULL 
        END,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RAISE EXCEPTION 'Invalid delivery OTP';
  END IF;
  
  UPDATE parcel_requests
  SET status = 'delivered',
      delivered_at = NOW(),
      delivery_otp = NULL,
      delivery_otp_expiry = NULL,
      failed_delivery_attempts = 0,
      delivery_blocked_until = NULL,
      updated_at = NOW()
  WHERE id = p_request_id
  RETURNING trip_id INTO v_trip_id;
  
  UPDATE trips SET status = 'completed', updated_at = NOW() WHERE id = v_trip_id;
  
  RETURN json_build_object(
    'request_id', p_request_id,
    'status', 'delivered',
    'delivered_at', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."verify_delivery_otp"("p_request_id" "uuid", "p_otp" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_pickup_otp"("p_request_id" "uuid", "p_otp" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
  v_delivery_otp TEXT;
BEGIN
  SELECT * INTO v_request FROM parcel_requests WHERE id = p_request_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status NOT IN ('accepted', 'failed') THEN
    RAISE EXCEPTION 'Request is not in accepted or failed status';
  END IF;
  
  IF v_request.pickup_blocked_until IS NOT NULL AND v_request.pickup_blocked_until > NOW() THEN
    RAISE EXCEPTION 'Pickup verification is temporarily blocked. Try again later.';
  END IF;
  
  IF v_request.pickup_otp_expiry < NOW() THEN
    UPDATE parcel_requests SET status = 'failed', updated_at = NOW() WHERE id = p_request_id;
    RAISE EXCEPTION 'Pickup OTP has expired. Please regenerate.';
  END IF;
  
  IF v_request.pickup_otp != p_otp THEN
    UPDATE parcel_requests
    SET failed_pickup_attempts = COALESCE(failed_pickup_attempts, 0) + 1,
        pickup_blocked_until = CASE 
          WHEN COALESCE(failed_pickup_attempts, 0) + 1 >= 3 
          THEN NOW() + INTERVAL '15 minutes' 
          ELSE NULL 
        END,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RAISE EXCEPTION 'Invalid pickup OTP';
  END IF;
  
  v_delivery_otp := generate_otp();
  
  UPDATE parcel_requests
  SET status = 'picked_up',
      picked_up_at = NOW(),
      pickup_otp = NULL,
      pickup_otp_expiry = NULL,
      failed_pickup_attempts = 0,
      pickup_blocked_until = NULL,
      delivery_otp = v_delivery_otp,
      delivery_otp_expiry = (SELECT (arrival_date + arrival_time)::TIMESTAMPTZ FROM trips WHERE id = v_request.trip_id) + INTERVAL '72 hours',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'request_id', p_request_id,
    'status', 'picked_up',
    'delivery_otp', v_delivery_otp,
    'delivery_otp_expiry', (SELECT (arrival_date + arrival_time)::TIMESTAMPTZ FROM trips WHERE id = v_request.trip_id) + INTERVAL '72 hours'
  );
END;
$$;


ALTER FUNCTION "public"."verify_pickup_otp"("p_request_id" "uuid", "p_otp" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."failed_login_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "ip_address" "text",
    "attempted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."failed_login_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parcel_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "item_description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "delivery_contact_name" "text" NOT NULL,
    "delivery_contact_phone" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parcel_photos" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pickup_otp" character varying(6),
    "pickup_otp_expiry" timestamp with time zone,
    "delivery_otp" character varying(6),
    "delivery_otp_expiry" timestamp with time zone,
    "picked_up_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "cancelled_by" character varying(10),
    "failed_pickup_attempts" integer DEFAULT 0,
    "failed_delivery_attempts" integer DEFAULT 0,
    "pickup_blocked_until" timestamp with time zone,
    "delivery_blocked_until" timestamp with time zone,
    "cancellation_otp" character varying(6),
    "cancellation_otp_expiry" timestamp with time zone,
    CONSTRAINT "parcel_photos_exactly_2" CHECK (("array_length"("parcel_photos", 1) = 2)),
    CONSTRAINT "parcel_requests_cancelled_by_check" CHECK ((("cancelled_by")::"text" = ANY ((ARRAY['sender'::character varying, 'traveller'::character varying])::"text"[]))),
    CONSTRAINT "parcel_requests_category_check" CHECK (("category" = ANY (ARRAY['documents'::"text", 'clothing'::"text", 'medicines'::"text", 'books'::"text", 'small_items'::"text"]))),
    CONSTRAINT "parcel_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'picked_up'::"text", 'delivered'::"text", 'cancelled'::"text", 'expired'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."parcel_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."parcel_requests" IS 'MVP: Addresses not stored - pickup/delivery coordinated via phone. Pickup contact = sender (from profiles table).';



COMMENT ON COLUMN "public"."parcel_requests"."status" IS 'pending: awaiting traveller response, accepted: traveller accepted, rejected: traveller rejected, picked_up: picked up from sender, delivered: delivered to recipient, cancelled: sender cancelled';



COMMENT ON COLUMN "public"."parcel_requests"."parcel_photos" IS 'Array of URLs to parcel photos uploaded to storage';



COMMENT ON COLUMN "public"."parcel_requests"."failed_pickup_attempts" IS 'Count of failed pickup OTP attempts';



COMMENT ON COLUMN "public"."parcel_requests"."failed_delivery_attempts" IS 'Count of failed delivery OTP attempts';



COMMENT ON COLUMN "public"."parcel_requests"."pickup_blocked_until" IS 'Timestamp until which pickup verification is blocked';



COMMENT ON COLUMN "public"."parcel_requests"."delivery_blocked_until" IS 'Timestamp until which delivery verification is blocked';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "username" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "rating" numeric(2,1) DEFAULT 0.0,
    "rating_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_rating_check" CHECK ((("rating" >= (0)::numeric) AND ("rating" <= (5)::numeric)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "traveller_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "transport_mode" "text" NOT NULL,
    "pnr_number" "text" NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "departure_time" time without time zone NOT NULL,
    "arrival_time" time without time zone NOT NULL,
    "ticket_file_url" "text" NOT NULL,
    "allowed_categories" "text"[] DEFAULT ARRAY['documents'::"text", 'clothing'::"text", 'medicines'::"text", 'books'::"text", 'small_items'::"text"] NOT NULL,
    "notes" "text",
    "departure_date" "date" NOT NULL,
    "arrival_date" "date" NOT NULL,
    "parcel_size_capacity" character varying(10) NOT NULL,
    CONSTRAINT "trips_mode_check" CHECK (("transport_mode" = ANY (ARRAY['flight'::"text", 'train'::"text", 'bus'::"text", 'car'::"text"]))),
    CONSTRAINT "trips_parcel_size_capacity_check" CHECK ((("parcel_size_capacity")::"text" = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying])::"text"[]))),
    CONSTRAINT "trips_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'locked'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


ALTER TABLE ONLY "public"."failed_login_attempts"
    ADD CONSTRAINT "failed_login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parcel_requests"
    ADD CONSTRAINT "parcel_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_failed_attempts_email" ON "public"."failed_login_attempts" USING "btree" ("email");



CREATE INDEX "idx_failed_attempts_time" ON "public"."failed_login_attempts" USING "btree" ("attempted_at");



CREATE INDEX "idx_parcel_requests_created_at" ON "public"."parcel_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_parcel_requests_sender_id" ON "public"."parcel_requests" USING "btree" ("sender_id");



CREATE INDEX "idx_parcel_requests_status" ON "public"."parcel_requests" USING "btree" ("status");



CREATE INDEX "idx_parcel_requests_trip_id" ON "public"."parcel_requests" USING "btree" ("trip_id");



CREATE INDEX "idx_requests_pending_accepted" ON "public"."parcel_requests" USING "btree" ("trip_id", "status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"]));



CREATE INDEX "idx_requests_status_sender" ON "public"."parcel_requests" USING "btree" ("sender_id", "status");



CREATE INDEX "idx_requests_status_trip" ON "public"."parcel_requests" USING "btree" ("trip_id", "status");



CREATE INDEX "idx_requests_trip_status" ON "public"."parcel_requests" USING "btree" ("trip_id", "status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'picked_up'::"text"]));



CREATE INDEX "idx_trips_departure_date" ON "public"."trips" USING "btree" ("departure_date");



CREATE INDEX "idx_trips_route" ON "public"."trips" USING "btree" ("source", "destination");



CREATE INDEX "idx_trips_status" ON "public"."trips" USING "btree" ("status");



CREATE INDEX "idx_trips_traveller" ON "public"."trips" USING "btree" ("traveller_id");



CREATE INDEX "idx_trips_traveller_status" ON "public"."trips" USING "btree" ("traveller_id", "status");



CREATE INDEX "idx_trips_upcoming_departure" ON "public"."trips" USING "btree" ("departure_date", "departure_time") WHERE ("status" = ANY (ARRAY['upcoming'::"text", 'locked'::"text"]));



CREATE OR REPLACE TRIGGER "auto_lock_trip_on_acceptance" AFTER UPDATE ON "public"."parcel_requests" FOR EACH ROW EXECUTE FUNCTION "public"."auto_lock_trip_on_acceptance"();



CREATE OR REPLACE TRIGGER "cascade_trip_cancellation_trigger" AFTER UPDATE ON "public"."trips" FOR EACH ROW WHEN ((("new"."status" = 'cancelled'::"text") AND ("old"."status" IS DISTINCT FROM 'cancelled'::"text"))) EXECUTE FUNCTION "public"."cascade_trip_cancellation"();



CREATE OR REPLACE TRIGGER "clear_otp_after_use_trigger" BEFORE UPDATE ON "public"."parcel_requests" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."clear_otp_after_use"();



CREATE OR REPLACE TRIGGER "enforce_request_status_transitions" BEFORE UPDATE ON "public"."parcel_requests" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."validate_status_transition"();



CREATE OR REPLACE TRIGGER "manage_trip_slots_trigger" AFTER UPDATE ON "public"."parcel_requests" FOR EACH ROW EXECUTE FUNCTION "public"."manage_trip_slots"();



CREATE OR REPLACE TRIGGER "prevent_cancellation_with_pickups_trigger" BEFORE UPDATE ON "public"."trips" FOR EACH ROW WHEN ((("new"."status" = 'cancelled'::"text") AND ("old"."status" <> 'cancelled'::"text"))) EXECUTE FUNCTION "public"."prevent_cancellation_with_pickups"();



CREATE OR REPLACE TRIGGER "recalculate_delivery_otp_on_arrival_change" AFTER UPDATE ON "public"."trips" FOR EACH ROW WHEN ((("old"."arrival_date" IS DISTINCT FROM "new"."arrival_date") OR ("old"."arrival_time" IS DISTINCT FROM "new"."arrival_time"))) EXECUTE FUNCTION "public"."recalculate_delivery_otp_on_arrival_change"();



CREATE OR REPLACE TRIGGER "set_rejected_at_trigger" BEFORE UPDATE ON "public"."parcel_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_request_rejected_at"();



CREATE OR REPLACE TRIGGER "trigger_auto_complete_trip" AFTER UPDATE OF "status" ON "public"."parcel_requests" FOR EACH ROW EXECUTE FUNCTION "public"."auto_complete_trip"();



CREATE OR REPLACE TRIGGER "update_parcel_requests_updated_at" BEFORE UPDATE ON "public"."parcel_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trip_status_trigger" AFTER UPDATE ON "public"."parcel_requests" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."update_trip_status_from_requests"();



CREATE OR REPLACE TRIGGER "update_trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."parcel_requests"
    ADD CONSTRAINT "parcel_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parcel_requests"
    ADD CONSTRAINT "parcel_requests_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_traveller_id_fkey" FOREIGN KEY ("traveller_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "No direct access to failed_login_attempts" ON "public"."failed_login_attempts" USING (false);



CREATE POLICY "Senders can create parcel requests" ON "public"."parcel_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Senders can delete their pending requests" ON "public"."parcel_requests" FOR DELETE USING ((("auth"."uid"() = "sender_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Senders can update their pending requests" ON "public"."parcel_requests" FOR UPDATE USING ((("auth"."uid"() = "sender_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Travellers can create trips" ON "public"."trips" FOR INSERT WITH CHECK (("auth"."uid"() = "traveller_id"));



CREATE POLICY "Travellers can delete own trips" ON "public"."trips" FOR DELETE USING (("auth"."uid"() = "traveller_id"));



CREATE POLICY "Travellers can update own trips" ON "public"."trips" FOR UPDATE USING (("auth"."uid"() = "traveller_id"));



CREATE POLICY "Travellers can update requests for their trips" ON "public"."parcel_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "parcel_requests"."trip_id") AND ("trips"."traveller_id" = "auth"."uid"())))));



CREATE POLICY "Travellers can view requests for their trips" ON "public"."parcel_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "parcel_requests"."trip_id") AND ("trips"."traveller_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view profiles of connected users" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM ("public"."parcel_requests" "pr"
     JOIN "public"."trips" "t" ON (("pr"."trip_id" = "t"."id")))
  WHERE (("t"."traveller_id" = "auth"."uid"()) AND ("pr"."sender_id" = "profiles"."id") AND ("pr"."status" = ANY (ARRAY['accepted'::"text", 'picked_up'::"text", 'delivered'::"text", 'cancelled'::"text", 'rejected'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."parcel_requests" "pr"
     JOIN "public"."trips" "t" ON (("pr"."trip_id" = "t"."id")))
  WHERE (("pr"."sender_id" = "auth"."uid"()) AND ("t"."traveller_id" = "profiles"."id") AND ("pr"."status" = ANY (ARRAY['accepted'::"text", 'picked_up'::"text", 'delivered'::"text", 'cancelled'::"text", 'rejected'::"text"])))))));



CREATE POLICY "Users can view related profiles" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM ("public"."parcel_requests" "pr"
     JOIN "public"."trips" "t" ON (("t"."id" = "pr"."trip_id")))
  WHERE (("t"."traveller_id" = "auth"."uid"()) AND ("pr"."sender_id" = "profiles"."id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."parcel_requests" "pr"
     JOIN "public"."trips" "t" ON (("t"."id" = "pr"."trip_id")))
  WHERE (("pr"."sender_id" = "auth"."uid"()) AND ("t"."traveller_id" = "profiles"."id"))))));



CREATE POLICY "Users can view their own parcel requests" ON "public"."parcel_requests" FOR SELECT USING (("auth"."uid"() = "sender_id"));



ALTER TABLE "public"."failed_login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parcel_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."accept_request_atomic"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_request_atomic"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_request_atomic"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_complete_trip"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_complete_trip"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_complete_trip"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_lock_trip_on_acceptance"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_lock_trip_on_acceptance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_lock_trip_on_acceptance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_request_details"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_request_details"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_request_details"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_trip"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_trip"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_trip"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_trip_dates"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_trip_dates"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_trip_dates"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_request_with_validation"("p_request_id" "uuid", "p_cancelled_by" "text", "p_cancellation_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_request_with_validation"("p_request_id" "uuid", "p_cancelled_by" "text", "p_cancellation_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_request_with_validation"("p_request_id" "uuid", "p_cancelled_by" "text", "p_cancellation_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cascade_trip_cancellation"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_trip_cancellation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_trip_cancellation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_available"("check_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_available"("check_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_available"("check_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_parcel_request_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_parcel_request_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_parcel_request_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_phone_available"("check_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_phone_available"("check_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_phone_available"("check_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_available"("check_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_available"("check_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_available"("check_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_failed_attempts"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_failed_attempts"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_failed_attempts"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_otp_after_use"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_otp_after_use"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_otp_after_use"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_request_with_validation"("p_trip_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[], "p_delivery_contact_name" "text", "p_delivery_contact_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_request_with_validation"("p_trip_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[], "p_delivery_contact_name" "text", "p_delivery_contact_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_request_with_validation"("p_trip_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[], "p_delivery_contact_name" "text", "p_delivery_contact_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_total_slots" integer, "p_allowed_categories" "text"[], "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_total_slots" integer, "p_allowed_categories" "text"[], "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_total_slots" integer, "p_allowed_categories" "text"[], "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_parcel_size_capacity" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_allowed_categories" "text"[], "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_parcel_size_capacity" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_allowed_categories" "text"[], "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_with_validation"("p_source" "text", "p_destination" "text", "p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone, "p_transport_mode" "text", "p_parcel_size_capacity" "text", "p_pnr_number" "text", "p_ticket_file_url" "text", "p_allowed_categories" "text"[], "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_pending_requests_on_trip_start"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_pending_requests_on_trip_start"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_pending_requests_on_trip_start"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_cancellation_otp"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_cancellation_otp"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_cancellation_otp"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_otp"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_otp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_otp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_pickup_otp"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_pickup_otp"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_pickup_otp"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_trip_available"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_trip_available"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_trip_available"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_trips_before_24h"() TO "anon";
GRANT ALL ON FUNCTION "public"."lock_trips_before_24h"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_trips_before_24h"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_trip_slots"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_trip_slots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_trip_slots"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_cancellation_with_pickups"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_cancellation_with_pickups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_cancellation_with_pickups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_delivery_otp_on_arrival_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_delivery_otp_on_arrival_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_delivery_otp_on_arrival_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_delivery_otp"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_delivery_otp"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_delivery_otp"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_pickup_otp"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_pickup_otp"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_pickup_otp"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_request_rejected_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_request_rejected_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_request_rejected_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transition_trips_to_in_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."transition_trips_to_in_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."transition_trips_to_in_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_request_details"("p_request_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_request_details"("p_request_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_request_details"("p_request_id" "uuid", "p_item_description" "text", "p_category" "text", "p_parcel_photos" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trip_status_from_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trip_status_from_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trip_status_from_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_status_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_status_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_status_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_trip_dates"("p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_trip_dates"("p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_trip_dates"("p_departure_date" "date", "p_departure_time" time without time zone, "p_arrival_date" "date", "p_arrival_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_cancellation_otp_and_cancel_trip"("p_trip_id" "uuid", "p_otp" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_cancellation_otp_and_cancel_trip"("p_trip_id" "uuid", "p_otp" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_cancellation_otp_and_cancel_trip"("p_trip_id" "uuid", "p_otp" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_delivery_otp"("p_request_id" "uuid", "p_otp" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_delivery_otp"("p_request_id" "uuid", "p_otp" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_delivery_otp"("p_request_id" "uuid", "p_otp" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_pickup_otp"("p_request_id" "uuid", "p_otp" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_pickup_otp"("p_request_id" "uuid", "p_otp" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_pickup_otp"("p_request_id" "uuid", "p_otp" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."failed_login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."failed_login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."parcel_requests" TO "anon";
GRANT ALL ON TABLE "public"."parcel_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."parcel_requests" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."parcel_requests" drop constraint "parcel_requests_cancelled_by_check";

alter table "public"."trips" drop constraint "trips_parcel_size_capacity_check";

alter table "public"."parcel_requests" add constraint "parcel_requests_cancelled_by_check" CHECK (((cancelled_by)::text = ANY ((ARRAY['sender'::character varying, 'traveller'::character varying])::text[]))) not valid;

alter table "public"."parcel_requests" validate constraint "parcel_requests_cancelled_by_check";

alter table "public"."trips" add constraint "trips_parcel_size_capacity_check" CHECK (((parcel_size_capacity)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying])::text[]))) not valid;

alter table "public"."trips" validate constraint "trips_parcel_size_capacity_check";

CREATE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can view parcel photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'parcel-photos'::text));



  create policy "Authenticated users can upload parcel photos"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'parcel-photos'::text));



  create policy "Ticket files are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'trip-tickets'::text));



  create policy "Users can delete their own parcel photos"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'parcel-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



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



