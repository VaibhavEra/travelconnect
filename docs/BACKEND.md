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
- **Database triggers** for automated workflows (profile creation, OTP generation)
- **RPC functions** for complex queries that bypass RLS
- **Comprehensive indexes** for query performance
- **Foreign key constraints** with CASCADE rules for data integrity

All database logic is server-side, minimizing client-side complexity and security risks.

---

## Database Schema

### 1. `profiles` Table

Stores user information and KYC status. Each profile corresponds to a user in `auth.users`.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  kyc_documents JSONB DEFAULT '[]'::jsonb,
  kyc_rejection_reason TEXT,
  is_traveller BOOLEAN DEFAULT false,
  is_sender BOOLEAN DEFAULT true,
  rating_avg DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `id`: UUID matching `auth.users.id` (foreign key)
- `email`, `username`, `phone`: Unique identifiers
- `kyc_status`: 'pending' | 'verified' | 'rejected'
- `kyc_documents`: JSONB array of uploaded document URLs
- `is_traveller`, `is_sender`: Role flags (users can be both)
- `rating_avg`, `rating_count`: Future rating system data

**Indexes:**

```sql
CREATE UNIQUE INDEX profiles_email_key ON profiles(email);
CREATE UNIQUE INDEX profiles_phone_key ON profiles(phone);
CREATE UNIQUE INDEX profiles_username_key ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_kyc_status ON profiles(kyc_status);
```

**RLS Policies:**

- `Users can view own profile`: `auth.uid() = id`
- `Users can update own profile`: `auth.uid() = id`
- `Users can insert own profile`: `auth.uid() = id`
- `Users can view profiles of related users`: See related packages/trips

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
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('train', 'bus', 'flight', 'car')),
  total_slots INTEGER NOT NULL CHECK (total_slots BETWEEN 1 AND 5),
  available_slots INTEGER NOT NULL CHECK (available_slots >= 0),
  price_per_kg DECIMAL(10,2) NOT NULL CHECK (price_per_kg > 0),
  max_weight_per_package DECIMAL(5,2) NOT NULL CHECK (max_weight_per_package > 0),
  allowed_categories TEXT[] DEFAULT ARRAY['documents', 'electronics', 'clothing', 'food', 'books'],
  meetup_location TEXT,
  meetup_instructions TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `traveller_id`: Foreign key to `profiles(id)`
- `source`, `destination`: City names (free text for MVP)
- `departure_date`, `arrival_date`: Trip timeline
- `transport_mode`: 'train' | 'bus' | 'flight' | 'car'
- `total_slots`, `available_slots`: Capacity management (max 5)
- `price_per_kg`: Pricing per kilogram
- `max_weight_per_package`: Weight limit per package
- `allowed_categories`: Array of item types accepted
- `status`: 'open' | 'completed' | 'cancelled'

**Indexes:**

```sql
CREATE INDEX idx_trips_traveller ON trips(traveller_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure ON trips(departure_date);
CREATE INDEX idx_trips_route ON trips(source, destination);
CREATE INDEX idx_trips_available ON trips(status, available_slots) WHERE status = 'open';
CREATE INDEX idx_trips_search_composite ON trips(source, destination, departure_date, status, available_slots)
  WHERE status = 'open' AND available_slots > 0;
```

**RLS Policies:**

- `Open trips are viewable by everyone`: `status = 'open' OR traveller_id = auth.uid()`
- `Travellers can create trips`: `auth.uid() = traveller_id`
- `Travellers can update own trips`: `auth.uid() = traveller_id`
- `Travellers can delete own trips`: `auth.uid() = traveller_id`

**Trigger:**

- `on_package_delivered_check_trip`: Auto-completes trip when all packages delivered

---

### 3. `packages` Table

Stores package delivery requests from senders to travellers.

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_category TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL CHECK (weight > 0),
  dimensions TEXT,
  photo_url TEXT,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  delivery_instructions TEXT,
  pickup_otp TEXT,
  delivery_otp TEXT,
  pickup_photo_url TEXT,
  delivery_photo_url TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'picked', 'delivered', 'cancelled')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `trip_id`: Foreign key to `trips(id)`
