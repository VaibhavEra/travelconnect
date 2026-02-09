## Issues Resolved

### Issue #3 - Implement request expiry logic ✅

**Type:** Critical - Backend Logic  
**Priority:** CRITICAL  
**Time:** 1.5 hours  
**Date:** 2026-02-09

**Problem:**
Pending requests were not automatically expiring when trips transitioned to `in_progress`. Travelers never accepted/rejected these requests, leaving them in limbo.

**Backend Changes (Applied via Supabase SQL Editor - 2026-02-09):**

1. **`expire_pending_requests_on_trip_start_row()` function** (Created)
   - **Purpose:** Row-level trigger function to expire pending requests
   - **Logic:** When trip moves to `in_progress`, all `pending` requests → `expired`
   - **Condition:** Only fires on transition FROM `upcoming`/`locked` TO `in_progress`

2. **`expire_pending_on_trip_start_trigger` trigger** (Created)
   - **Purpose:** Automatically calls expiry function when trip status changes
   - **Target:** `trips` table
   - **Timing:** AFTER UPDATE
   - **Condition:** `NEW.status = 'in_progress' AND OLD.status != 'in_progress'`

**How It Works:**

### Automatic Flow (via Cron Job)

1. `transition-trips-to-in-progress` cron job runs every 5 minutes
2. Identifies trips with `departure_date + departure_time <= NOW()`
3. Updates trip status: `upcoming`/`locked` → `in_progress`
4. **Trigger fires automatically** when trip status changes
5. All `pending` requests on that trip → `expired`

### Manual Flow (Direct Update)

```sql
UPDATE trips SET status = 'in_progress' WHERE id = '<trip_id>';
```

- Trigger fires automatically
- Pending requests expire instantly

**Status Behavior Summary:**

| Request Status | Trip Transitions to in_progress | Result            |
| -------------- | ------------------------------- | ----------------- |
| pending        | ✓ Trigger fires                 | → expired         |
| accepted       | ✓ Trigger fires                 | → stays accepted  |
| picked_up      | ✓ Trigger fires                 | → stays picked_up |
| delivered      | ✓ Trigger fires                 | → stays delivered |
| cancelled      | ✓ Trigger fires                 | → stays cancelled |
| rejected       | ✓ Trigger fires                 | → stays rejected  |

**Only `pending` requests are affected.**

**Testing:**

- ✅ Test 1: Pending requests expire on trip start - PASSED
- ✅ Test 2: Accepted requests remain accepted - PASSED
- ✅ Test 3: Mixed statuses - only pending expire - PASSED
- ✅ Test 4: No expiry from invalid transitions - PASSED
- ✅ Visual verification test - PASSED

**Acceptance Criteria:**

- ✅ When trip moves to `in_progress`, all `pending` requests become `expired`
- ✅ Requests in other statuses are NOT affected
- ✅ Expired requests visible in sender's my-requests tab
- ✅ Works automatically via cron job
- ✅ Works manually via direct UPDATE
- ✅ No duplicate triggers or functions

**Frontend Changes:**

- **None required** - `expired` status already exists in types
- `requestStore.getMyRequests()` already fetches all statuses including `expired`
- Status filters in UI already handle `expired` display

**Type Updates:**

- **None required** - `expired` already defined in `requeststatus` enum

**Database Objects Created:**

1. Function: `expire_pending_requests_on_trip_start_row()`
2. Trigger: `expire_pending_on_trip_start_trigger` on `trips` table

**Related Issues:**

- Depends on: Issue #1 (Trip status transitions) ✅ Resolved
- Blocks: Issue #17, #18 (Request filtering logic)

---

### Issue #29 - Verify RLS policy for receiver details ✅

**Type:** Security Verification  
**Time:** 15 minutes  
**Action:** Verified RLS policy exists via Supabase Dashboard SQL query. Policy confirmed: `UPDATE` on `parcel_requests` restricted by `status NOT IN ('delivered')`.

---

### Issue #27 - Restrict updateTrip() to whitelist editable fields ✅

**Type:** Security - Frontend Whitelist  
**Time:** 2 hours  
**What we did:**

