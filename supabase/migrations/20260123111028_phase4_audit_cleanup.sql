-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "No direct access to failed_login_attempts" ON failed_login_attempts;

-- Block all direct user access - only accessible via SECURITY DEFINER functions
CREATE POLICY "No direct access to failed_login_attempts"
ON failed_login_attempts
FOR ALL
TO public
USING (false);

-- Note: Redundant storage buckets (kyc_docs, package_photos) removed manually
-- These were from removed/unimplemented features
