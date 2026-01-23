-- Phase 4 Audit Cleanup
-- Enable RLS on failed_login_attempts for security

ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Block all direct user access - only accessible via SECURITY DEFINER functions
CREATE POLICY "No direct access to failed_login_attempts"
ON failed_login_attempts
FOR ALL
TO public
USING (false);

-- Note: Redundant storage buckets (kyc_docs, package_photos) removed manually
-- These were from removed/unimplemented features
