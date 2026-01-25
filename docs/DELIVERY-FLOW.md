# TravelConnect Delivery Flow Documentation

## Table of Contents

1. [Overview](#overview)
2. [Complete Delivery Workflow](#complete-delivery-workflow)
3. [OTP System Architecture](#otp-system-architecture)
4. [Status Transitions](#status-transitions)
5. [Database Operations](#database-operations)
6. [Frontend Implementation](#frontend-implementation)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Overview

TravelConnect uses a secure OTP-based delivery verification system to ensure parcels are handed off correctly between sender, traveller, and receiver.

**Key Features:**

- **Two-stage OTP verification**: Pickup and delivery
- **Explicit RPC-based OTP generation**: `generate_pickup_otp()` called after acceptance
- **Time-bound OTPs**: 24 hours for pickup, 72 hours for delivery
- **Boolean-returning RPC verification**: `verify_pickup_otp()` and `verify_delivery_otp()`
- **Auto-cleanup**: OTPs cleared after successful verification
- **Automatic trip completion**: When all parcels on a trip are delivered

**Actors:**

1. **Sender**: Creates request, provides pickup OTP to traveller
2. **Traveller**: Accepts request, verifies pickup OTP, verifies delivery OTP
3. **Receiver**: Receives delivery OTP from sender, provides to traveller

---

## Complete Delivery Workflow

### Phase 1: Request Creation (Sender)

**User Action:**

1. Sender searches for trips (origin → destination, date)
2. Sender finds suitable trip with available slots
3. Sender creates parcel request with details:
   - `item_description`, `category`, `size`
   - Multiple `parcel_photos`
   - Receiver details (`delivery_contact_name`, `delivery_contact_phone`)
   - Optional `sender_notes`

**Database State:**

```sql
INSERT INTO parcel_requests (
  trip_id,
  sender_id,
  item_description,
  category,
  size,
  parcel_photos,
  delivery_contact_name,
  delivery_contact_phone,
  sender_notes,
  status
) VALUES (
  'trip-uuid',
  'sender-uuid',
  'Important Documents',
  'documents',
  'small',
  ARRAY['photo1.jpg', 'photo2.jpg'],
  'John Doe',
  '9876543210',
  'Fragile - handle with care',
  'pending'
);
```

````

**Status:** `pending`

**Note:** Exact pickup/delivery locations are coordinated via phone; not stored in DB in MVP.

---

### Phase 2: Request Acceptance (Traveller)

**User Action:**

1. Traveller opens Requests tab → Incoming view
2. Traveller reviews request details and parcel photos
3. Traveller taps "Accept"

**Database Operations:**

```sql
-- Frontend calls:
-- 1. supabase.rpc('generate_pickup_otp', { request_id: 'request-uuid' })
--    → updates status='accepted', sets accepted_at, pickup_otp, pickup_otp_expires_at
-- 2. TRIGGER: update_trip_slots_on_request_status
--    → decrements trips.available_slots
```

**`generate_pickup_otp()` RPC:**

```sql
-- Returns the generated OTP as VARCHAR(6)
-- Writes pickup_otp + pickup_otp_expires_at (24h) + sets accepted_at
```

**Final State:**

```sql
SELECT
  status,              -- 'accepted'
  pickup_otp,          -- '123456'
  pickup_otp_expires_at, -- NOW() + 24h
  accepted_at,         -- NOW()
  delivery_otp         -- NULL (not yet generated)
FROM parcel_requests WHERE id = 'request-uuid';
```

**Status:** `accepted`

**What Happens Next:**

- Sender can now see pickup OTP in their request details
- Sender shares pickup OTP with traveller (call/WhatsApp)

---

### Phase 3: Pickup Verification (Traveller + Sender)

**User Action:**

1. Traveller meets sender at agreed location (coordinated via phone)
2. Sender hands over parcel
3. Traveller → Active requests → "Ready for Pickup"
4. Traveller taps "Mark as Picked Up" → `VerifyPickupOtpModal`
5. Traveller enters sender's pickup OTP

**Frontend Flow:**

```typescript
const handleVerifyPickup = async (otp: string) => {
  const isValid = await verifyPickupOtp(selectedRequestId, otp);
  if (isValid) {
    Alert.alert("Success", "Parcel marked as picked up!");
    await getAcceptedRequests(user.id);
  }
  return isValid;
};
```

**RPC Call:**

```typescript
const { data, error } = await supabase.rpc("verify_pickup_otp", {
  request_id: requestId,
  otp: otp,
});
const isValid = data as boolean;
```

**Success Flow:**

1. ✅ OTP validated
2. ✅ Status → `picked_up`, `picked_up_at` set
3. ✅ Pickup OTP cleared
4. ✅ **Delivery OTP generated automatically** (72h expiry)
5. ✅ Request moves to "In Transit"

**Status:** `picked_up`

---

### Phase 4: Delivery Verification (Traveller + Receiver)

**User Action:**

1. Traveller meets receiver at agreed location (coordinated via phone)
2. Receiver provides delivery OTP (shared by sender)
3. Traveller → Active requests → "In Transit"
4. Traveller taps "Mark as Delivered" → `VerifyDeliveryOtpModal`
5. Traveller enters receiver's delivery OTP

**Frontend Flow:**

```typescript
const handleVerifyDelivery = async (otp: string) => {
  const isValid = await verifyDeliveryOtp(selectedRequestId, otp);
  if (isValid) {
    Alert.alert("Success", "Parcel marked as delivered!");
    await getAcceptedRequests(user.id);
  }
  return isValid;
};
```

**RPC Call:**

```typescript
const { data, error } = await supabase.rpc("verify_delivery_otp", {
  request_id: requestId,
  otp: otp,
});
const isValid = data as boolean;
```

**Success Flow:**

1. ✅ OTP validated
2. ✅ Status → `delivered`, `delivered_at` set
3. ✅ Delivery OTP cleared
4. ✅ **Trigger fires**: `check_trip_completion_on_delivery` → calls `check_parcel_request_completion()`
5. ✅ If all parcels on trip delivered → trip status → `completed`

**Status:** `delivered`

---

## OTP System Architecture

### OTP Generation

**Pickup OTP:**

- **When:** Traveller calls `rpc('generate_pickup_otp', { request_id })` after acceptance
- **Expiry:** 24 hours
- **Storage:** `pickup_otp`, `pickup_otp_expires_at`

**Delivery OTP:**

- **When:** `verify_pickup_otp()` succeeds
- **Expiry:** 72 hours
- **Storage:** `delivery_otp`, `delivery_otp_expires_at`

### OTP Verification

**RPCs return `BOOLEAN`:**

```sql
-- verify_pickup_otp(request_id UUID, otp VARCHAR(6)) RETURNS BOOLEAN
-- verify_delivery_otp(request_id UUID, otp VARCHAR(6)) RETURNS BOOLEAN
```

**Validation steps (inside RPC):**

1. Request exists
2. OTP matches stored value
3. OTP not expired
4. Update status + timestamps + clear OTP(s)
5. Return `TRUE` / `FALSE`

**Frontend handles errors:**

```typescript
if (!isValid) {
  setError("Invalid or expired OTP. Please try again.");
}
```

---

## Status Transitions

```
┌─────────┐
│ pending │ ← Initial state
└────┬────┘
     │
     ├─→ accepted ← Traveller calls generate_pickup_otp()
     │   └─→ picked_up ← verify_pickup_otp() succeeds
     │       └─→ delivered ← verify_delivery_otp() succeeds
     │
     └─→ rejected ← Traveller rejects (sets rejected_at)
        └─→ cancelled ← Sender cancels pending/accepted
```

**Valid transitions:**

| From        | To          | Trigger                     |
| ----------- | ----------- | --------------------------- |
| `pending`   | `accepted`  | `generate_pickup_otp()` RPC |
| `pending`   | `rejected`  | Traveller rejects           |
| `accepted`  | `picked_up` | `verify_pickup_otp()`       |
| `picked_up` | `delivered` | `verify_delivery_otp()`     |

**Triggers fire automatically:**

- Slot updates (`update_trip_slots_on_request_status`)
- Trip completion (`check_trip_completion_on_delivery`)
- Rejected timestamp (`set_rejected_at_trigger`)

---

## Database Operations

**Traveller's incoming requests:**

```sql
SELECT
  pr.*,
  p.full_name AS sender_name,
  p.rating AS sender_rating
FROM parcel_requests pr
JOIN profiles p ON p.id = pr.sender_id
JOIN trips t ON t.id = pr.trip_id
WHERE t.traveller_id = 'traveller-uuid'
  AND pr.status = 'pending'
ORDER BY pr.created_at;
```

**Active deliveries (traveller):**

```sql
SELECT
  pr.*,
  t.source, t.destination, t.departure_date
FROM parcel_requests pr
JOIN trips t ON t.id = pr.trip_id
WHERE t.traveller_id = 'traveller-uuid'
  AND pr.status IN ('accepted', 'picked_up')
ORDER BY pr.updated_at DESC;
```

---

## Frontend Implementation

**Key Components:**

1. **`DeliveryCard.tsx`**: Shows current status and action buttons
2. **`VerifyPickupOtpModal.tsx`**: 6-digit OTP input + error display
3. **`VerifyDeliveryOtpModal.tsx`**: Same pattern for delivery

**requestStore actions:**

```typescript
acceptRequest: async (requestId) => {
  const otp = await supabase.rpc('generate_pickup_otp', { request_id: requestId });
  // Refresh lists
},

verifyPickupOtp: async (requestId, otp) => {
  const { data } = await supabase.rpc('verify_pickup_otp', {
    request_id: requestId,
    otp: otp
  });
  return data as boolean;
}
```

---

## Testing Guide

### Manual Happy Path

1. **Create request** → status `pending`
2. **Accept** → call `generate_pickup_otp()` → status `accepted`, pickup_otp generated
3. **Verify pickup** → `verify_pickup_otp(correct_otp)` → status `picked_up`, delivery_otp generated
4. **Verify delivery** → `verify_delivery_otp(correct_otp)` → status `delivered`, trip auto-completes

### Test Invalid Cases

```sql
-- Test expired OTP
UPDATE parcel_requests SET pickup_otp_expires_at = NOW() - INTERVAL '1 hour';
SELECT verify_pickup_otp('request-id', '123456'); -- FALSE
```

### Check Trip Completion

```sql
SELECT
  COUNT(*) FILTER (WHERE status != 'rejected') AS total,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered
FROM parcel_requests WHERE trip_id = 'trip-uuid';
```

---

## Troubleshooting

### Pickup OTP Not Generated

**Check:** `generate_pickup_otp()` RPC was called after `status = 'accepted'`.

### Delivery OTP Not Generated

**Check:** `verify_pickup_otp()` returned `TRUE`.

### Modal Shows "Invalid OTP" But OTP Is Correct

```sql
-- Check expiry
SELECT pickup_otp, pickup_otp_expires_at > NOW() AS valid
FROM parcel_requests WHERE id = 'request-uuid';
```

**Fix:** Ensure frontend trims OTP (`otp.trim()`) and sends as string.

### Trip Not Auto-Completing

```sql
-- Verify trigger fired
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'parcel_requests'
  AND trigger_name = 'check_trip_completion_trigger';
```

---

**End of Delivery Flow Documentation**

```

```
````
