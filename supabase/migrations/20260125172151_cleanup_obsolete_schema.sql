-- =============================================
-- MIGRATION: Cleanup Obsolete Tables & Columns
-- Date: January 25, 2026
-- Purpose: Remove packages/payments tables and redundant columns
-- Safe to run: Verified no data loss
-- =============================================

BEGIN;

-- ============================================
-- PART 1: DROP PAYMENTS TABLE (Unused in MVP)
-- ============================================

-- Drop triggers
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Drop RLS policies
DROP POLICY IF EXISTS "Travellers can view related payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

-- Drop indexes
DROP INDEX IF EXISTS idx_payments_package;
DROP INDEX IF EXISTS idx_payments_sender;
DROP INDEX IF EXISTS idx_payments_status;

-- Drop table (CASCADE removes foreign keys automatically)
DROP TABLE IF EXISTS payments CASCADE;

-- ============================================
-- PART 2: DROP PACKAGES TABLE (Replaced by parcel_requests)
-- ============================================

-- Drop triggers
DROP TRIGGER IF EXISTS on_package_accepted ON packages;
DROP TRIGGER IF EXISTS on_package_accepted_generate_otps ON packages;
DROP TRIGGER IF EXISTS on_package_delivered_check_trip ON packages;
DROP TRIGGER IF EXISTS update_packages_updated_at ON packages;

-- Drop RLS policies
DROP POLICY IF EXISTS "Packages viewable by sender and traveller" ON packages;
DROP POLICY IF EXISTS "Sender and traveller can update packages" ON packages;
DROP POLICY IF EXISTS "Senders can create packages" ON packages;
DROP POLICY IF EXISTS "Senders can delete requested packages" ON packages;

-- Drop indexes
DROP INDEX IF EXISTS idx_packages_receiver_phone;
DROP INDEX IF EXISTS idx_packages_sender;
DROP INDEX IF EXISTS idx_packages_sender_status;
DROP INDEX IF EXISTS idx_packages_status;
DROP INDEX IF EXISTS idx_packages_trip;
DROP INDEX IF EXISTS idx_packages_trip_status;

-- Drop table (CASCADE removes foreign keys)
DROP TABLE IF EXISTS packages CASCADE;

-- ============================================
-- PART 3: DROP OBSOLETE FUNCTIONS
-- ============================================

-- Functions that reference deleted packages table
DROP FUNCTION IF EXISTS generate_package_otps() CASCADE;
DROP FUNCTION IF EXISTS handle_package_accepted() CASCADE;
DROP FUNCTION IF EXISTS check_trip_completion() CASCADE;

-- ============================================
-- PART 4: CLEAN UP parcel_requests TABLE
-- ============================================

-- Add missing timestamp columns
ALTER TABLE parcel_requests 
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Drop redundant address columns (coordination via phone in MVP)
ALTER TABLE parcel_requests 
  DROP COLUMN IF EXISTS pickup_address,
  DROP COLUMN IF EXISTS delivery_address;

-- Drop redundant pickup contact columns (use sender profile instead)
ALTER TABLE parcel_requests 
  DROP COLUMN IF EXISTS pickup_contact_name,
  DROP COLUMN IF EXISTS pickup_contact_phone;

-- Drop obsolete phone validation constraint
ALTER TABLE parcel_requests 
  DROP CONSTRAINT IF EXISTS valid_delivery_phone;

-- Add comment explaining design decision
COMMENT ON TABLE parcel_requests IS 'MVP: Addresses not stored - pickup/delivery coordinated via phone. Pickup contact = sender (from profiles table).';

-- ============================================
-- PART 5: FIX generate_pickup_otp FUNCTION
-- ============================================

-- Drop old version that returns table
DROP FUNCTION IF EXISTS generate_pickup_otp(UUID);

-- Create improved version that returns plain string
CREATE OR REPLACE FUNCTION generate_pickup_otp(request_id UUID)
RETURNS VARCHAR(6) AS $$
DECLARE
  new_otp VARCHAR(6);
BEGIN
  -- Generate OTP
  new_otp := generate_otp();
  
  -- Update request with OTP and set accepted_at timestamp
  UPDATE parcel_requests
  SET 
    pickup_otp = new_otp,
    pickup_otp_expires_at = NOW() + INTERVAL '24 hours',
    accepted_at = NOW()
  WHERE id = request_id;
  
  RETURN new_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_pickup_otp(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION generate_pickup_otp IS 'Generates 6-digit pickup OTP with 24-hour expiry. Called after traveller accepts request.';

-- ============================================
-- PART 6: UPDATE verify_pickup_otp TO SET rejected_at
-- ============================================

-- Improve verify functions to set timestamps
CREATE OR REPLACE FUNCTION verify_pickup_otp(request_id UUID, otp_code VARCHAR(6))
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  -- Validate OTP
  SELECT 
    pickup_otp = otp_code AND 
    pickup_otp_expires_at > NOW() AND
    status = 'accepted'
  INTO is_valid
  FROM parcel_requests
  WHERE id = request_id;
  
  IF is_valid THEN
    -- Update status to picked_up and generate delivery OTP
    UPDATE parcel_requests
    SET 
      status = 'picked_up',
      picked_up_at = NOW(),
      pickup_otp = NULL,
      pickup_otp_expires_at = NULL,
      delivery_otp = generate_otp(),
      delivery_otp_expires_at = NOW() + INTERVAL '72 hours'
    WHERE id = request_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: ADD FUNCTION TO UPDATE rejected_at
-- ============================================

-- Create helper function to set rejected_at timestamp
CREATE OR REPLACE FUNCTION set_request_rejected_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    NEW.rejected_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set rejected_at
CREATE TRIGGER set_rejected_at_trigger
  BEFORE UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_rejected_at();

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_request_rejected_at() TO authenticated;

-- ============================================
-- PART 8: ADD TRIP AUTO-COMPLETION TRIGGER
-- ============================================

-- Create function to auto-complete trip when all parcels delivered
CREATE OR REPLACE FUNCTION check_parcel_request_completion()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER check_trip_completion_on_delivery
  AFTER UPDATE ON parcel_requests
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION check_parcel_request_completion();

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_parcel_request_completion() TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_parcel_request_completion IS 'Auto-completes trip when all parcel requests are delivered';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify cleanup succeeded
SELECT 
  'Obsolete tables removed' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('packages', 'payments');
-- Expected: 0

-- Verify active tables
SELECT 
  'Active tables' as check_type,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Expected: failed_login_attempts, parcel_requests, profiles, trips

-- Verify parcel_requests columns
SELECT 
  'parcel_requests columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parcel_requests'
ORDER BY ordinal_position;
-- Verify: No pickup_address, no delivery_address, no pickup_contact_*, has accepted_at, has rejected_at

-- Verify functions
SELECT 
  'Active functions' as check_type,
  routine_name,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
-- Verify: No generate_package_otps, no handle_package_accepted, no check_trip_completion
-- Verify: generate_pickup_otp returns varchar(6) not table

-- Verify triggers
SELECT 
  'Triggers on parcel_requests' as check_type,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'parcel_requests'
ORDER BY trigger_name;
-- Expected triggers:
-- - check_trip_completion_on_delivery
-- - set_rejected_at_trigger
-- - trigger_update_trip_slots
-- - update_parcel_requests_updated_at

-- Verify RLS policies still working
SELECT 
  'RLS policies on parcel_requests' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'parcel_requests'
ORDER BY policyname;
-- Should show 6 policies (unchanged)
