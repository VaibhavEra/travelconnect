-- Update parcel_requests table to support simplified request flow

-- Make pickup fields nullable (filled after acceptance by sender)
ALTER TABLE parcel_requests 
  ALTER COLUMN pickup_address DROP NOT NULL,
  ALTER COLUMN pickup_contact_name DROP NOT NULL,
  ALTER COLUMN pickup_contact_phone DROP NOT NULL;

-- Make delivery address nullable (coordinated later)
ALTER TABLE parcel_requests 
  ALTER COLUMN delivery_address DROP NOT NULL;

-- Keep delivery contact name and phone as required (for OTP and contact)
-- (Already NOT NULL, no changes needed)

-- Update phone validation constraints
ALTER TABLE parcel_requests 
  DROP CONSTRAINT IF EXISTS valid_pickup_phone,
  DROP CONSTRAINT IF EXISTS valid_delivery_phone;

-- Add validation only for delivery phone (when provided)
ALTER TABLE parcel_requests
  ADD CONSTRAINT valid_delivery_phone 
  CHECK (LENGTH(delivery_contact_phone) >= 10);

-- Add photos column to store parcel images
ALTER TABLE parcel_requests 
  ADD COLUMN IF NOT EXISTS parcel_photos TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN parcel_requests.parcel_photos IS 'Array of URLs to parcel photos uploaded to storage';

-- Create storage bucket for parcel photos (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('parcel-photos', 'parcel-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for parcel photos

-- Policy: Authenticated users can upload parcel photos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can upload parcel photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload parcel photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'parcel-photos');
  END IF;
END $$;

-- Policy: Anyone can view parcel photos (public bucket)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Anyone can view parcel photos'
  ) THEN
    CREATE POLICY "Anyone can view parcel photos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'parcel-photos');
  END IF;
END $$;

-- Policy: Users can delete their own photos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete their own parcel photos'
  ) THEN
    CREATE POLICY "Users can delete their own parcel photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'parcel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
