# TravelConnect Backend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [RPC Functions](#rpc-functions)
4. [Database Triggers](#database-triggers)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Indexes & Performance](#indexes--performance)
7. [Foreign Keys & Constraints](#foreign-keys--constraints)
8. [Setup & Migrations](#setup--migrations)

---

## Overview

TravelConnect uses **Supabase** (Postgres) as its backend, leveraging:

- **Row Level Security (RLS)** for multi-tenant data isolation
- **Database triggers** for automated workflows (profile creation, slot updates, trip completion)
- **RPC functions** for complex business logic and OTP verification
- **Comprehensive indexes** for query performance
- **Foreign key constraints** with CASCADE rules for data integrity

All database logic is server-side, minimizing client-side complexity and security risks.

---

## Database Schema

### 1. `profiles` Table

Stores user information. Each profile corresponds to a user in `auth.users`.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  rating NUMERIC(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Points:**

- `id`: UUID matching `auth.users.id` (foreign key)
- No `roles` column in MVP. Sender vs traveller is handled **client-side** via `modeStore`.
- `rating` and `rating_count` reserved for post-MVP rating system.

**Indexes:**

```sql
CREATE UNIQUE INDEX profiles_username_key ON profiles(username);
CREATE UNIQUE INDEX profiles_phone_key   ON profiles(phone);
CREATE UNIQUE INDEX profiles_email_key   ON profiles(email);
CREATE INDEX idx_profiles_rating         ON profiles(rating DESC);
```

**RLS Policies:**

- `Users can view own profile`: `auth.uid() = id`
- `Users can update own profile`: `auth.uid() = id`
- `Users can insert own profile`: used by trigger on `auth.users`

---

### 2. `trips` Table

Stores traveller trip listings with capacity and route information.

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  source TEXT NOT NULL,
  destination TEXT NOT NULL,

  departure_date DATE NOT NULL,
  departure_time TIME,
  arrival_date DATE,
  arrival_time TIME,

  transport_mode TEXT NOT NULL CHECK (
    transport_mode IN ('train', 'bus', 'flight', 'car')
  ),

  pnr_number TEXT NOT NULL,
  ticket_file_url TEXT NOT NULL,

  total_slots INTEGER NOT NULL CHECK (total_slots BETWEEN 1 AND 5),
  available_slots INTEGER NOT NULL CHECK (available_slots >= 0),

  allowed_categories TEXT[] DEFAULT ARRAY[
    'documents',
    'clothing',
    'medicines',
    'books',
    'small_items'
  ],

  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'completed', 'cancelled')
  ),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Points:**

- `transport_mode`: `'train' | 'bus' | 'flight' | 'car'`
- `pnr_number` and `ticket_file_url`: ticket verification
- Capacity handled via `total_slots` and `available_slots` (max 5)
- No `meetup_location` or `drop_location` fields in MVP. Exact meetup/drop details are coordinated outside the DB.

**Indexes:**

```sql
CREATE INDEX idx_trips_traveller     ON trips(traveller_id);
CREATE INDEX idx_trips_status        ON trips(status);
CREATE INDEX idx_trips_departure     ON trips(departure_date);
CREATE INDEX idx_trips_route         ON trips(source, destination);
CREATE INDEX idx_trips_search_open   ON trips(source, destination, departure_date, status)
  WHERE status = 'open';
CREATE INDEX idx_trips_available     ON trips(status, available_slots)
  WHERE status = 'open' AND available_slots > 0;
```

**RLS Policies:**

```sql
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- View open trips or own trips
CREATE POLICY "View open or own trips"
ON trips FOR SELECT
USING (status = 'open' OR traveller_id = auth.uid());

-- Create own trips
CREATE POLICY "Create own trips"
ON trips FOR INSERT
WITH CHECK (auth.uid() = traveller_id);

-- Update own trips
CREATE POLICY "Update own trips"
ON trips FOR UPDATE
USING (auth.uid() = traveller_id);

-- Delete own trips
CREATE POLICY "Delete own trips"
ON trips FOR DELETE
USING (auth.uid() = traveller_id);
```

---

### 3. `parcel_requests` Table

Stores package delivery requests from senders to travellers with OTP-based verification.

```sql
CREATE TABLE parcel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  trip_id   UUID NOT NULL REFERENCES trips(id)     ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Parcel details
  item_description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('documents', 'clothing', 'medicines', 'books', 'small_items')
  ),
  size TEXT NOT NULL CHECK (
    size IN ('small', 'medium', 'large')
  ),
  parcel_photos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Receiver details (address is NOT stored in MVP)
  delivery_contact_name  TEXT NOT NULL,
  delivery_contact_phone TEXT NOT NULL,

  -- Notes
  sender_notes    TEXT,
  traveller_notes TEXT,
  rejection_reason TEXT,

  -- OTP verification
  pickup_otp TEXT,
  pickup_otp_expires_at   TIMESTAMPTZ,
  delivery_otp TEXT,
  delivery_otp_expires_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled')
  ),

  -- Timestamps
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  rejected_at  TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);
```

**Key Points:**

- One request = one parcel.
- `item_description`, `category`, `size` replaces any older `parcel_name` / `parcel_category` / `weight_category` naming.
- **No pickup/delivery addresses stored** in MVP. Exact locations are coordinated via phone.
- Status lifecycle: `pending → accepted/rejected → picked_up → delivered`, plus `cancelled`.

**Indexes:**

```sql
CREATE INDEX idx_parcel_requests_trip         ON parcel_requests(trip_id);
CREATE INDEX idx_parcel_requests_sender       ON parcel_requests(sender_id);
CREATE INDEX idx_parcel_requests_status       ON parcel_requests(status);
CREATE INDEX idx_parcel_requests_trip_status  ON parcel_requests(trip_id, status, updated_at DESC);
CREATE INDEX idx_parcel_requests_sender_status
  ON parcel_requests(sender_id, status, created_at DESC);
```

**RLS Policies:**

```sql
ALTER TABLE parcel_requests ENABLE ROW LEVEL SECURITY;

-- View if sender or trip's traveller
CREATE POLICY "View own requests or as traveller"
ON parcel_requests FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() IN (
    SELECT traveller_id FROM trips WHERE id = trip_id
  )
);

-- Create own requests
CREATE POLICY "Create own requests"
ON parcel_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Update if sender or traveller
CREATE POLICY "Update own requests or as traveller"
ON parcel_requests FOR UPDATE
USING (
  auth.uid() = sender_id
  OR auth.uid() IN (
    SELECT traveller_id FROM trips WHERE id = trip_id
  )
);

-- Delete own pending requests
CREATE POLICY "Delete own pending requests"
ON parcel_requests FOR DELETE
USING (auth.uid() = sender_id AND status = 'pending');
```

---

### 4. `failed_login_attempts` Table

Tracks failed login attempts for account lockout protection.

```sql
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

```sql
CREATE INDEX idx_failed_login_attempts_email      ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_attempt_at ON failed_login_attempts(attempt_at);
```

**RLS:**  
No direct RLS policies. Access is only via `SECURITY DEFINER` RPC functions.

---

### 5. Legacy Tables (Removed in Phase 10)

Earlier iterations used additional tables that are now **removed**:

- `packages` – superseded by `parcel_requests` with consolidated OTP and status fields.
- `payments` – out of scope for MVP; payment integration will be reintroduced post-MVP.

These are intentionally not part of the current schema.

---

## RPC Functions

All security-sensitive RPCs are defined with `SECURITY DEFINER` where they need to bypass RLS.

### Authentication & Security Functions

#### 1. `check_account_locked(email_input TEXT) RETURNS JSON`

Checks if an account is locked due to failed login attempts.

```sql
CREATE OR REPLACE FUNCTION check_account_locked(email_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'is_locked', (
      SELECT COUNT(*) >= 5
      FROM failed_login_attempts
      WHERE email = email_input
        AND attempt_at > NOW() - INTERVAL '15 minutes'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Logic:**

- Counts failed attempts in last 15 minutes.
- No manual cleanup required; old attempts are naturally ignored.

---

#### 2. `record_failed_login_attempt(email_input TEXT) RETURNS VOID`

```sql
CREATE OR REPLACE FUNCTION record_failed_login_attempt(email_input TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO failed_login_attempts (email) VALUES (email_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 3. `clear_failed_login_attempts(email_input TEXT) RETURNS VOID`

```sql
CREATE OR REPLACE FUNCTION clear_failed_login_attempts(email_input TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM failed_login_attempts WHERE email = email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Used after successful login, logout, or password reset.

---

### Availability Check Functions

#### 4. `check_username_availability(username_input TEXT) RETURNS JSON`

```sql
CREATE OR REPLACE FUNCTION check_username_availability(username_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'available', NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = username_input
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 5. `check_email_availability(email_input TEXT) RETURNS JSON`

```sql
CREATE OR REPLACE FUNCTION check_email_availability(email_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'available', NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = email_input
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 6. `check_phone_availability(phone_input TEXT) RETURNS JSON`

```sql
CREATE OR REPLACE FUNCTION check_phone_availability(phone_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'available', NOT EXISTS (
      SELECT 1 FROM profiles WHERE phone = phone_input
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### OTP & Delivery Functions

#### 7. `generate_otp() RETURNS TEXT`

Generates a 6-digit random OTP.

```sql
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

---

#### 8. `generate_pickup_otp(request_id UUID) RETURNS VARCHAR(6)`

Generates and stores a pickup OTP for a given request and returns the OTP.

```sql
CREATE OR REPLACE FUNCTION generate_pickup_otp(request_id UUID)
RETURNS VARCHAR(6) AS $$
DECLARE
  new_otp VARCHAR(6);
BEGIN
  new_otp := generate_otp();

  UPDATE parcel_requests
  SET
    pickup_otp = new_otp,
    pickup_otp_expires_at = NOW() + INTERVAL '24 hours',
    accepted_at = COALESCE(accepted_at, NOW()),
    status = 'accepted'
  WHERE id = request_id;

  RETURN new_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:**

- Called when a traveller accepts a request.
- Ensures status is `accepted`, sets `accepted_at`, and stores OTP + expiry.

---

#### 9. `verify_pickup_otp(request_id UUID, otp VARCHAR(6)) RETURNS BOOLEAN`

Verifies pickup OTP and transitions the request to `picked_up`, generating a delivery OTP.

```sql
CREATE OR REPLACE FUNCTION verify_pickup_otp(
  request_id UUID,
  otp VARCHAR(6)
) RETURNS BOOLEAN AS $$
DECLARE
  request_record parcel_requests%ROWTYPE;
  new_delivery_otp VARCHAR(6);
BEGIN
  SELECT * INTO request_record
  FROM parcel_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check OTP and expiry
  IF request_record.pickup_otp IS NULL
     OR request_record.pickup_otp <> otp
     OR request_record.pickup_otp_expires_at IS NULL
     OR request_record.pickup_otp_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Generate delivery OTP (72-hour expiry)
  new_delivery_otp := generate_otp();

  UPDATE parcel_requests
  SET
    status = 'picked_up',
    picked_up_at = NOW(),
    pickup_otp = NULL,
    pickup_otp_expires_at = NULL,
    delivery_otp = new_delivery_otp,
    delivery_otp_expires_at = NOW() + INTERVAL '72 hours'
  WHERE id = request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 10. `verify_delivery_otp(request_id UUID, otp VARCHAR(6)) RETURNS BOOLEAN`

Verifies delivery OTP and transitions the request to `delivered`.

```sql
CREATE OR REPLACE FUNCTION verify_delivery_otp(
  request_id UUID,
  otp VARCHAR(6)
) RETURNS BOOLEAN AS $$
DECLARE
  request_record parcel_requests%ROWTYPE;
BEGIN
  SELECT * INTO request_record
  FROM parcel_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF request_record.delivery_otp IS NULL
     OR request_record.delivery_otp <> otp
     OR request_record.delivery_otp_expires_at IS NULL
     OR request_record.delivery_otp_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  UPDATE parcel_requests
  SET
    status = 'delivered',
    delivered_at = NOW(),
    delivery_otp = NULL,
    delivery_otp_expires_at = NULL
  WHERE id = request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 11. Trip Completion Helper

#### `check_parcel_request_completion(trip_id_input UUID) RETURNS VOID`

Marks a trip as `completed` if all non-rejected requests are delivered.

```sql
CREATE OR REPLACE FUNCTION check_parcel_request_completion(
  trip_id_input UUID
) RETURNS VOID AS $$
DECLARE
  total_requests INTEGER;
  delivered_requests INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status != 'rejected') AS total,
    COUNT(*) FILTER (WHERE status = 'delivered') AS delivered
  INTO total_requests, delivered_requests
  FROM parcel_requests
  WHERE trip_id = trip_id_input;

  IF total_requests > 0 AND total_requests = delivered_requests THEN
    UPDATE trips
    SET status = 'completed'
    WHERE id = trip_id_input;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 12. Rejection Timestamp Helper

#### `set_request_rejected_at() RETURNS TRIGGER`

Automatically sets `rejected_at` when status becomes `rejected`.

```sql
CREATE OR REPLACE FUNCTION set_request_rejected_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.rejected_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Database Triggers

### 1. Profile Auto-Creation

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, username, phone, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Critical:** This trigger is essential for auth flow to work. Without it, signup succeeds but profile isn't created.

---

### 2. Trip Slot Updates

Slot management is handled when a request’s status changes.

```sql
CREATE OR REPLACE FUNCTION update_trip_slots_on_request_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE trips
    SET available_slots = GREATEST(available_slots - 1, 0)
    WHERE id = NEW.trip_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status = 'accepted' THEN
    UPDATE trips
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_slots
  AFTER UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_slots_on_request_status();
```

---

### 3. Trip Auto-Completion

```sql
CREATE OR REPLACE FUNCTION check_trip_completion_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    PERFORM check_parcel_request_completion(NEW.trip_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_trip_completion_trigger
  AFTER UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_trip_completion_on_delivery();
```

---

### 4. Rejected Timestamp Trigger

```sql
CREATE TRIGGER set_rejected_at_trigger
  BEFORE UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_rejected_at();
```

---

### 5. `updated_at` Triggers

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcel_requests_updated_at
  BEFORE UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Row Level Security (RLS)

Summarized RLS:

- `profiles`: users can only see and modify their own profile.
- `trips`: everyone can see open trips; only the traveller can create/update/delete their trips.
- `parcel_requests`: senders and the traveller for a trip can see and update relevant requests; only sender can delete their pending requests.
- `failed_login_attempts`: not directly queryable; accessed only via `SECURITY DEFINER` functions.

---

## Indexes & Performance

- **profiles**
  - Unique indexes on username, phone, email.
  - Rating index for future ranking.

- **trips**
  - Route, status, and departure_date indexes for search.
  - Composite index on `(source, destination, departure_date, status)` for open-trip filters.

- **parcel_requests**
  - Indexes on `trip_id`, `sender_id`, `status` for list and filter views.
  - Composite indexes for status + sorting by timestamps.

- **failed_login_attempts**
  - Indexes on `email` and `attempt_at` to keep lockout checks fast.

---

## Foreign Keys & Constraints

- `profiles.id` → `auth.users.id` (ON DELETE CASCADE)
- `trips.traveller_id` → `profiles.id` (ON DELETE CASCADE)
- `parcel_requests.trip_id` → `trips.id` (ON DELETE CASCADE)
- `parcel_requests.sender_id` → `profiles.id` (ON DELETE CASCADE)

---

## Setup & Migrations

1. Create Supabase project.
2. Apply SQL migrations in order:
   - `profiles`, `trips`, `parcel_requests`, `failed_login_attempts`
   - RPC functions: availability checks, lockout, OTP helpers
   - Triggers: profile auto-creation, slot updates, trip completion, timestamps
3. Ensure `on_auth_user_created` trigger exists on `auth.users`.
4. Generate TypeScript types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

---

**End of Backend Documentation**

```

```
