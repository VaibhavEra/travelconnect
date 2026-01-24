-- Create parcel_requests table
CREATE TABLE parcel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Parcel details
  item_description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('documents', 'clothing', 'medicines', 'books', 'small_items')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  
  -- Pickup details
  pickup_address TEXT NOT NULL,
  pickup_contact_name TEXT NOT NULL,
  pickup_contact_phone TEXT NOT NULL,
  
  -- Delivery details
  delivery_address TEXT NOT NULL,
  delivery_contact_name TEXT NOT NULL,
  delivery_contact_phone TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled')),
  
  -- Notes
  sender_notes TEXT,
  traveller_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_pickup_phone CHECK (LENGTH(pickup_contact_phone) >= 10),
  CONSTRAINT valid_delivery_phone CHECK (LENGTH(delivery_contact_phone) >= 10)
);

-- Indexes
CREATE INDEX idx_parcel_requests_trip_id ON parcel_requests(trip_id);
CREATE INDEX idx_parcel_requests_sender_id ON parcel_requests(sender_id);
CREATE INDEX idx_parcel_requests_status ON parcel_requests(status);
CREATE INDEX idx_parcel_requests_created_at ON parcel_requests(created_at DESC);

-- Enable RLS
ALTER TABLE parcel_requests ENABLE ROW LEVEL SECURITY;

-- Policies for parcel_requests

-- 1. Senders can view their own requests
CREATE POLICY "Users can view their own parcel requests"
  ON parcel_requests
  FOR SELECT
  USING (auth.uid() = sender_id);

-- 2. Travellers can view requests for their trips
CREATE POLICY "Travellers can view requests for their trips"
  ON parcel_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = parcel_requests.trip_id
      AND trips.traveller_id = auth.uid()
    )
  );

-- 3. Senders can create requests
CREATE POLICY "Senders can create parcel requests"
  ON parcel_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 4. Senders can update their own pending requests
CREATE POLICY "Senders can update their pending requests"
  ON parcel_requests
  FOR UPDATE
  USING (
    auth.uid() = sender_id 
    AND status = 'pending'
  )
  WITH CHECK (auth.uid() = sender_id);

-- 5. Travellers can update requests for their trips
CREATE POLICY "Travellers can update requests for their trips"
  ON parcel_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = parcel_requests.trip_id
      AND trips.traveller_id = auth.uid()
    )
  );

-- 6. Senders can delete their pending requests
CREATE POLICY "Senders can delete their pending requests"
  ON parcel_requests
  FOR DELETE
  USING (
    auth.uid() = sender_id 
    AND status = 'pending'
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_parcel_requests_updated_at
  BEFORE UPDATE ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update trip available_slots when request is accepted
CREATE OR REPLACE FUNCTION update_trip_slots_on_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When request is accepted, decrease available_slots
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE trips
    SET available_slots = available_slots - 1
    WHERE id = NEW.trip_id;
  END IF;
  
  -- When accepted request is cancelled/rejected, increase available_slots
  IF (NEW.status IN ('cancelled', 'rejected')) AND OLD.status = 'accepted' THEN
    UPDATE trips
    SET available_slots = available_slots + 1
    WHERE id = NEW.trip_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_slots
  AFTER UPDATE OF status ON parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_slots_on_request_status();

-- Comments
COMMENT ON TABLE parcel_requests IS 'Stores parcel delivery requests from senders to travellers';
COMMENT ON COLUMN parcel_requests.status IS 'pending: awaiting traveller response, accepted: traveller accepted, rejected: traveller rejected, picked_up: picked up from sender, delivered: delivered to recipient, cancelled: sender cancelled';
COMMENT ON COLUMN parcel_requests.size IS 'small: fits in pocket/small bag, medium: fits in backpack, large: requires dedicated luggage space';