- `sender_id`: Foreign key to `profiles(id)`
- `item_name`, `item_description`, `item_category`: Package details
- `weight`, `dimensions`: Physical attributes
- `photo_url`: Sender's photo of package
- `receiver_name`, `receiver_phone`, `receiver_address`: Delivery details
- `pickup_otp`, `delivery_otp`: 6-digit OTPs for verification
- `pickup_photo_url`, `delivery_photo_url`: Handoff evidence
- `status`: 'requested' | 'accepted' | 'picked' | 'delivered' | 'cancelled'
- `amount`: Price calculated from weight \* price_per_kg

**Indexes:**

```sql
CREATE INDEX idx_packages_trip ON packages(trip_id);
CREATE INDEX idx_packages_sender ON packages(sender_id);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_receiver_phone ON packages(receiver_phone);
CREATE INDEX idx_packages_trip_status ON packages(trip_id, status, updated_at DESC);
CREATE INDEX idx_packages_sender_status ON packages(sender_id, status, created_at DESC);
```

**RLS Policies:**

- `Packages viewable by sender and traveller`: `auth.uid() = sender_id OR auth.uid() IN (SELECT traveller_id FROM trips WHERE id = trip_id)`
- `Senders can create packages`: `auth.uid() = sender_id`
- `Sender and traveller can update packages`: Same as view
- `Senders can delete requested packages`: `auth.uid() = sender_id AND status IN ('requested', 'accepted')`

**Triggers:**

- `on_package_accepted_generate_otps`: Generates pickup and delivery OTPs when accepted
- `on_package_accepted`: Decrements trip's `available_slots` by 1
- `on_package_delivered_check_trip`: Checks if all packages delivered → mark trip completed

---

### 4. `payments` Table

Stores payment records for package deliveries (fake payments for MVP).

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `package_id`: Foreign key to `packages(id)`
- `sender_id`: Foreign key to `profiles(id)`
- `amount`: Payment amount (matches package amount)
- `status`: 'pending' | 'completed' | 'failed' | 'refunded'
- `payment_method`: 'upi' | 'card' | 'wallet' (future)
- `transaction_id`: External payment gateway reference

**Indexes:**

```sql
CREATE INDEX idx_payments_package ON payments(package_id);
CREATE INDEX idx_payments_sender ON payments(sender_id);
CREATE INDEX idx_payments_status ON payments(status);
```

**RLS Policies:**

- `Users can view own payments`: `auth.uid() = sender_id`
- `Travellers can view related payments`: Via trip → package join
- `Users can create own payments`: `auth.uid() = sender_id`

---

### 5. `failed_login_attempts` Table

Tracks failed login attempts for account lockout protection.