- Created `updateTripGeneralFields()` method with strict field whitelist
- **Allowed fields:** `parcel_size_capacity`, `allowed_categories`, dates, `pnr_number`, `ticket_file_url`, `notes`
- **Blocked fields:** `source`, `destination`, `transport_mode`, `traveller_id`, `status`
- Added `EditableGeneralTripFields` type for type safety
- Deprecated `updateTrip()` - routes to new methods temporarily (remove in #11)

---

### Issue #4 - Remove 24h editing restriction ✅

**Type:** Business Logic - Backend + Frontend  
**Time:** 3 hours

**Backend Changes (Applied via Supabase Dashboard):**

- Updated `can_edit_trip()` function - removed 24h buffer, now only checks pickup status
- Updated `can_edit_trip_dates()` function - delegates to `can_edit_trip()` for consistency
- Added RLS policy: `traveller_update_general_fields_before_acceptance`
- Added RLS policy: `traveller_update_dates_before_pickup`

**Frontend Changes:**

- Added `updateTripDates()` method for date-only edits (allowed after acceptance, before pickup)
- Updated permission logic in `tripStore.ts`

**New Edit Rules:**

- **Before acceptance:** Can edit size, categories, dates, ticket, PNR, notes
- **After acceptance (before pickup):** Can edit dates only
- **After pickup:** Cannot edit anything
- **Never editable:** source, destination, transport_mode, traveller_id, status

---

### Issue #2 - Remove 24h cancellation restriction ✅

**Type:** Critical - Business Logic - Backend  
**Priority:** CRITICAL  
**Time:** 1.5 hours  
**Date:** 2026-02-09

**Problem:**

- `cancel_request_with_validation()` blocked cancellations within 24 hours of departure
- `prevent_cancellation_with_pickups` trigger blocked trip cancellation even with OTP verification
- Users couldn't cancel requests/trips in legitimate scenarios

**Backend Changes (Applied via Supabase SQL Editor - 2026-02-09):**

1. **`cancel_request_with_validation()` function** (Updated)
   - **Removed:** 24-hour time restriction logic
   - **Removed:** `v_departure_datetime` and `v_hours_until_departure` variables
   - **Simplified:** Status check now only verifies `pending` or `accepted` (blocks `picked_up` directly)
   - **Kept:** All authorization checks (sender/traveller verification)

2. **`prevent_cancellation_with_pickups` trigger** (Dropped)
   - Completely removed - was blocking OTP-based emergency cancellations

3. **`prevent_cancellation_with_pickups()` function** (Dropped)
   - Completely removed along with trigger

4. **`validate_status_transition()` function** (Updated)
   - **Added:** Logic to allow cascade cancellation of `picked_up` requests
   - **Added:** Check for trip status to differentiate cascade vs direct cancellation
   - **Kept:** All other status transition validations

**New Cancellation Rules:**

| Scenario                          | Before Fix | After Fix ✅         |
| --------------------------------- | ---------- | -------------------- |
| Cancel pending request            | ✓ Allowed  | ✓ Allowed            |
| Cancel accepted request (<24h)    | ❌ Blocked | ✅ Allowed           |
| Cancel picked_up request directly | ❌ Blocked | ❌ Blocked (correct) |
| OTP-based trip cancellation       | ❌ Blocked | ✅ Allowed           |

**OTP-Based Cancellation Flow:**

1. Traveller calls `generate_cancellation_otp(request_id)` (backend)
2. 6-digit OTP generated with 24h expiry
3. Traveller shares OTP with sender
4. Traveller calls `verify_cancellation_otp_and_cancel_trip(trip_id, otp)` (backend)
5. Both trip and request are cancelled

**Testing:**

- ✅ Test 1: Cancel pending request - PASSED
- ✅ Test 2: Cancel accepted request within 24h - **PASSED (KEY FIX)**
- ✅ Test 3: Try to cancel picked_up request - PASSED (properly blocked)
- ✅ Test 4: OTP-based trip cancellation - PASSED

**Acceptance Criteria:**

- ✅ Requests can be cancelled anytime before pickup (no 24h restriction)
- ✅ Requests CANNOT be cancelled after pickup (without OTP)
- ✅ Trip can be cancelled via OTP even with picked_up parcels
- ✅ Cascade cancellation still works

**Frontend Changes:**

- None required - `cancelRequest()` in `requestStore.ts` already calls updated backend function

**Type Updates:**

- None required - function signatures unchanged

---

### Issue #1 - Fix trip status transitions (Critical) ✅

**Type:** Critical Bug - Backend Logic  
**Priority:** CRITICAL  
**Time:** 4 hours

**Problem:**
Trip status was incorrectly transitioning to `in_progress` when parcel was picked up, instead of when departure time passed. This broke the locking/unlocking logic and prevented travelers from accepting new requests after a cancellation.

**Backend Changes (Applied via Supabase SQL Editor - 2026-02-09):**

#### New Triggers Created:

1. **`unlock_trip_on_all_cancellations`**
   - **Purpose:** Automatically unlocks trip when all accepted requests are cancelled/rejected
   - **Logic:** Checks if no active requests (`accepted` or `picked_up`) remain, then changes trip from `locked` → `upcoming`
   - **Condition:** Only runs if departure time hasn't passed yet

#### Modified Functions:

2. **`update_trip_status_from_requests`** (Updated)
   - **Removed:** Logic that moved trip to `in_progress` on pickup
   - **Kept:** Auto-complete logic (all parcels delivered → `completed`)
   - **Kept:** Auto-expire logic (arrival passed with no active requests → `expired`)

3. **`expire_old_requests`** (Enhanced)
   - Added expiry for `in_progress` trips past arrival time with no active requests

#### New Cron Job:

4. **`transition-trips-to-in-progress`**
   - **Schedule:** Every 5 minutes (`*/5 * * * *`)
   - **Logic:** Moves trips from `upcoming` or `locked` → `in_progress` when departure time passes
   - **Replaces:** Old `auto-transition-trips` job (was running every minute)

#### Cleanup:

- **Removed:** `trigger_auto_complete_trip` (duplicate logic)
- **Removed:** `update_trip_status_trigger` (duplicate trigger)
- **Removed:** `auto-transition-trips` cron job (too frequent)

**New Status Flow:**

| Event                               | Old Behavior            | New Behavior ✓                |
| ----------------------------------- | ----------------------- | ----------------------------- |
| Request accepted                    | Trip → `locked`         | ✓ Same (correct)              |
| Request picked up                   | Trip → `in_progress` ❌ | Trip stays `locked` ✓         |
| All requests cancelled              | Trip stays `locked` ❌  | Trip → `upcoming` ✓           |
| Departure time passes               | Manual only ❌          | Trip → `in_progress` (auto) ✓ |
| All parcels delivered               | Trip → `completed`      | ✓ Same (correct)              |
| Arrival passed (no active requests) | No expiry ❌            | Trip → `expired` ✓            |

**Testing:**

- ✅ All 6 integration tests passed
- ✅ Verified cron job scheduled correctly
- ✅ Confirmed no duplicate triggers/functions

**Impact:**

- ✓ Travelers can now accept new requests after cancellations
- ✓ Trip status accurately reflects travel timeline
- ✓ Automatic cleanup of expired trips
- ✓ Consistent status transitions across all scenarios

**Frontend Changes:**

- None required (status transitions handled entirely by backend)

**Type Updates:**

- None required (no schema changes)

---

## Technical Implementation

### Files Changed

- `stores/tripStore.ts` - Core implementation (Issues #4, #27)
- `stores/requestStore.ts` - No changes required (Issues #2, #3)

### Backend (No Migration Files)

Backend changes applied manually via Supabase SQL Editor:

- **2026-02-08:** Issues #4, #27 (permission functions + RLS policies)
- **2026-02-09 (Morning):** Issue #1 (triggers, cron job, function updates)
- **2026-02-09 (Evening):** Issue #2 (cancellation logic, trigger removal, validation update)
- **2026-02-09 (Night):** Issue #3 (request expiry trigger, function)

No migration files created to avoid conflicts with production database.

### Security Architecture

- **Frontend:** Field whitelisting prevents malicious updates
- **Database:** RLS policies enforce restrictions at row level
- **Functions:** Permission checks validate business logic
- **Triggers:** Automatic status transitions maintain data integrity
- **Cron Jobs:** Time-based transitions ensure accurate trip lifecycle
- **OTP Verification:** Secure cancellation flow for emergency scenarios
