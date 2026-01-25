-- Add OTP and timestamp columns to parcel_requests table
ALTER TABLE parcel_requests 
ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS generate_otp();
DROP FUNCTION IF EXISTS generate_pickup_otp(UUID);
DROP FUNCTION IF EXISTS verify_pickup_otp(UUID, VARCHAR);
DROP FUNCTION IF EXISTS verify_delivery_otp(UUID, VARCHAR);

-- Create function to generate random 6-digit OTP
CREATE FUNCTION generate_otp()
RETURNS VARCHAR(6) AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to generate pickup OTP (called when request is accepted)
CREATE FUNCTION generate_pickup_otp(request_id UUID)
RETURNS TABLE(otp VARCHAR(6)) AS $$
DECLARE
  new_otp VARCHAR(6);
BEGIN
  new_otp := generate_otp();
  
  UPDATE parcel_requests
  SET 
    pickup_otp = new_otp,
    pickup_otp_expires_at = NOW() + INTERVAL '24 hours'
  WHERE id = request_id;
  
  RETURN QUERY SELECT new_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify pickup OTP and mark as picked up
CREATE FUNCTION verify_pickup_otp(request_id UUID, otp_code VARCHAR(6))
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
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

-- Create function to verify delivery OTP and mark as delivered
CREATE FUNCTION verify_delivery_otp(request_id UUID, otp_code VARCHAR(6))
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  SELECT 
    delivery_otp = otp_code AND 
    delivery_otp_expires_at > NOW() AND
    status = 'picked_up'
  INTO is_valid
  FROM parcel_requests
  WHERE id = request_id;
  
  IF is_valid THEN
    -- Update status to delivered
    UPDATE parcel_requests
    SET 
      status = 'delivered',
      delivered_at = NOW(),
      delivery_otp = NULL,
      delivery_otp_expires_at = NULL
    WHERE id = request_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_otp() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_pickup_otp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_pickup_otp(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_delivery_otp(UUID, VARCHAR) TO authenticated;
