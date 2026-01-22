drop extension if exists "pg_net";

alter table "public"."profiles" drop constraint "profiles_kyc_status_check";

alter table "public"."profiles" drop constraint "valid_kyc_status";

alter table "public"."trips" drop constraint "arrival_after_departure";

alter table "public"."trips" drop constraint "valid_dates";

alter table "public"."trips" drop constraint "trips_capacity_check";

alter table "public"."trips" drop constraint "trips_mode_check";

alter table "public"."trips" drop constraint "valid_capacity";

alter table "public"."trips" drop constraint "valid_slots";

drop view if exists "public"."public_profiles";

drop index if exists "public"."idx_profiles_kyc_status";

drop index if exists "public"."idx_trips_departure";

drop index if exists "public"."idx_trips_search_composite";

alter table "public"."profiles" drop column "kyc_docs";

alter table "public"."profiles" drop column "kyc_status";

alter table "public"."profiles" drop column "roles";

alter table "public"."trips" drop column "capacity";

alter table "public"."trips" drop column "drop_location";

alter table "public"."trips" drop column "meetup_location";

alter table "public"."trips" drop column "mode";

alter table "public"."trips" drop column "stay_duration";

alter table "public"."trips" drop column "transport_number";

alter table "public"."trips" add column "allowed_categories" text[] default ARRAY['documents'::text, 'clothing'::text, 'medicines'::text, 'books'::text, 'small_items'::text];

alter table "public"."trips" add column "arrival_time" time without time zone not null;

alter table "public"."trips" add column "departure_time" time without time zone not null;

alter table "public"."trips" add column "notes" text;

alter table "public"."trips" add column "pnr_number" text not null;

alter table "public"."trips" add column "ticket_file_url" text;

alter table "public"."trips" add column "total_slots" integer default 5;

alter table "public"."trips" add column "transport_mode" text not null;

alter table "public"."trips" alter column "arrival_date" set data type date using "arrival_date"::date;

alter table "public"."trips" alter column "departure_date" set data type date using "departure_date"::date;

alter table "public"."trips" add constraint "trips_total_slots_check" CHECK (((total_slots >= 1) AND (total_slots <= 5))) not valid;

alter table "public"."trips" validate constraint "trips_total_slots_check";

alter table "public"."trips" add constraint "trips_transport_mode_check" CHECK ((transport_mode = ANY (ARRAY['train'::text, 'bus'::text, 'flight'::text, 'car'::text]))) not valid;

alter table "public"."trips" validate constraint "trips_transport_mode_check";

alter table "public"."trips" add constraint "trips_capacity_check" CHECK (((total_slots > 0) AND (total_slots <= 5))) not valid;

alter table "public"."trips" validate constraint "trips_capacity_check";

alter table "public"."trips" add constraint "trips_mode_check" CHECK ((transport_mode = ANY (ARRAY['flight'::text, 'train'::text, 'bus'::text, 'car'::text]))) not valid;

alter table "public"."trips" validate constraint "trips_mode_check";

alter table "public"."trips" add constraint "valid_capacity" CHECK ((((total_slots >= 1) AND (total_slots <= 5)) AND (available_slots >= 0) AND (available_slots <= total_slots))) not valid;

alter table "public"."trips" validate constraint "valid_capacity";

alter table "public"."trips" add constraint "valid_slots" CHECK ((available_slots <= total_slots)) not valid;

alter table "public"."trips" validate constraint "valid_slots";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO profiles (id, email, username, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


