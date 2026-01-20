


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


CREATE OR REPLACE FUNCTION "public"."check_trip_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_packages INTEGER;
  delivered_packages INTEGER;
BEGIN
  SELECT 
    COUNT(*) INTO total_packages
  FROM packages 
  WHERE trip_id = NEW.trip_id AND status != 'cancelled';
  
  SELECT 
    COUNT(*) INTO delivered_packages
  FROM packages 
  WHERE trip_id = NEW.trip_id AND status = 'delivered';
  
  IF total_packages > 0 AND total_packages = delivered_packages THEN
    UPDATE trips 
    SET status = 'completed' 
    WHERE id = NEW.trip_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_trip_completion"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."generate_otp"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;


ALTER FUNCTION "public"."generate_otp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_package_otps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    NEW.pickup_otp := (SELECT generate_otp());
    NEW.delivery_otp := (SELECT generate_otp());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_package_otps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, phone, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_package_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE trips 
    SET available_slots = available_slots - 1
    WHERE id = NEW.trip_id AND available_slots > 0;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_package_accepted"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO failed_login_attempts (email, ip_address)
  VALUES (user_email, user_ip);
END;
$$;


ALTER FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."failed_login_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "ip_address" "text",
    "attempted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."failed_login_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."packages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_name" "text" NOT NULL,
    "receiver_phone" "text" NOT NULL,
    "category" "text" NOT NULL,
    "weight" "text" NOT NULL,
    "cost" numeric(10,2) NOT NULL,
    "photos" "text"[] DEFAULT ARRAY[]::"text"[],
    "pickup_photo" "text",
    "delivery_photo" "text",
    "pickup_otp" "text",
    "delivery_otp" "text",
    "status" "text" DEFAULT 'requested'::"text",
    "accepted_at" timestamp with time zone,
    "picked_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "packages_cost_check" CHECK (("cost" >= (0)::numeric)),
    CONSTRAINT "packages_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'accepted'::"text", 'rejected'::"text", 'picked'::"text", 'delivered'::"text", 'disputed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "positive_cost" CHECK (("cost" >= (0)::numeric)),
    CONSTRAINT "valid_package_status" CHECK (("status" = ANY (ARRAY['requested'::"text", 'accepted'::"text", 'picked'::"text", 'delivered'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "package_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "gateway_ref" "text",
    "gateway_name" "text",
    "settled_to_traveller" boolean DEFAULT false,
    "settled_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'captured'::"text", 'settled'::"text", 'refunded'::"text", 'failed'::"text"]))),
    CONSTRAINT "positive_amount" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "valid_payment_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "username" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "roles" "text"[] DEFAULT ARRAY['sender'::"text"],
    "kyc_status" "text" DEFAULT 'pending'::"text",
    "kyc_docs" "jsonb" DEFAULT '[]'::"jsonb",
    "rating" numeric(2,1) DEFAULT 0.0,
    "rating_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_kyc_status_check" CHECK (("kyc_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"]))),
    CONSTRAINT "profiles_rating_check" CHECK ((("rating" >= (0)::numeric) AND ("rating" <= (5)::numeric))),
    CONSTRAINT "valid_kyc_status" CHECK (("kyc_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_profiles" AS
 SELECT "id",
    "full_name",
    "username",
    "rating",
    "rating_count",
    "kyc_status",
    "created_at"
   FROM "public"."profiles";


ALTER VIEW "public"."public_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "traveller_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "transport_number" "text",
    "departure_date" timestamp with time zone NOT NULL,
    "arrival_date" timestamp with time zone NOT NULL,
    "capacity" integer DEFAULT 5,
    "available_slots" integer DEFAULT 5,
    "stay_duration" "text",
    "meetup_location" "text" NOT NULL,
    "drop_location" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "arrival_after_departure" CHECK (("arrival_date" > "departure_date")),
    CONSTRAINT "trips_available_slots_check" CHECK (("available_slots" >= 0)),
    CONSTRAINT "trips_capacity_check" CHECK ((("capacity" > 0) AND ("capacity" <= 5))),
    CONSTRAINT "trips_mode_check" CHECK (("mode" = ANY (ARRAY['flight'::"text", 'train'::"text", 'bus'::"text", 'car'::"text"]))),
    CONSTRAINT "trips_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "valid_capacity" CHECK (((("capacity" >= 1) AND ("capacity" <= 5)) AND ("available_slots" >= 0) AND ("available_slots" <= "capacity"))),
    CONSTRAINT "valid_dates" CHECK (("arrival_date" > "departure_date")),
    CONSTRAINT "valid_slots" CHECK (("available_slots" <= "capacity")),
    CONSTRAINT "valid_trip_status" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


ALTER TABLE ONLY "public"."failed_login_attempts"
    ADD CONSTRAINT "failed_login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_packages_receiver_phone" ON "public"."packages" USING "btree" ("receiver_phone");



CREATE INDEX "idx_packages_sender" ON "public"."packages" USING "btree" ("sender_id");



CREATE INDEX "idx_packages_sender_status" ON "public"."packages" USING "btree" ("sender_id", "status", "created_at" DESC);



CREATE INDEX "idx_packages_status" ON "public"."packages" USING "btree" ("status");



CREATE INDEX "idx_packages_trip" ON "public"."packages" USING "btree" ("trip_id");



CREATE INDEX "idx_packages_trip_status" ON "public"."packages" USING "btree" ("trip_id", "status", "updated_at" DESC);



CREATE INDEX "idx_payments_package" ON "public"."payments" USING "btree" ("package_id");



CREATE INDEX "idx_payments_sender" ON "public"."payments" USING "btree" ("sender_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_kyc_status" ON "public"."profiles" USING "btree" ("kyc_status");



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_trips_available" ON "public"."trips" USING "btree" ("status", "available_slots") WHERE ("status" = 'open'::"text");



CREATE INDEX "idx_trips_departure" ON "public"."trips" USING "btree" ("departure_date");



CREATE INDEX "idx_trips_route" ON "public"."trips" USING "btree" ("source", "destination");



CREATE INDEX "idx_trips_search_composite" ON "public"."trips" USING "btree" ("source", "destination", "departure_date", "status", "available_slots") WHERE (("status" = 'open'::"text") AND ("available_slots" > 0));



CREATE INDEX "idx_trips_status" ON "public"."trips" USING "btree" ("status");



CREATE INDEX "idx_trips_traveller" ON "public"."trips" USING "btree" ("traveller_id");



CREATE OR REPLACE TRIGGER "on_package_accepted" AFTER UPDATE ON "public"."packages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_package_accepted"();



CREATE OR REPLACE TRIGGER "on_package_accepted_generate_otps" BEFORE UPDATE ON "public"."packages" FOR EACH ROW EXECUTE FUNCTION "public"."generate_package_otps"();



CREATE OR REPLACE TRIGGER "on_package_delivered_check_trip" AFTER UPDATE ON "public"."packages" FOR EACH ROW WHEN (("new"."status" = 'delivered'::"text")) EXECUTE FUNCTION "public"."check_trip_completion"();



CREATE OR REPLACE TRIGGER "update_packages_updated_at" BEFORE UPDATE ON "public"."packages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_traveller_id_fkey" FOREIGN KEY ("traveller_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Open trips are viewable by everyone" ON "public"."trips" FOR SELECT USING ((("status" = 'open'::"text") OR ("traveller_id" = "auth"."uid"())));



CREATE POLICY "Packages viewable by sender and traveller" ON "public"."packages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() IN ( SELECT "trips"."traveller_id"
   FROM "public"."trips"
  WHERE ("trips"."id" = "packages"."trip_id")))));



CREATE POLICY "Sender and traveller can update packages" ON "public"."packages" FOR UPDATE USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() IN ( SELECT "trips"."traveller_id"
   FROM "public"."trips"
  WHERE ("trips"."id" = "packages"."trip_id")))));