```sql
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `email`: Email of failed login attempt (not a foreign key - email might not exist)
- `ip_address`: Client IP for additional tracking (optional)
- `attempted_at`: Timestamp for 15-minute window calculation

**Indexes:**

```sql
CREATE INDEX idx_failed_attempts_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_attempts_time ON failed_login_attempts(attempted_at);
```

**RLS:** No policies (only accessed via RPC functions with SECURITY DEFINER)

---

## RPC Functions

All RPC functions use `SECURITY DEFINER` to bypass RLS when needed.

### Authentication & Security Functions

#### 1. `is_account_locked(user_email TEXT) RETURNS BOOLEAN`

Checks if account is locked due to failed login attempts.

```sql
CREATE OR REPLACE FUNCTION is_account_locked(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
```

**Logic:**

- Counts failed attempts in last 15 minutes
- Returns `true` if 5+ attempts (account locked)
- Auto-expires after 15 minutes (no manual unlock needed)

**Used in:** Login flow to check lockout status before allowing attempt

---

#### 2. `record_failed_login(user_email TEXT, user_ip TEXT) RETURNS VOID`

Records a failed login attempt.

```sql
CREATE OR REPLACE FUNCTION record_failed_login(
  user_email text,
  user_ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO failed_login_attempts (email, ip_address)
  VALUES (user_email, user_ip);
END;
$$;
```

**Logic:**

- Inserts new record with timestamp
- IP address optional (not currently used)
- No limit on record count (old records remain for analytics)

**Used in:** Login flow after authentication failure

---

#### 3. `clear_failed_attempts(user_email TEXT) RETURNS VOID`

Clears all failed login attempts for an email.

```sql
CREATE OR REPLACE FUNCTION clear_failed_attempts(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE email = user_email;
END;
$$;
```

**Logic:**

- Deletes all records for the email
- Called on: successful login, logout, password reset

**Used in:** `authStore.ts` after successful authentication actions

---

### Availability Check Functions

These functions check if username/email/phone are available during registration.

#### 4. `check_username_available(check_username TEXT) RETURNS BOOLEAN`

```sql
CREATE OR REPLACE FUNCTION check_username_available(check_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;
```

**Logic:**

- Case-insensitive check (`LOWER()`)
- Returns `true` if available, `false` if taken
- Uses `SECURITY DEFINER` to bypass RLS

---

#### 5. `check_email_available(check_email TEXT) RETURNS BOOLEAN`

```sql
CREATE OR REPLACE FUNCTION check_email_available(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;
```

**Logic:**

- Case-insensitive email check
- Checks `profiles` table (not `auth.users` to avoid enumeration)

---

#### 6. `check_phone_available(check_phone TEXT) RETURNS BOOLEAN`

```sql
CREATE OR REPLACE FUNCTION check_phone_available(check_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE phone = check_phone
  );
END;
$$;
```

**Logic:**

- Exact phone match (formatted as `+91XXXXXXXXXX`)

---

### Package & Trip Functions

#### 7. `generate_otp() RETURNS TEXT`

Generates a 6-digit random OTP.

```sql
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;
```

**Logic:**

- Random number 0-999999
- Left-padded with zeros to 6 digits
- Not cryptographically secure (sufficient for MVP)

**Used in:** `generate_package_otps()` trigger

---

#### 8. `generate_package_otps() RETURNS TRIGGER`

Trigger function to auto-generate OTPs when package is accepted.

```sql
CREATE OR REPLACE FUNCTION generate_package_otps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'requested' THEN
    NEW.pickup_otp := generate_otp();
    NEW.delivery_otp := generate_otp();
  END IF;
  RETURN NEW;
END;
$$;
```

**Logic:**

- Fires BEFORE UPDATE on `packages`
- Only when status changes from 'requested' → 'accepted'
- Sets `pickup_otp` and `delivery_otp` fields

**Trigger:**

```sql
CREATE TRIGGER on_package_accepted_generate_otps
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION generate_package_otps();
```

---

#### 9. `handle_package_accepted() RETURNS TRIGGER`

Decrements trip's available slots when package is accepted.

```sql
CREATE OR REPLACE FUNCTION handle_package_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'requested' THEN
    UPDATE trips
    SET available_slots = available_slots - 1
    WHERE id = NEW.trip_id
      AND available_slots > 0;
  END IF;
  RETURN NEW;
END;
$$;
```

**Logic:**

- Fires AFTER UPDATE on `packages`
- Only when status changes to 'accepted'
- Decrements `trips.available_slots` by 1
- Prevents negative slots with `available_slots > 0` check

**Trigger:**

```sql
CREATE TRIGGER on_package_accepted
  AFTER UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION handle_package_accepted();
```

---

#### 10. `check_trip_completion() RETURNS TRIGGER`

Marks trip as completed when all packages are delivered.

```sql
CREATE OR REPLACE FUNCTION check_trip_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_packages INTEGER;
  delivered_packages INTEGER;
BEGIN
  IF NEW.status = 'delivered' THEN
    SELECT COUNT(*) INTO total_packages
    FROM packages
    WHERE trip_id = NEW.trip_id
      AND status != 'cancelled';

    SELECT COUNT(*) INTO delivered_packages
    FROM packages
    WHERE trip_id = NEW.trip_id
      AND status = 'delivered';

    IF total_packages > 0 AND total_packages = delivered_packages THEN
      UPDATE trips
      SET status = 'completed'
      WHERE id = NEW.trip_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

**Logic:**

- Fires AFTER UPDATE on `packages`
- Only when package status changes to 'delivered'
- Counts total non-cancelled packages for trip
- If all delivered → set trip status to 'completed'

**Trigger:**

```sql
CREATE TRIGGER on_package_delivered_check_trip
  AFTER UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION check_trip_completion();
```

---

### User Management Functions

#### 11. `handle_new_user() RETURNS TRIGGER`

Auto-creates profile when user signs up.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
```

**Logic:**

- Fires AFTER INSERT on `auth.users`
- Extracts metadata from `raw_user_meta_data` JSONB
- Creates corresponding `profiles` row
- Uses user's UUID as profile ID (same primary key)

**Trigger:**

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Critical:** This trigger is essential for auth flow to work. Without it, signup succeeds but profile isn't created.

---

#### 12. `update_updated_at_column() RETURNS TRIGGER`

Auto-updates `updated_at` timestamp on row changes.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

**Logic:**

- Fires BEFORE UPDATE on any table
- Sets `updated_at` to current timestamp
- Applied to: `profiles`, `trips`, `packages`, `payments`

**Triggers:**

```sql
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Repeated for trips, packages, payments
```

---

## Database Triggers

Summary of all triggers and their purposes:

| Trigger Name                        | Table        | Timing | Event  | Function                     | Purpose                       |
| ----------------------------------- | ------------ | ------ | ------ | ---------------------------- | ----------------------------- |
| `on_auth_user_created`              | `auth.users` | AFTER  | INSERT | `handle_new_user()`          | Auto-create profile           |
| `on_package_accepted_generate_otps` | `packages`   | BEFORE | UPDATE | `generate_package_otps()`    | Generate pickup/delivery OTPs |
| `on_package_accepted`               | `packages`   | AFTER  | UPDATE | `handle_package_accepted()`  | Decrement trip slots          |
| `on_package_delivered_check_trip`   | `packages`   | AFTER  | UPDATE | `check_trip_completion()`    | Mark trip completed           |
| `update_profiles_updated_at`        | `profiles`   | BEFORE | UPDATE | `update_updated_at_column()` | Update timestamp              |
| `update_trips_updated_at`           | `trips`      | BEFORE | UPDATE | `update_updated_at_column()` | Update timestamp              |
| `update_packages_updated_at`        | `packages`   | BEFORE | UPDATE | `update_updated_at_column()` | Update timestamp              |
| `update_payments_updated_at`        | `payments`   | BEFORE | UPDATE | `update_updated_at_column()` | Update timestamp              |

---

## Row Level Security (RLS)

RLS is enabled on all tables to ensure users can only access their own data or related data.

### Profiles RLS

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile (used by trigger)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can view profiles of people they're transacting with
CREATE POLICY "Users can view profiles of related users"
ON profiles FOR SELECT
USING (
  id IN (
    -- Travellers whose trips I've requested packages on
    SELECT t.traveller_id
    FROM trips t
    JOIN packages p ON p.trip_id = t.id
    WHERE p.sender_id = auth.uid()

    UNION

    -- Senders who've requested packages on my trips
    SELECT p.sender_id
    FROM packages p
    JOIN trips t ON t.id = p.trip_id
    WHERE t.traveller_id = auth.uid()
  )
);
```

**Logic:**

- Users can CRUD their own profile
- Users can view profiles of:
  - Travellers on trips they've sent packages on
  - Senders who've requested packages on their trips
- Prevents enumeration of all users

---

### Trips RLS

```sql
-- Open trips are viewable by everyone (for search)
CREATE POLICY "Open trips are viewable by everyone"
ON trips FOR SELECT
USING (status = 'open' OR traveller_id = auth.uid());

-- Travellers can create their own trips
CREATE POLICY "Travellers can create trips"
ON trips FOR INSERT
WITH CHECK (auth.uid() = traveller_id);

-- Travellers can update their own trips
CREATE POLICY "Travellers can update own trips"
ON trips FOR UPDATE
USING (auth.uid() = traveller_id);

-- Travellers can delete their own trips
CREATE POLICY "Travellers can delete own trips"
ON trips FOR DELETE
USING (auth.uid() = traveller_id);
```

**Logic:**

- All users can view open trips (for search functionality)
- Users can view their own trips regardless of status
- Only trip owner can create/update/delete

---

### Packages RLS

```sql
-- Packages viewable by sender and traveller
CREATE POLICY "Packages viewable by sender and traveller"
ON packages FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() IN (
    SELECT traveller_id FROM trips WHERE id = trip_id
  )
);

-- Senders can create packages
CREATE POLICY "Senders can create packages"
ON packages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Sender and traveller can update packages (status changes)
CREATE POLICY "Sender and traveller can update packages"
ON packages FOR UPDATE
USING (
  auth.uid() = sender_id
  OR auth.uid() IN (
    SELECT traveller_id FROM trips WHERE id = trip_id
  )
);

-- Senders can delete requested/accepted packages only
CREATE POLICY "Senders can delete requested packages"
ON packages FOR DELETE
USING (
  auth.uid() = sender_id
  AND status IN ('requested', 'accepted')
);
```

**Logic:**

- Sender and trip's traveller can view package
- Only sender can create package
- Both sender and traveller can update (for status changes)
- Sender can only delete if not yet picked up

---

### Payments RLS

```sql
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (auth.uid() = sender_id);

-- Travellers can view payments for packages on their trips
CREATE POLICY "Travellers can view related payments"
ON payments FOR SELECT
USING (
  auth.uid() IN (
    SELECT t.traveller_id
    FROM trips t
    JOIN packages p ON p.trip_id = t.id
    WHERE p.id = package_id
  )
);

-- Users can create their own payments
CREATE POLICY "Users can create own payments"
ON payments FOR INSERT
WITH CHECK (auth.uid() = sender_id);
```

**Logic:**

- Senders can view their payments
- Travellers can view payments for packages on their trips
- Only sender can create payment

---

## Indexes & Performance

### Index Strategy

1. **Primary Keys**: Automatic B-tree indexes on all PKs
2. **Foreign Keys**: Indexed for JOIN performance
3. **Unique Constraints**: Automatic unique indexes (email, username, phone)
4. **Search Filters**: Composite indexes on commonly filtered columns
5. **Partial Indexes**: For filtered queries (e.g., only open trips)

### Performance-Critical Indexes

**Trip Search (Most Complex Query):**

```sql
-- Composite index for multi-filter search
CREATE INDEX idx_trips_search_composite
ON trips(source, destination, departure_date, status, available_slots)
WHERE status = 'open' AND available_slots > 0;
```

This single index optimizes the common search query:

```sql
SELECT * FROM trips
WHERE source = 'Mumbai'
  AND destination = 'Delhi'
  AND departure_date = '2025-02-01'
  AND status = 'open'
  AND available_slots > 0;
```

**Package Lookups:**

```sql
-- Sender's package history
CREATE INDEX idx_packages_sender_status
ON packages(sender_id, status, created_at DESC);

-- Trip's packages list
CREATE INDEX idx_packages_trip_status
ON packages(trip_id, status, updated_at DESC);
```

---

## Foreign Keys & Constraints

### CASCADE Rules

All foreign keys use `ON DELETE CASCADE`, meaning:

```sql
-- If profile is deleted → all trips, packages, payments deleted
trips.traveller_id → profiles.id ON DELETE CASCADE
packages.sender_id → profiles.id ON DELETE CASCADE
payments.sender_id → profiles.id ON DELETE CASCADE

-- If trip is deleted → all packages deleted
packages.trip_id → trips.id ON DELETE CASCADE

-- If package is deleted → payment deleted
payments.package_id → packages.id ON DELETE CASCADE
```

**Why CASCADE?**

- Simplifies data cleanup (no orphaned records)
- For MVP, user deletion is rare
- Post-MVP: May change to RESTRICT to prevent accidental deletions

### CHECK Constraints

Enforce business rules at database level:

```sql
-- Trips
CHECK (total_slots BETWEEN 1 AND 5)
CHECK (available_slots >= 0)
CHECK (price_per_kg > 0)
CHECK (status IN ('open', 'completed', 'cancelled'))

-- Packages
CHECK (weight > 0)
CHECK (amount >= 0)
CHECK (status IN ('requested', 'accepted', 'picked', 'delivered', 'cancelled'))

-- Payments
CHECK (amount > 0)
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))

-- Profiles
CHECK (kyc_status IN ('pending', 'verified', 'rejected'))
```

---

## Setup & Migrations

### Initial Setup

1. **Create Supabase Project**
   - Sign up at supabase.com
   - Create new project
   - Note project URL and anon key

2. **Run Migrations in Order**

```bash
# Navigate to SQL Editor in Supabase dashboard
# Run each migration file in order:

001_initial_schema.sql      # Create all tables
002_rpc_functions.sql        # Create all functions
003_rls_policies.sql         # Enable RLS and create policies
004_triggers.sql             # Create all triggers
005_indexes.sql              # Create performance indexes
```

3. **Verify Setup**

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check functions exist
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

4. **Generate TypeScript Types**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Generate types
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

---

## Database Audit Checklist

Run these queries to verify everything is set up correctly:

```sql
-- 1. Check all tables exist (should return 5)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. Check all functions exist (should return 12)
SELECT COUNT(*) FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- 3. Check auth.users trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 4. Check RLS is enabled (all should be true)
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';

-- 5. Check no orphaned data (all should be 0)
SELECT COUNT(*) FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- 6. Check indexes (should return 30+)
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
```

---

## Common Database Operations

### Testing Failed Login Lockout

```sql
-- Simulate 5 failed attempts
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');

-- Check if locked (should return true)
SELECT is_account_locked('test@example.com');

-- Clear attempts
SELECT clear_failed_attempts('test@example.com');

-- Check again (should return false)
SELECT is_account_locked('test@example.com');
```

### Testing Availability Checks

```sql
-- Check if username available (should return true/false)
SELECT check_username_available('testuser123');

-- Check email availability
SELECT check_email_available('test@example.com');

-- Check phone availability
SELECT check_phone_available('+919876543210');
```

### Manual Data Cleanup

```sql
-- Delete all test data
DELETE FROM payments;
DELETE FROM packages;
DELETE FROM trips;
DELETE FROM failed_login_attempts;
DELETE FROM profiles;
DELETE FROM auth.users;

-- Verify cleanup (all should return 0)
SELECT
  (SELECT COUNT(*) FROM auth.users) as users,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM trips) as trips,
  (SELECT COUNT(*) FROM packages) as packages;
```

---

## Performance Monitoring

### Slow Query Analysis

```sql
-- Enable query logging (in Supabase settings)
-- Then check slow queries:
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Index Usage

```sql
-- Check which indexes are actually used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Table Sizes

```sql
-- Check table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

---

## Security Best Practices

1. **Always use RLS**: Every table must have RLS enabled
2. **Use SECURITY DEFINER carefully**: Only for availability checks and auth functions
3. **Validate on both client and server**: Never trust client-side validation alone
4. **Use parameterized queries**: Supabase handles this, but be aware
5. **Limit exposed functions**: Only create RPC functions when absolutely needed
6. **Audit regularly**: Run the audit checklist monthly
7. **Backup before migrations**: Supabase has point-in-time recovery
8. **Test RLS policies**: Ensure users can't access unauthorized data

---

## Troubleshooting

### Profile Not Created After Signup

**Check:**

```sql
-- Is trigger installed?
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';
```

**Fix:**

```sql
-- Reinstall trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### User Can See Other Users' Data

**Check:**

```sql
-- Is RLS enabled?
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
```

**Fix:**

```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Slow Queries

**Diagnose:**

```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM trips
WHERE source = 'Mumbai'
  AND destination = 'Delhi'
  AND status = 'open';
```

**Look for:** "Index Scan" vs "Seq Scan" in output

---

## Future Enhancements

### Post-MVP Database Improvements

1. **Add Enum Types** for status fields (prevents typos)
2. **Implement Soft Deletes** (mark deleted instead of CASCADE)
3. **Add Audit Logging** (track all data changes)
4. **Partitioning** for large tables (packages, payments)
5. **Full-Text Search** on trip routes and package descriptions
6. **Geospatial Indexes** for location-based search
7. **Materialized Views** for analytics dashboards
8. **Read Replicas** for scaling read-heavy workloads

---

**End of Backend Documentation**