CREATE POLICY "Senders can create packages" ON "public"."packages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Senders can delete requested packages" ON "public"."packages" FOR DELETE USING ((("auth"."uid"() = "sender_id") AND ("status" = ANY (ARRAY['requested'::"text", 'accepted'::"text"]))));



CREATE POLICY "Travellers can create trips" ON "public"."trips" FOR INSERT WITH CHECK (("auth"."uid"() = "traveller_id"));



CREATE POLICY "Travellers can delete own trips" ON "public"."trips" FOR DELETE USING (("auth"."uid"() = "traveller_id"));



CREATE POLICY "Travellers can update own trips" ON "public"."trips" FOR UPDATE USING (("auth"."uid"() = "traveller_id"));



CREATE POLICY "Travellers can view related payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() IN ( SELECT "t"."traveller_id"
   FROM ("public"."trips" "t"
     JOIN "public"."packages" "p" ON (("p"."trip_id" = "t"."id")))
  WHERE ("p"."id" = "payments"."package_id"))));



CREATE POLICY "Users can create own payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view profiles of related users" ON "public"."profiles" FOR SELECT USING (("id" IN ( SELECT "t"."traveller_id"
   FROM ("public"."trips" "t"
     JOIN "public"."packages" "p" ON (("p"."trip_id" = "t"."id")))
  WHERE ("p"."sender_id" = "auth"."uid"())
UNION
 SELECT "p"."sender_id"
   FROM ("public"."packages" "p"
     JOIN "public"."trips" "t" ON (("t"."id" = "p"."trip_id")))
  WHERE ("t"."traveller_id" = "auth"."uid"()))));



ALTER TABLE "public"."packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_email_available"("check_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_available"("check_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_available"("check_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_phone_available"("check_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_phone_available"("check_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_phone_available"("check_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_trip_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_trip_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_trip_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_available"("check_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_available"("check_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_available"("check_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_failed_attempts"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_failed_attempts"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_failed_attempts"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_otp"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_otp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_otp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_package_otps"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_package_otps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_package_otps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_package_accepted"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_package_accepted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_package_accepted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_failed_login"("user_email" "text", "user_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."failed_login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."failed_login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."packages" TO "anon";
GRANT ALL ON TABLE "public"."packages" TO "authenticated";
GRANT ALL ON TABLE "public"."packages" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_profiles" TO "anon";
GRANT ALL ON TABLE "public"."public_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profiles" TO "service_role";



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































