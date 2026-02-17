## Issues Resolved

### Issue #5 - Align backend validation with Zod schemas (notes removal) ✅

**Type:** Backend Validation + Schema Cleanup  
**Priority:** HIGH  
**Time:** 30–45 minutes  
**Date:** 2026-02-10

**Problem:**

- Backend `create_trip_with_validation()` still accepted a `p_notes` parameter and wrote to `trips.notes`.
- Frontend Zod schemas and flows are moving away from a free-form `notes` field.
- This mismatch risked inconsistent validation and an unnecessary nullable column.

**Backend Changes (Applied via Supabase SQL Editor - 2026-02-10):**

1. **`create_trip_with_validation()` function** (Updated)
   - **Removed parameter:** `p_notes text DEFAULT NULL`.
   - **Updated INSERT:** no longer inserts into a `notes` column.
   - **Validation preserved:**
     - Departure datetime parsed from `p_departure_date` + `p_departure_time` and must be at least 1 hour in the future.
     - Arrival datetime parsed from `p_arrival_date` + `p_arrival_time` and must be strictly after departure.
     - `p_parcel_size_capacity` must be one of `'small' | 'medium' | 'large'`.
     - `p_transport_mode` must be one of `'flight' | 'train' | 'bus' | 'car'`.
     - `p_allowed_categories` must be a non-empty array.
     - `p_source` and `p_destination` must be different (case-insensitive, trimmed).

2. **`trips` table schema** (Updated)
   - **Dropped column:** `notes`.
   - Verified via `information_schema.columns` that `notes` no longer exists.

3. **Function overload cleanup**
   - Dropped legacy function signature that still included `p_notes`.
   - Recreated the canonical `create_trip_with_validation` with the new parameter list only.

**How It Works Now:**

- Frontend calls `create_trip_with_validation` with:
  - `p_source`, `p_destination`
  - `p_departure_date`, `p_departure_time`
  - `p_arrival_date`, `p_arrival_time`
  - `p_transport_mode`
  - `p_parcel_size_capacity`
  - `p_pnr_number`
  - `p_ticket_file_url`
  - `p_allowed_categories`
- Backend:
  - Ensures the user is authenticated via `auth.uid()`.
  - Validates datetime formats and business rules (future departure, arrival after departure).
  - Validates enums and arrays.
  - Inserts a new row into `trips` **without any `notes` column** and returns the new `id`.

**Testing:**

- ✅ SQL-level test:
  - Called `create_trip_with_validation(...)` directly from SQL editor with valid data.
  - Received a valid UUID `trip_id`.
  - Confirmed row inserted into `trips` with correct values and no `notes` column.
- ✅ App-level test:
  - Created a trip from the frontend UI.
  - Trip created successfully; no errors about `p_notes` or missing column.
  - New trip appears correctly in “My Trips”.

**Acceptance Criteria:**

- ✅ `create_trip_with_validation()` no longer has a `p_notes` parameter.
- ✅ `trips` table no longer has a `notes` column.
- ✅ Trip creation works via SQL and via the app.
- ✅ Backend validation behavior is consistent with Zod expectations (dates, enums, categories).
- ✅ No runtime errors related to `notes`.

**Frontend Changes:**

- **Deferred to Issue #7 (notes removal / cleanup):**
  - `Trip` type in `tripStore.ts` still has `notes: string | null`.
  - `EditableGeneralTripFields` still includes `notes` with a TODO.
  - `createTrip()` in `tripStore` still conditionally passes `p_notes` in `rpcParams`.
  - UI components may still show notes fields.

These will be removed/refactored in Issue #7, together with a **regeneration of `database.types.ts`** so the generated `trips` row type no longer includes `notes`.

**Type Updates:**

- **Not yet regenerated.**
  - `Database["public"]["Tables"]["trips"]["Row"]` still includes `notes` until types are regenerated.
  - Type regeneration is planned with the frontend cleanup (Issue #7) to avoid breaking the current UI.

**Database Objects Touched:**

1. Function: `create_trip_with_validation(...)` (signature and body updated).
2. Table: `trips` (dropped `notes` column).
3. Legacy function variant with `p_notes` (dropped).

**Related Issues:**

- Depends on: Issue #1 (trip status behavior stable) ✅
- Blocks:
  - Issue #7 (frontend removal of notes field, forms + types).
  - Issue #19 (my-requests detail UI consistency – no stray notes usage).

---

### Issue #7 - Remove notes field from frontend ✅

**Type:** Frontend Cleanup + Type Regeneration  
**Priority:** MEDIUM  
**Time:** 2-3 hours  
**Date:** 2026-02-11

**Problem:**

- Backend already removed `notes` column and `p_notes` parameter (Issue #5)
- Frontend still had references to `notes` in validation schemas, types, stores, and UI
- Type mismatch between database schema and TypeScript types
- Dead code in forms and components

**Frontend Changes (Applied via GitHub PR - 2026-02-11):**

1. **`lib/validations/trip.ts`** (Updated)
   - **Removed:** `notes` field from `tripSchema`
   - **Removed:** `notes` from `formatTripForDatabase()` helper
   - **Kept:** All date/time validation logic unchanged

2. **`lib/validations/trip-edit.ts`** (Updated)
   - **Removed:** `notes` field from `tripDetailsSchema`
   - **Kept:** `tripDatesSchema` unchanged (no notes there)

3. **`stores/tripStore.ts`** (Updated)
   - **Removed:** `notes: string | null` from `Trip` type
   - **Removed:** `notes` from `EditableGeneralTripFields` type
   - **Removed:** Conditional `p_notes` logic from `createTrip()` method
   - **Removed:** `notes` mapping from `normalizeTrip()` helper
   - **Updated:** `allowedFields` whitelist in `updateTripGeneralFields()` (removed notes)

4. **`app/create-trip.tsx`** (Updated)
   - **Removed:** `notes: ""` from form `defaultValues`
   - **Removed:** `notes: ""` from form `reset()` call

5. **`components/trip/EditTripDetailsModal.tsx`** (Updated)
   - **Removed:** `notes: trip.notes || ""` from `defaultValues`
   - **Removed:** `notes: data.notes || null` from `updateTrip()` call
   - **Removed:** Entire `<Controller>` block for notes `<TextInput>` field

**Type Regeneration (Direct commit to main - 2026-02-11):**

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

---

### Issue #8 - Store files locally until form submission ✅

**Type:** Frontend Enhancement - File Upload Pattern  
**Priority:** HIGH  
**Time:** 2-3 hours  
**Date:** 2026-02-12

**Problem:**

Files were being uploaded immediately to Supabase storage when users selected them, causing:

- Orphaned files in storage when forms were abandoned
- Wasted storage space and bandwidth
- Unnecessary uploads for users who changed their mind
- Poor UX (waiting during file selection instead of instant preview)

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`lib/utils/fileUpload.ts`** (Updated)
   - **Added:** `uploadFile()` wrapper function for simpler upload interface
   - **Interface:** Accepts local URI + bucket type → returns public URL
   - **Logic:** Extracts file metadata, determines MIME type, calls existing `uploadTicketFile()`
   - **Kept:** Existing `uploadTicketFile()` for backward compatibility

2. **`components/forms/FileUploadButton.tsx`** (Updated)
   - **Removed:** Immediate upload on file selection
   - **Changed:** Now stores local `file://` URI in state
   - **Removed:** `userId` prop (not needed until upload)
   - **Updated:** Button text from "Upload Ticket" → "Select Ticket"
   - **Preview:** Works from local URIs instantly

3. **`components/forms/ImagePicker.tsx`** (Updated)
   - **Removed:** All inline Supabase upload logic
   - **Changed:** Now stores array of local `file://` URIs
   - **Removed:** `uploadImage()` function entirely
   - **Added:** `isSelecting` state for gallery loading indicator
   - **Preview:** Works from local URIs instantly

4. **`app/create-trip.tsx`** (Updated)
   - **Added:** `uploadFile` import
   - **Added:** `isSubmitting` state for upload progress
   - **Updated:** `onSubmit()` uploads ticket file before calling `createTrip()`
   - **Added:** Upload error handling with user-friendly alerts
   - **Updated:** Form disabled state includes `isSubmitting`
   - **Removed:** `userId` prop from FileUploadButton component

5. **`app/explore/request-form.tsx`** (Updated)
   - **Added:** `uploadFile` import
   - **Added:** `isSubmitting` state for upload progress
   - **Updated:** `onSubmit()` uploads all parcel photos in parallel
   - **Added:** Upload error handling with user-friendly alerts
   - **Updated:** Form disabled state includes `isSubmitting`
   - **Future-proof:** Supports mix of local URIs and existing URLs (for edit functionality)

**How It Works Now:**

#### File Selection Flow

```
User selects file
    ↓
Expo copies to device cache (file://...)
    ↓
Component stores URI string in React state
    ↓
Preview renders from local cache (instant)
    ↓
[User continues filling form]
    ↓
User clicks Submit
    ↓
Form calls uploadFile(uri, bucket)
    ↓
File uploaded to Supabase storage
    ↓
Public URL returned
    ↓
Backend RPC called with URL
    ↓
✅ No orphaned files!
```

#### Cache Management

**iOS:** `/var/mobile/Containers/Data/Application/{APP_ID}/Library/Caches/`  
**Android:** `/data/data/{PACKAGE_NAME}/cache/`

- Files automatically created by Expo when user picks them
- Sandboxed (app-only access)
- Ephemeral (OS manages cleanup)
- We only store URI reference string
- When form is abandoned, URI forgotten → no Supabase orphans

**Benefits:**

✅ **No orphaned files** - Upload only on confirmed submission  
✅ **Instant preview** - No network latency during selection  
✅ **Reduced bandwidth** - Only upload final selections  
✅ **Better UX** - No waiting, no loading spinners during selection  
✅ **Graceful errors** - User can retry without re-selecting files  
✅ **Lower costs** - Reduced Supabase storage usage  
✅ **Industry standard** - Pattern used by WhatsApp, Instagram, Gmail

**Testing:**

- ✅ Test 1: File selection shows instant preview (no upload) - PASSED
- ✅ Test 2: Form abandonment leaves no orphaned Supabase files - PASSED
- ✅ Test 3: Form submission uploads successfully - PASSED
- ✅ Test 4: Upload errors show user-friendly alerts - PASSED
- ✅ Test 5: Works with camera photos - PASSED
- ✅ Test 6: Works with gallery selection - PASSED
- ✅ Test 7: Works with document picker (PDFs) - PASSED
- ✅ Test 8: Multiple images upload in parallel - PASSED

**Acceptance Criteria:**

- ✅ Files upload to Supabase only on form submission
- ✅ No orphaned files in Supabase storage when forms abandoned
- ✅ Preview works from local files immediately (no network delay)
- ✅ Upload errors are handled gracefully with retry capability
- ✅ Works with all file sources (camera, gallery, documents)
- ✅ Consistent pattern across FileUploadButton and ImagePicker

**Frontend Changes:**

- `lib/utils/fileUpload.ts` - Added `uploadFile()` wrapper
- `components/forms/FileUploadButton.tsx` - Store local URIs only
- `components/forms/ImagePicker.tsx` - Store local URIs only
- `app/create-trip.tsx` - Upload on submit
- `app/explore/request-form.tsx` - Upload on submit (parallel)

**Type Updates:**

- None required - function signatures use existing types

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Completes with: Issue #9 (ImagePicker refactor)
- Improves: Storage cost management
- Enhances: User experience (instant feedback)

---

### Issue #9 - ImagePicker refactor to defer uploads ✅

**Type:** Frontend Refactor - Component Enhancement  
**Priority:** HIGH  
**Time:** 1-2 hours  
**Date:** 2026-02-12

**Problem:**

ImagePicker component was uploading images immediately to Supabase storage during selection, causing the same issues as FileUploadButton:

- Orphaned files in storage bucket when users changed their mind
- Inconsistent pattern between FileUploadButton and ImagePicker
- No way for parent components to control upload timing
- Duplicate upload logic in component instead of centralized utility

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`components/forms/ImagePicker.tsx`** (Complete Refactor)
   - **Removed:** All Supabase import and upload logic
   - **Removed:** `uploadImage()` function (was uploading immediately)
   - **Changed:** `takePhoto()` now returns local URI only
   - **Changed:** `pickFromGallery()` now returns local URIs only
   - **Added:** `isSelecting` state for gallery multi-select loading
   - **Updated:** Preview works from local `file://` URIs
   - **Kept:** All permission checks (camera, gallery)
   - **Kept:** UI/UX (progress text, warnings, validation)

2. **`app/explore/request-form.tsx`** (Integration)
   - **Responsibility:** Handles upload in `onSubmit()` using `uploadFile()` utility
   - **Pattern:** Same as create-trip.tsx for consistency
   - **Parallel uploads:** Uses `Promise.all()` for efficiency
   - **Error handling:** Graceful alerts with retry capability

**How It Works Now:**

#### Component Responsibility

**Before (Bad Pattern):**

```
ImagePicker.tsx:
  - Select images
  - Upload to Supabase ❌
  - Return public URLs
  - Parent just receives URLs
```

**After (Good Pattern):**

```
ImagePicker.tsx:
  - Select images
  - Return local URIs
  - Parent decides when to upload ✓

request-form.tsx:
  - Receives local URIs from ImagePicker
  - User fills rest of form
  - On submit: uploads all URIs
  - Calls backend with public URLs ✓
```

#### Parallel Upload Implementation

```typescript
// In request-form.tsx onSubmit()
const photoUrls = await Promise.all(
  data.parcel_photos.map((uri) => {
    if (uri.startsWith("file://")) {
      return uploadFile(uri, "parcel-photos");
    }
    return uri; // Already a public URL (future-proof for edits)
  }),
);
```

**Benefits:**

✅ **Consistent pattern** - Matches FileUploadButton implementation  
✅ **Centralized upload logic** - Uses shared `uploadFile()` utility  
✅ **Parent control** - Forms decide when to upload  
✅ **No orphaned files** - Only upload on form submission  
✅ **Better separation of concerns** - Component handles selection, parent handles upload  
✅ **Future-proof** - Supports mix of local/remote URIs for edit functionality

**Testing:**

- ✅ Test 1: Camera photo shows instant preview (no upload) - PASSED
- ✅ Test 2: Gallery selection shows instant preview (no upload) - PASSED
- ✅ Test 3: Multiple images preview correctly - PASSED
- ✅ Test 4: Form abandonment leaves no orphaned files - PASSED
- ✅ Test 5: Form submission uploads all images in parallel - PASSED
- ✅ Test 6: Upload error shows user-friendly alert - PASSED
- ✅ Test 7: Remove image works correctly - PASSED
- ✅ Test 8: Exact count validation (2 photos) works - PASSED

**Acceptance Criteria:**

- ✅ ImagePicker uses expo-image-picker (was already using it)
- ✅ Selected images stored as local URIs (not uploaded immediately)
- ✅ Upload handled by parent component using fileUpload utils
- ✅ Consistent implementation with FileUploadButton pattern
- ✅ Preview works from local cache instantly
- ✅ No duplicate upload logic in component

**Frontend Changes:**

- `components/forms/ImagePicker.tsx` - Removed upload logic, store URIs only
- `app/explore/request-form.tsx` - Added parallel upload in onSubmit

**Type Updates:**

- None required - component props unchanged

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Completes with: Issue #8 (FileUploadButton defer uploads)
- Depends on: Issue #8 (uploadFile utility created)
- Pattern consistency: Both file components now follow same approach

---

### Issue #10 - Add expired filter to my-trips tab ✅

**Type:** Frontend Refactor - Filter Configuration  
**Priority:** MEDIUM  
**Time:** 1 hour  
**Date:** 2026-02-12

**Problem:**

My-trips tab was missing the **expired** filter, preventing users from viewing trips that had expired (arrival time passed with no active requests). Additionally, the screen maintained its own local filter configuration instead of using the shared constant from `lib/constants/filters.ts`, creating code duplication and maintenance overhead.

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`lib/constants/filters.ts`** (Updated)
   - **Added:** `expired` filter with `alert-circle` icon and "Expired" label
   - **Added:** `locked` filter with `lock-closed` icon and "Locked" label
   - **Added:** `in_progress` filter with `bicycle` icon and "In Progress" label
   - **Updated:** `TRIP_FILTERS` now includes all 7 trip statuses (was only 4)
   - **Ensured:** Filter array matches all possible trip statuses from backend enum

2. **`app/(tabs)/my-trips/index.tsx`** (Refactored)
   - **Removed:** Local `TripFilter` type definition (7 lines)
   - **Removed:** Local `FILTER_CONFIG` array constant (8 lines)
   - **Added:** Import of shared `TRIP_FILTERS` and `TripFilterKey` from filters.ts
   - **Updated:** Component state to use `TripFilterKey` instead of local `TripFilter`
   - **Updated:** `getFilterCount()` function signature to use `TripFilterKey`
   - **Updated:** Filter chip mapping to reference `TRIP_FILTERS` instead of local config
   - **Eliminated:** 25 lines of duplicate filter configuration code

**How It Works Now:**

#### Filter Configuration (Centralized)

**Before (Duplicated):**

- `lib/constants/filters.ts` - Incomplete TRIP_FILTERS (only 4 statuses)
- `app/(tabs)/my-trips/index.tsx` - Local FILTER_CONFIG (6 statuses, missing expired)

**After (Single Source of Truth):**

- `lib/constants/filters.ts` - Complete TRIP_FILTERS (all 7 statuses)
- `app/(tabs)/my-trips/index.tsx` - Imports shared filters

#### Filter Bar Display

```

┌─────────────────────────────────────────────────────────────────────┐
│ [All] [Upcoming] [Locked] [In Progress] [Completed] [Cancelled] [Expired] │
└─────────────────────────────────────────────────────────────────────┘

```

#### Visual Appearance of Expired Trips

- **Status Banner:** Red background (light opacity) with "Expired" text
- **Icon:** ⚠️ `alert-circle` (red)
- **Opacity:** 100% (fully visible, not dimmed like cancelled trips)
- **Color:** Red from `colors.error` via `TRIP_STATUS_CONFIG`
- **Styling:** Automatically handled by existing `TripCard` component

**Testing:**

- ✅ Test 1: All 7 filters appear in my-trips tab - PASSED
- ✅ Test 2: Clicking "Expired" shows only expired trips - PASSED
- ✅ Test 3: Expired trips display with red banner and alert icon - PASSED
- ✅ Test 4: Filter counts update dynamically for all statuses - PASSED
- ✅ Test 5: TypeScript compiles without errors - PASSED
- ✅ Test 6: No console warnings - PASSED
- ✅ Test 7: Filter state persists when navigating - PASSED
- ✅ Test 8: Trip details navigation works correctly - PASSED

**Acceptance Criteria:**

- ✅ "Expired" filter appears in my-trips tab
- ✅ Clicking "Expired" shows only expired trips
- ✅ Expired trips display with appropriate red styling
- ✅ Filter state persists when navigating away and back
- ✅ Code duplication eliminated via centralized filter config
- ✅ Type safety improved with shared `TripFilterKey` type
- ✅ All trip statuses now have corresponding filters

**Frontend Changes:**

- `lib/constants/filters.ts` - Added expired, locked, in_progress filters (+24 lines)
- `app/(tabs)/my-trips/index.tsx` - Refactored to use shared constants (+1, -25 lines)

**Type Updates:**

- None required - using existing `TripFilterKey` type from filters.ts

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Depends on: Issue #1 (Trip status transitions - expired status exists) ✅ Resolved
- Depends on: Issue #3 (Request expiry logic - automatic expiration) ✅ Resolved
- Improves: Code maintainability and consistency
- Backend already fully supports expired status
- TripCard already handles expired styling via TRIP_STATUS_CONFIG
- No backend or database changes required

**Bonus Improvements:**

- ✅ Centralized filter configuration (single source of truth)
- ✅ Added missing `locked` and `in_progress` filters
- ✅ Improved type safety with shared types
- ✅ Reduced code duplication (eliminated 25 lines)
- ✅ Better maintainability for future filter additions

---

### Issue #17 - Add rejected and expired filters to my-requests tab ✅

**Type:** Frontend Enhancement - Filter Configuration  
**Priority:** MEDIUM  
**Time:** 1 hour  
**Date:** 2026-02-12

**Problem:**

The My Requests tab was missing dedicated filters for **rejected** and
**expired** requests. Rejected requests were implicitly grouped inside
the "Cancelled" filter, and expired requests had no direct filter at
all. This made it hard for senders to quickly see which requests were
rejected by travellers or expired due to trip status changes.

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`lib/constants/filters.ts`** (Updated)
   - **Extended:** `REQUEST_FILTERS` to cover all request statuses from
     the `request_status` enum
   - **Added filters:**
     - `rejected` – label "Rejected", icon `close-circle`
     - `picked_up` – label "Picked Up", icon `cube`
     - `delivered` – label "Delivered", icon `checkmark-done`
     - `cancelled` – label "Cancelled", icon `close`
     - `expired` – label "Expired", icon `hourglass`
   - **Result:** REQUEST_FILTERS now includes:
     `all, pending, accepted, rejected, picked_up, delivered, cancelled, expired`

2. **`app/(tabs)/my-requests/index.tsx`** (Refactored)
   - **Removed:** Local `StatusFilter` union type
   - **Removed:** Local `FILTER_CONFIG` array and custom grouping logic
     (e.g. "in_transit" alias for `picked_up`, "completed" alias for `delivered`,
     "cancelled" including `rejected`/`failed`)
   - **Added:** Import of `REQUEST_FILTERS` and `RequestFilterKey` from
     `lib/constants/filters`
   - **Updated:** State to use `RequestFilterKey` (`filter` state default "all")
   - **Simplified:** Filtering logic to 1:1 status matching:
     - If filter is `"all"` → show all requests
     - Otherwise → `request.status === filter`
   - **Updated:** `getFilterCount()` to mirror the same simple status
     comparison per filter
   - **Kept:** Stats cards, but now backed by the simplified counting logic

**How It Works Now:**

#### Filter Bar

The My Requests tab now exposes a dedicated filter for each status:

```
[All] [Pending] [Accepted] [Rejected] [Picked Up] [Delivered] [Cancelled] [Expired]
```

Each chip shows a count based on the number of matching requests.

#### Status Styling

No changes were required to `RequestCard`. It already uses
`REQUEST_STATUS_CONFIG`, which defines:

- **Rejected:** label "Rejected", icon `close-circle`, `colorKey: "error"`
- **Expired:** label "Expired", icon `alert-circle`, `colorKey: "error"`

So rejected and expired requests automatically render with the correct
badge color and icon once the filters expose them.

**Testing:**

- ✅ Filter bar shows all 8 filters in the My Requests tab
- ✅ "Rejected" filter shows only `status === "rejected"` requests
- ✅ "Expired" filter shows only `status === "expired"` requests
- ✅ Filter counts match the number of requests per status
- ✅ Empty state messages update correctly per active filter
- ✅ Rejected and expired badges render with error color and correct icons
- ✅ Filter selection persists while navigating within the tab
- ✅ No TypeScript errors, no console warnings

**Acceptance Criteria:**

- ✅ Rejected and expired filters available on My Requests tab
- ✅ Each filter accurately reflects the underlying request status
- ✅ Appropriate styling for rejected/expired requests via status badges
- ✅ Filter state behaves consistently with My Trips filter behavior

**Frontend Changes:**

- `lib/constants/filters.ts` – REQUEST_FILTERS expanded to all statuses
- `app/(tabs)/my-requests/index.tsx` – refactored to use shared filters and
  simplified logic

**Type Updates:**

- None – reused existing `RequestFilterKey` from filters.ts

**Database Objects Touched:**

- None – frontend-only change

**Related Issues:**

- Depends on: Issue #3 (Request expiry logic and status transitions) ✅
- Follows pattern from: Issue #10 (centralized trip filter configuration) ✅
- Complements: Issue #13 (UI consistency across cards)

---

### Issue #18 - Display trip cities and arrival time in RequestCard ✅

**Type:** Frontend Bug Fix - Data Display + RLS Policy
**Priority:** HIGH
**Time:** 2-3 hours
**Date:** 2026-02-13

**Problem:**

RequestCard component was not displaying trip source/destination cities and arrival times, showing only departure information. Investigation revealed two issues:

- Incomplete query selections in `requestStore.ts` (missing `id`, `arrival_date`, `arrival_time` from trip)
- RLS infinite recursion error when senders tried to access trip data through their requests
- `parcel_requests` policy referenced `trips`, and `trips` policy referenced `parcel_requests` (circular dependency)

**Backend Changes (Applied via Supabase SQL Editor - 2026-02-13):**

1. **`user_can_view_trip()` function** (Created)
   - **Purpose:** SECURITY DEFINER function to break RLS recursion
   - **Logic:** Checks if user has any requests for the given trip_id
   - **Attributes:** STABLE, SECURITY DEFINER (bypasses RLS during check)
   - **Returns:** boolean (true if user is sender of any request for the trip)

2. **"Users can view trips" RLS policy** (Updated)
   - **Removed:** Direct subquery causing infinite recursion
   - **Added:** Call to `user_can_view_trip(id)` function
   - **Final logic:**
     ```sql
     traveller_id = auth.uid()  -- Travellers see their own trips
     OR (status = 'upcoming' AND departure_date >= CURRENT_DATE)  -- Anyone browses upcoming
     OR user_can_view_trip(id)  -- Senders see trips they've requested
     ```

**Frontend Changes (Applied via GitHub PR - 2026-02-13):**

1. **`stores/requestStore.ts`** (Updated)
   - **Updated `ParcelRequest` interface:**
     - Added `trip.id` field (UUID)
     - Added `trip.arrival_date` field (string)
     - Added `trip.arrival_time` field (string)
   - **Updated 5 query methods** to fetch complete trip data:
     - `createRequest()` - Added id, arrival_date, arrival_time to SELECT
     - `getMyRequests()` - Added id, arrival_date, arrival_time to SELECT
     - `getIncomingRequests()` - Added id, arrival_date, arrival_time to SELECT
     - `getAcceptedRequests()` - Added id, arrival_date, arrival_time to SELECT
     - `getRequestById()` - Added id, arrival_date, arrival_time to SELECT

2. **`components/request/RequestCard.tsx`** (Complete Redesign)
   - **Replaced layout** to match TripCard design pattern
   - **Added:** Status banner at top with colored background
   - **Added:** City columns showing source and destination with dates/times
   - **Added:** Transport mode icon in center with connecting lines
   - **Added:** Animated press effect using Reanimated
   - **Fixed:** Type-safe transport mode icon handling
   - **Removed:** Old two-section layout (route + timing)
   - **Styling:** Now consistent with TripCard (same spacing, colors, typography)

**How It Works Now:**

#### RLS Policy Resolution

**Before (Broken - Infinite Recursion):**

```
parcel_requests policy: "Senders can SELECT WHERE sender_id = auth.uid()"
↓ User queries: SELECT * FROM parcel_requests JOIN trips
trips policy: "Users can view trips WHERE EXISTS (SELECT FROM parcel_requests...)"
↓ RLS evaluates trips policy
↓ Subquery accesses parcel_requests
↓ RLS evaluates parcel_requests policy
↓ Policy references trips again
❌ INFINITE RECURSION ERROR
```

**After (Fixed - SECURITY DEFINER breaks recursion):**

```
parcel_requests policy: "Senders can SELECT WHERE sender_id = auth.uid()"
↓ User queries: SELECT * FROM parcel_requests JOIN trips
trips policy: "Users can view trips WHERE user_can_view_trip(id)"
↓ RLS calls function (SECURITY DEFINER)
↓ Function bypasses RLS, directly checks parcel_requests
✅ Returns boolean, no recursion
```

#### RequestCard Layout

```
┌──────────────────────────────────────────┐
│ [Pending] Status Banner (colored)        │
├──────────────────────────────────────────┤
│                                          │
│  Jaipur        [🚂]         Delhi       │
│  Feb 20, 2026               Feb 20, 2026 │
│  10:00 AM                   3:30 PM      │
│                                          │
├──────────────────────────────────────────┤
│  [📄 Documents]    [📦 Medium]           │
├──────────────────────────────────────────┤
│  View Full Details →                     │
└──────────────────────────────────────────┘
```

#### Data Flow

```
1. User opens My Requests tab
   ↓
2. requestStore.getMyRequests(userId) called
   ↓
3. Supabase query with JOIN on trips table
   ↓
4. RLS checks: sender_id = auth.uid() ✓
   ↓
5. RLS checks: user_can_view_trip(trip_id) ✓
   ↓
6. Returns complete data: request + trip (with cities)
   ↓
7. RequestCard renders with source/destination/arrival
   ✅ Cities displayed correctly!
```

**Testing:**

- ✅ Test 1: RLS policy allows senders to view trip data - PASSED
- ✅ Test 2: No infinite recursion error - PASSED
- ✅ Test 3: Cities display correctly (Jaipur→Delhi, Delhi→Mumbai) - PASSED
- ✅ Test 4: Departure and arrival dates/times shown - PASSED
- ✅ Test 5: Transport icon displays correctly - PASSED
- ✅ Test 6: Card press animation works smoothly - PASSED
- ✅ Test 7: Card styling matches TripCard design - PASSED
- ✅ Test 8: TypeScript compilation passes - PASSED

**Acceptance Criteria:**

- ✅ RequestCard displays source and destination cities
- ✅ RequestCard shows both departure and arrival information
- ✅ RLS policies allow senders to read trip data without recursion
- ✅ Card design matches TripCard for consistency
- ✅ Press animation provides tactile feedback
- ✅ Type-safe transport mode icon handling
- ✅ All 5 query methods fetch complete trip data

**Frontend Changes:**

- `stores/requestStore.ts` - Updated ParcelRequest interface and 5 query methods
- `components/request/RequestCard.tsx` - Complete redesign matching TripCard layout

**Type Updates:**

- `ParcelRequest` interface - Added trip.id, arrival_date, arrival_time fields

**Database Objects Touched:**

1. Function: `user_can_view_trip(uuid)` (created)
2. Policy: "Users can view trips" on trips table (updated)

**Related Issues:**

- Depends on: Issue #13 (Card styling harmonization) ✅ Resolved
- Pattern from: TripCard design (consistent UI)
- Security: Fixes RLS infinite recursion vulnerability

**Technical Details:**

#### Why SECURITY DEFINER Was Necessary

RLS policies are evaluated recursively. When a policy on table A references table B, and table B's policy references table A, PostgreSQL enters an infinite loop. The solution is to use a `SECURITY DEFINER` function that:

1. Executes with superuser privileges (bypasses RLS)
2. Performs the check directly without triggering nested policy evaluation
3. Returns a simple boolean result
4. Breaks the recursion chain

#### Query Performance

The `user_can_view_trip()` function is marked `STABLE`, allowing PostgreSQL to:

- Cache results within a single transaction
- Avoid re-executing for the same trip_id
- Optimize JOIN operations with trips table

**Benefits:**

✅ **Fixed visual bug** - Cities now display correctly in RequestCard
✅ **Resolved RLS recursion** - No more infinite loop errors
✅ **Improved UX** - Consistent card design across tabs
✅ **Type safety** - Complete trip data in TypeScript types
✅ **Security maintained** - Senders can only view trips they've requested
✅ **Performance optimized** - STABLE function allows query caching

---

### Issue #19 - Request details UI improvements (Parts 1 & 2) ✅

**Type**: Frontend Enhancement - Component Extraction + Permission System  
**Priority**: HIGH  
**Time**: 4-5 hours  
**Date**: 2026-02-17

**Problem:**

Request details screen had incomplete data display and non-functional edit buttons. Senders couldn't see trip cities, routes, or schedules, and edit functionality wasn't properly gated by permissions.

**Issues Identified:**

1. **Incomplete Data Display:**
   - Only departure information visible (no cities, arrival times)
   - Trip route not shown (source/destination missing)
   - Transport mode and parcel capacity hidden
   - Senders couldn't see complete journey information

2. **Non-Functional Edit Buttons:**
   - Edit buttons existed but didn't do anything
   - No permission checking (frontend or backend)
   - No validation when editing request details
   - No way to edit receiver contact information

**Solution Implemented:**

#### Part 1: Complete Data Display

**Backend Data Fetching (stores/requestStore.ts):**

- Updated `ParcelRequest` interface to include:
  - `trip.id` (UUID)
  - `trip.arrival_date` (string)
  - `trip.arrival_time` (string)
- Updated 5 query methods to fetch complete trip data:
  - `createRequest()` - Added id, arrival_date, arrival_time
  - `getMyRequests()` - Added id, arrival_date, arrival_time
  - `getIncomingRequests()` - Added id, arrival_date, arrival_time
  - `getAcceptedRequests()` - Added id, arrival_date, arrival_time
  - `getRequestById()` - Added id, arrival_date, arrival_time

**UI Implementation (app/my-requests/[id].tsx):**

- Added vertical route layout showing source/destination cities
- Display departure and arrival dates/times
- Show transport mode with icon
- Display parcel size capacity badge
- Added status banner with colored background
- Improved visual hierarchy with card-based sections
- Show rejection/cancellation reasons when applicable

#### Part 2: Edit Functionality

**Component Extraction:**

1. **`components/request/CancelRequestModal.tsx`** (New, 200 lines)
   - Extracted from inline implementation
   - Accepts `requestStatus` prop instead of `tripDepartureDate`
   - Removed 24h restriction logic (backend validates)
   - Conditional rendering based on status (pending/accepted)
   - User-friendly warning messages

2. **`components/request/EditRequestDetailsModal.tsx`** (New, 350 lines)
   - Edit item description, category, and parcel photos
   - Validate against trip's allowed categories
   - Photo gallery with add/remove functionality
   - Backend permission check (pending status only)
   - Form validation using react-hook-form + Zod

3. **`components/request/EditReceiverDetailsModal.tsx`** (New, 250 lines)
   - Edit delivery contact name and phone
   - Allow edits until delivered status
   - Backend validation via `can_edit_receiver_details` RPC
   - Phone number formatting and validation

**Validation Layer:**

4. **`lib/validations/request-edit.ts`** (New, 50 lines)
   - `requestDetailsEditSchema` - item description, category, photos
   - `receiverDetailsEditSchema` - contact name and phone
   - Shared validation rules match backend RPC constraints

**Store Updates:**

5. **`stores/requestStore.ts`** (Updated)
   - Added `canEditRequestDetails()` method
     - Calls backend RPC `can_edit_request_details(request_id)`
     - Returns boolean based on status (pending only)
   - Added `canEditReceiverDetails()` method
     - Calls backend RPC `can_edit_receiver_details(request_id)`
     - Returns boolean based on status (before delivery)
   - Added `updateReceiverDetails()` method
     - Calls backend RPC `update_receiver_details(request_id, name, phone)`
     - Updates delivery contact information

**Request Details Screen Refactor:**

6. **`app/my-requests/[id].tsx`** (Major Refactor, ~180 lines removed)
   - Removed inline cancel modal implementation
   - Removed unused imports (`useAuthStore`, `user` variable)
   - Added permission state management (`canEditDetails`, `canEditReceiver`)
   - Added `useEffect` hook to check permissions dynamically
   - Conditional edit buttons per section
   - Improved error handling and user feedback
   - Proper TypeScript types throughout

**How It Works Now:**

#### Request Details Screen Layout

```
┌─────────────────────────────────────┐
│ Header (Back + Status Badge)        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ TRIP ROUTE                          │
│ From: Jaipur → To: Delhi            │
│ Depart: Feb 15, 10:00 AM            │
│ Arrive: Feb 15, 12:30 PM            │
│ Transport: Flight                   │
│ Accepts: Medium Parcels             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ PARCEL DETAILS [Edit Icon]          │ ← Conditional
│ Category: Documents                 │
│ Description: Important papers       │
│ Photos: [3 images]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ RECEIVER DETAILS [Edit Icon]        │ ← Conditional
│ Name: John Doe                      │
│ Phone: +91 98765 43210              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [Cancel Request Button]             │ ← If pending/accepted
└─────────────────────────────────────┘
```

#### Permission Logic

| Request Status | canEditDetails | canEditReceiver | What Can Be Edited |
| -------------- | -------------- | --------------- | ------------------ |
| **pending**    | ✓ true         | ✓ true          | Details + Receiver |
| **accepted**   | ❌ false       | ✓ true          | Receiver only      |
| **picked_up**  | ❌ false       | ✓ true          | Receiver only      |
| **delivered**  | ❌ false       | ❌ false        | Nothing            |
| **cancelled**  | ❌ false       | ❌ false        | Nothing            |
| **rejected**   | ❌ false       | ❌ false        | Nothing            |
| **expired**    | ❌ false       | ❌ false        | Nothing            |

**Backend Functions Used:**

- `can_edit_request_details(request_id UUID)` - Returns boolean
- `can_edit_receiver_details(request_id UUID)` - Returns boolean
- `update_request_details(request_id UUID, category TEXT, description TEXT, photos TEXT[])` - Updates and validates
- `update_receiver_details(request_id UUID, name TEXT, phone TEXT)` - Updates contact info

**Testing:**

- ✅ Test 1: Request details screen displays cities and route - PASSED
- ✅ Test 2: Departure and arrival dates/times shown - PASSED
- ✅ Test 3: Transport icon displays correctly - PASSED
- ✅ Test 4: Parcel size capacity badge shown - PASSED
- ✅ Test 5: Edit buttons appear based on permissions - PASSED
- ✅ Test 6: Edit details modal validates and saves - PASSED
- ✅ Test 7: Edit receiver modal validates and saves - PASSED
- ✅ Test 8: Cancel button works for pending/accepted only - PASSED
- ✅ Test 9: Rejection/cancellation reasons display - PASSED
- ✅ Test 10: TypeScript compiles without errors - PASSED
- ✅ Test 11: No unused variables or imports - PASSED

**Acceptance Criteria:**

- ✅ Request details screen shows complete trip information
- ✅ Cities, dates, times visible to sender
- ✅ Transport mode and parcel capacity displayed
- ✅ Edit buttons work with proper permission checks
- ✅ Edit details modal saves successfully (pending only)
- ✅ Edit receiver modal saves successfully (before delivery)
- ✅ Cancel button properly restricted by status
- ✅ Rejection/cancellation reasons display correctly
- ✅ Clean component architecture (extracted modals)
- ✅ Type-safe implementation throughout
- ✅ Consistent styling with other cards (status banner, layout)

**Frontend Changes:**

**New Components:**

- `components/request/CancelRequestModal.tsx` (200 lines)
- `components/request/EditRequestDetailsModal.tsx` (350 lines)
- `components/request/EditReceiverDetailsModal.tsx` (250 lines)

**New Files:**

- `lib/validations/request-edit.ts` (50 lines)

**Updated Files:**

- `app/my-requests/[id].tsx` (major refactor, ~180 lines removed)
- `stores/requestStore.ts` (+3 methods: canEditRequestDetails, canEditReceiverDetails, updateReceiverDetails)
- `types/database.types.ts` (regenerated for new RPC functions)

**Type Updates:**

```typescript
// Updated ParcelRequest interface
interface ParcelRequest {
  // ... existing fields
  trip?: {
    id: string;
    source: string;
    destination: string;
    departure_date: string;
    departure_time: string;
    arrival_date: string; // ← Added
    arrival_time: string; // ← Added
    transport_mode: string;
    parcel_size_capacity: string;
    // ...
  } | null;
}
```

**Database Objects Touched:**

**Functions (Already existed, created in Issue #18 backend work):**

1. `can_edit_request_details(request_id UUID)` - Permission check
2. `can_edit_receiver_details(request_id UUID)` - Permission check
3. `update_request_details(...)` - Update with validation
4. `update_receiver_details(...)` - Update contact info

**No new database objects created** - this issue used existing backend infrastructure.

**Related Issues:**

- Depends on: Issue #18 (RLS policies, data fetching) ✅ Resolved
- Closes: Issue #19 Parts 1 & 2 (completed in PR #43)
- Remaining work: Issue #42 (Parts 3 & 4 - Traveller info + OTP)
- Pattern from: TripCard design (consistent UI)

**Benefits:**

✅ **Complete Information** - Senders see all trip and request details  
✅ **Proper Permissions** - Backend-validated edit gates  
✅ **Better UX** - Card-based layout, clear sections, intuitive editing  
✅ **Maintainable** - Extracted components, shared validation  
✅ **Type Safe** - Complete TypeScript coverage  
✅ **Consistent Design** - Matches TripCard styling patterns  
✅ **Security** - Backend permission checks prevent unauthorized edits  
✅ **User Feedback** - Clear error messages, success confirmations

**Code Quality Improvements:**

- Removed ~180 lines from main screen (extracted to modals)
- Eliminated unused imports and variables
- Centralized validation logic
- Improved error handling
- Better separation of concerns
- Reusable modal components

**Split Decision:**

This issue was **split after Parts 1 & 2 were completed** due to scope size:

- ✅ **Parts 1 & 2** (Cities display + Edit buttons) - **CLOSED in PR #43**
- 🔗 **Parts 3 & 4** (Traveller info + OTP regeneration) - **Moved to Issue #42**

Parts 3 & 4 will add:

- Display traveller contact info after acceptance
- Show ticket file and PNR number
- OTP display sections (pickup and delivery)
- OTP regeneration buttons when expired

---

### Issue #42 - Add OTP regeneration and traveller visibility (Parts 3 & 4 of Issue #19) ✅

**Type**: Frontend Enhancement - OTP Management + Traveller Info  
**Priority**: HIGH  
**Time**: 3-4 hours  
**Date**: 2026-02-17

**Context:**

This issue completes the remaining work from **Issue #19**, which was split after Parts 1 & 2 were merged in **PR #43**.

**Original Issue #19 Breakdown:**

- ✅ **Part 1**: Display departure/arrival cities in request details (**Closed in PR #43**)
- ✅ **Part 2**: Fix edit buttons with proper validation (**Closed in PR #43**)
- ✅ **Part 3 & 4**: Traveller info visibility + OTP regeneration (**This issue - Merged**)

**Problem Statement:**

In the request details page (`my-requests/[id].tsx`):

1. ❌ After acceptance, sender cannot see traveller contact information
2. ❌ Sender cannot access ticket URL or PNR
3. ❌ No way to regenerate expired OTPs (pickup and delivery)

**Current State Before This PR:**

- ✅ Route and cities displayed correctly (from PR #43)
- ✅ Edit buttons working with backend validation (from PR #43)
- ❌ Traveller info hidden (should show after acceptance)
- ❌ Ticket URL not accessible to sender
- ❌ No way to regenerate expired OTPs

**Solution Implementation:**

#### Store Updates (`stores/requestStore.ts`)

Extended the data model to support traveller visibility and OTP management:

- ✅ Extended `ParcelRequest` interface to include:
  - `trip.pnr_number` (string)
  - `trip.ticket_file_url` (string)
  - `trip.traveller` (nested profile with full_name, phone)
- ✅ Updated all request fetch queries to include nested traveller JOIN via RLS policies:
  - `createRequest` - includes traveller data
  - `getMyRequests` - includes traveller data
  - `getRequestById` - includes traveller data with sender profile
- ✅ Added `regeneratePickupOtp(requestId: string): Promise<string>` method
- ✅ Added `regenerateDeliveryOtp(requestId: string): Promise<string>` method

#### Sender Detail Screen (`app/my-requests/[id].tsx`)

Implemented complete post-acceptance information display and OTP management:

#### **1. Traveller Information Card**

- Shows name, phone, and call button
- Visible only when status is `accepted`, `picked_up`, or `delivered`
- Integrated with device phone dialer via `tel:` link

#### **2. Trip Details Enhancement**

- PNR number display
- "View Ticket" button to open ticket file
- Both visible only after acceptance for security

#### **3. Pickup OTP Card** (status = `accepted`)

- Large, readable OTP code display
- Countdown timer showing time remaining (e.g., "2h 30m remaining")
- Helper text: "Share this OTP with the traveller only when they arrive for pickup"
- **Regenerate button** with loading state

#### **4. Delivery OTP Card** (status = `picked_up`)

- Large, readable OTP code display
- Countdown timer showing time remaining
- Helper text: "Share this OTP with the receiver to confirm parcel delivery"
- **Regenerate button** with loading state

#### **5. OTP Regeneration Flow**

- Loading indicators during regeneration (prevents double-clicks)
- Success alerts with haptic feedback
- Error handling with user-friendly messages
- Automatic data refresh after successful regeneration

#### **6. Integration with Existing Features**

- Maintained all existing cancel/edit workflows
- Preserved conditional rendering logic
- Integrated `formatCountdown` utility for expiry display

**Technical Details:**

#### OTP Lifecycle

- **Pickup OTP**:
  - 24-hour expiry from acceptance
  - Generated automatically by `accept_request_atomic` RPC
  - Regenerable via `regenerate_pickup_otp` RPC
- **Delivery OTP**:
  - 72-hour expiry from trip arrival time
  - Generated automatically on pickup via `verify_pickup_otp` RPC
  - Recalculated if trip arrival changes
  - Regenerable via `regenerate_delivery_otp` RPC
- Backend RPC functions handle all expiry enforcement and status transitions
- No frontend expiry logic - display only

#### Security & Data Access

- Nested JOIN for traveller info uses existing RLS policies:
  ```sql
  traveller:profiles!trips_traveller_id_fkey(full_name, phone)
  ```
- Sender can only view their own requests (enforced by RLS)
- PNR and ticket visible only post-acceptance for security
- Traveller phone number revealed only after commitment (acceptance)

#### UI/UX Improvements

- Human-readable countdown timers (e.g., "15m remaining", "2h 30m remaining")
- Regenerate buttons with loading indicators prevent double-clicks
- Call button for direct traveller contact with single tap
- Conditional rendering based on request status ensures clean UI
- Consistent styling with existing components

#### Data Flow

```
Accept Request (Traveller)
  ↓
Backend: Generate Pickup OTP (24h expiry)
  ↓
Sender Screen: Show Traveller Info + Pickup OTP
  ↓
Pickup Verified (Traveller enters OTP)
  ↓
Backend: Generate Delivery OTP (72h from arrival)
  ↓
Sender Screen: Show Delivery OTP
  ↓
Delivery Verified (Receiver enters OTP)
  ↓
Request Status: Delivered ✅
```

**Testing Checklist:**

- ✅ **Acceptance Flow**
  - ✅ Accept request → verify traveller info card appears
  - ✅ Verify PNR and ticket link show after acceptance
  - ✅ Confirm traveller info NOT visible when status = 'pending'

- ✅ **Pickup OTP**
  - ✅ Pickup OTP displays with countdown when status = 'accepted'
  - ✅ Countdown shows correct time remaining
  - ✅ Click regenerate → new OTP generated
  - ✅ Loading state prevents double-clicks
  - ✅ Success alert displayed

- ✅ **Delivery OTP**
  - ✅ After pickup → delivery OTP appears with countdown
  - ✅ Countdown shows correct time remaining
  - ✅ Click regenerate → new OTP generated
  - ✅ Loading state prevents double-clicks
  - ✅ Success alert displayed

- ✅ **Integration Testing**
  - ✅ Existing cancel flow works unchanged
  - ✅ Existing edit flows work unchanged
  - ✅ Call button opens phone dialer
  - ✅ Ticket button opens file viewer

- ✅ **Error Handling**
  - ✅ Network errors show user-friendly alerts
  - ✅ Invalid request ID handled gracefully
  - ✅ RPC errors surface with proper messages

**Backend Dependencies:**

All required RPC functions already exist in the database:

- ✅ `regenerate_pickup_otp(p_request_id uuid): text`
- ✅ `regenerate_delivery_otp(p_request_id uuid): text`
- ✅ `verify_pickup_otp(p_request_id uuid, p_otp text): json`
- ✅ `verify_delivery_otp(p_request_id uuid, p_otp text): json`
- ✅ `accept_request_atomic(p_request_id uuid): json`

**Database Schema (No Changes):**

This issue uses existing schema - no migrations required:

```sql
-- parcel_requests table (existing columns used)
pickup_otp character varying(6)
pickup_otp_expiry timestamp with time zone
delivery_otp character varying(6)
delivery_otp_expiry timestamp with time zone

-- trips table (existing columns used)
pnr_number text
ticket_file_url text
traveller_id uuid (references profiles)
```

**Acceptance Criteria:**

- ✅ Traveller info card with call button (visible post-acceptance)
- ✅ PNR and ticket access (visible post-acceptance)
- ✅ Pickup OTP with countdown and regenerate (status = accepted)
- ✅ Delivery OTP with countdown and regenerate (status = picked_up)
- ✅ Loading states during regeneration
- ✅ Success/error alerts with proper messaging
- ✅ All existing flows (cancel, edit) work unchanged
- ✅ Type-safe implementation throughout

**Frontend Changes:**

**Updated Files:**

- `stores/requestStore.ts` (+2 methods: regeneratePickupOtp, regenerateDeliveryOtp)
- `app/my-requests/[id].tsx` (add traveller card, OTP cards with regenerate buttons)

**Type Updates:**

```typescript
// Extended ParcelRequest interface
interface ParcelRequest {
  // ... existing fields
  trip?: {
    // ... existing fields
    pnr_number: string; // ← Added
    ticket_file_url: string; // ← Added
    traveller?: {
      // ← Added nested profile
      id: string;
      full_name: string;
      phone: string;
    } | null;
  } | null;
}
```

**Breaking Changes:**

None - this is purely additive functionality that enhances the existing sender experience.

**Related Issues & PRs:**

- **Original Issue**: #19 (Request details page improvements)
- **Previous PR**: #43 (Parts 1 & 2 - Cities + Edit buttons) ✅ **Merged**
- **This Issue**: #42 (Parts 3 & 4 - Traveller info + OTP regeneration) ✅ **Merged**

**Benefits:**

✅ **Complete Lifecycle Visibility** - Senders track entire journey  
✅ **Direct Communication** - Call button for traveller contact  
✅ **OTP Management** - Regenerate expired codes on demand  
✅ **Enhanced Security** - Traveller info revealed only after commitment  
✅ **Better UX** - Countdown timers, loading states, clear feedback  
✅ **Type Safety** - Full TypeScript coverage  
✅ **Maintainable** - Clean separation of concerns

---

### Issue #6 - Fix create-trip form date/time validation ✅

**Type:** Frontend Validation - Bug Fix  
**Priority:** HIGH  
**Time:** 2 hours  
**Date:** 2026-02-11

**Problem:**

- Date parsing was inconsistent between validation checks (mixed Date constructors)
- Departure validation allowed trips less than 1 hour in future (backend requires ≥1 hour)
- No validation for same date + same time scenario (departure and arrival)
- Error messages displayed on wrong fields (date fields instead of time fields)
- `getErrorMessage()` function duplicated Zod validation checks
- Arrival date picker allowed past dates when departure not yet selected

**Frontend Changes (Applied via GitHub PR #33 - 2026-02-11):**

1. **`lib/validations/trip.ts`** (Updated)
   - **Added:** `parseDateTime()` helper function
     - Consistent local timezone parsing using `new Date(year, month-1, day, hours, minutes)`
     - Matches backend `create_trip_with_validation()` parsing logic
     - Explicit NaN validation for invalid dates
   - **Updated Validation #1:** Source ≠ Destination (unchanged, already working)
   - **Updated Validation #2:** Departure must be ≥ now + 1 hour (was just > now)
     - Error path changed: `["departure_date"]` → `["departure_time"]`
   - **Updated Validation #3:** Arrival must be after departure
     - Error path changed: `["arrival_date"]` → `["arrival_time"]`
   - **Added Validation #4:** Same date requires different times
     - New check: if `departure_date === arrival_date`, then `departure_time !== arrival_time`
     - Error path: `["arrival_time"]`
   - **Removed:** Redundant empty string checks (Zod `.min(1)` already handles it)

2. **`app/create-trip.tsx`** (Updated)
   - **Simplified:** `getErrorMessage()` function (59 lines → 26 lines)
     - **Removed:** Date validation error handling (Zod catches it)
     - **Removed:** Arrival/departure validation error handling (Zod catches it)
     - **Removed:** Category validation error handling (Zod catches it)
     - **Removed:** Route validation error handling (Zod catches it)
     - **Kept:** Network/connection error handling
     - **Kept:** RLS/permission error handling
     - **Kept:** File upload error handling
     - **Kept:** Generic fallback for unexpected errors
   - **Fixed:** Arrival date picker `minimumDate` prop
     - Before: `parseDate(departureDate) || undefined` (allowed past dates)
     - After: `parseDate(departureDate) || new Date()` (fallback to today)

**How It Works Now:**

**Validation Rules (Final):**

| #   | Validation            | Triggers On                 | Error Field      | Error Message                                                        |
| --- | --------------------- | --------------------------- | ---------------- | -------------------------------------------------------------------- |
| 1   | Source ≠ Destination  | Case-insensitive comparison | `destination`    | "Source and destination must be different"                           |
| 2   | Departure ≥ Now + 1hr | Parse departure datetime    | `departure_time` | "Departure must be at least 1 hour in the future"                    |
| 3   | Arrival > Departure   | Parse both datetimes        | `arrival_time`   | "Arrival must be after departure"                                    |
| 4   | Same date check       | If dates match              | `arrival_time`   | "Arrival time must be different from departure time on the same day" |

**Date Parsing Logic:**

```typescript
const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};
```

**Testing:**

- ✅ Test 1: Departure less than 1 hour from now - BLOCKED
- ✅ Test 2: Departure in past (today + past time) - BLOCKED
- ✅ Test 3: Same date with same time - BLOCKED
- ✅ Test 4: Arrival before departure - BLOCKED
- ✅ Test 5: Arrival date picker enforces minimum (departure or today) - WORKING
- ✅ Test 6: Error messages show on correct fields (time vs date) - WORKING
- ✅ Test 7: Submit button disabled until validations pass - WORKING
- ✅ Test 8: Backend errors show user-friendly alerts - WORKING

**Acceptance Criteria:**

- ✅ Departure cannot be in the past
- ✅ Departure must be at least 1 hour in the future (matches backend)
- ✅ Cannot select past time if departure date is today
- ✅ Arrival date/time must be after departure date/time
- ✅ Same date requires different times
- ✅ Clear error messages for each validation failure
- ✅ Submit button disabled until all validations pass
- ✅ Date pickers enforce minimum constraints (no past dates)

**Frontend Changes:**

- `lib/validations/trip.ts` - Complete validation rewrite with consistent parsing
- `app/create-trip.tsx` - Simplified error handling, fixed date picker minimumDate

**Type Updates:**

- None required - validation schema types inferred from Zod

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Depends on: Issue #5 (Backend validation alignment) ✅
- Depends on: Issue #7 (Notes field removal) ✅
- Blocks: None

---

### Issue #11 - Prevent editing source/destination/transport mode ✅

**Type:** Frontend UI - Security Enhancement  
**Priority:** HIGH  
**Time:** 1-2 hours  
**Date:** 2026-02-12

**Problem:**

- Travelers could edit source, destination, and transport mode in trip details page
- These fields should **never** be editable after trip creation
- Edit button in header allowed editing all fields indiscriminately
- No visual distinction between editable and read-only fields

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`app/(tabs)/my-trips/[id].tsx`** (Updated)
   - **Removed:** Global header edit button
   - **Added:** Permission state management (`canEditDetails`, `canEditDates`)
   - **Added:** `useEffect` hook to check permissions dynamically based on trip status
   - **Added:** TRIP DETAILS section wrapper with conditional edit button
   - **Added:** SCHEDULE section header with conditional edit button
   - **Changed:** Route (source/destination) and transport shown as READ-ONLY (no edit UI)
   - **Added:** Permission checks using `canEditTrip()` and `canEditTripDates()`

2. **`components/trip/EditTripDetailsModal.tsx`** (Updated)
   - **Removed:** `source` field with CityDropdown
   - **Removed:** `destination` field with CityDropdown
   - **Removed:** City swap button and section
   - **Removed:** `transport_mode` field with TransportModeSelector
   - **Kept:** `parcel_size_capacity`, `allowed_categories`, `pnr_number`, `ticket_file_url`
   - **Updated:** Warning message to explicitly state "Route and transport mode are never editable"
   - **Updated:** Modal subtitle from "Update route, transport, and parcel info" → "Update parcel size, categories, and ticket info"

3. **`components/trip/EditTripDatesModal.tsx`** (Updated)
   - **No changes required** - dates modal never had route/transport fields

**How It Works Now:**

#### Trip Details Screen Layout

```

┌─────────────────────────────────────┐
│ Header (Back + Title + Status) │ ← No edit button
└─────────────────────────────────────┘
│ │
│ ┌─────────────────────────────────┐│
│ │ Route (READ-ONLY) ││
│ │ From: Jaipur → To: Delhi ││
│ │ Transport: Flight ││ ← No edit button
│ └─────────────────────────────────┘│
│ │
│ ┌─────────────────────────────────┐│
│ │ SCHEDULE [Edit Icon] ││ ← Conditional edit button
│ │ Departure: Feb 15, 10:00 AM ││
│ │ Arrival: Feb 15, 12:30 PM ││
│ └─────────────────────────────────┘│
│ │
│ ┌─────────────────────────────────┐│
│ │ TRIP DETAILS [Edit Icon] ││ ← Conditional edit button
│ │ Transport: Flight ││
│ │ Parcel Size: Medium ││
│ │ PNR: ABC123 ││
│ └─────────────────────────────────┘│

```

---

#### Permission Logic

| Trip State                           | canEditDetails | canEditDates | What Can Be Edited                   |
| ------------------------------------ | -------------- | ------------ | ------------------------------------ |
| **Before acceptance**                | ✓ true         | ✓ true       | Size, categories, PNR, ticket, dates |
| **After acceptance (before pickup)** | ❌ false       | ✓ true       | Dates only                           |
| **After pickup**                     | ❌ false       | ❌ false     | Nothing                              |
| **Completed/Cancelled**              | ❌ false       | ❌ false     | Nothing                              |

**Never Editable:** source, destination, transport_mode

**Testing:**

- ✅ Test 1: Trip details screen shows route/transport READ-ONLY - PASSED
- ✅ Test 2: No global edit button in header - PASSED
- ✅ Test 3: Edit buttons appear per section based on permissions - PASSED
- ✅ Test 4: Edit details modal only shows 4 fields - PASSED
- ✅ Test 5: Cannot edit details after pickup - PASSED
- ✅ Test 6: Can edit dates after acceptance (before pickup) - PASSED
- ✅ Test 7: Permission checks prevent unauthorized edits - PASSED

**Acceptance Criteria:**

- ✅ Source, destination, transport mode displayed as read-only text
- ✅ No edit buttons for source, destination, transport mode
- ✅ Edit details modal only shows: size, categories, PNR, ticket
- ✅ Edit dates modal only shows: departure/arrival date/time
- ✅ Conditional edit buttons based on trip status and pickup state
- ✅ Permission checks before allowing any edits

**Frontend Changes:**

- `app/(tabs)/my-trips/[id].tsx` - Added permission logic and conditional UI
- `components/trip/EditTripDetailsModal.tsx` - Removed never-editable fields

**Type Updates:**

- None required - using existing Trip type

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Depends on: Issue #27 (updateTrip field whitelist) ✅ Resolved
- Depends on: Issue #4 (Remove 24h editing restriction) ✅ Resolved
- Completed with: Issue #14, #15 (same PR)

---

### Issue #12 - Fix explore tab departure date filter (timezone issue) ✅

**Type:** Frontend Bug Fix - Timezone Handling  
**Priority:** HIGH  
**Time:** 1.5 hours  
**Date:** 2026-02-12

**Problem:**

In explore tab, the departure date filter was going 1 day backwards when users selected a date. This occurred because the DateFilter component used `toISOString().split('T')[0]` which converts Date objects to UTC timezone before extracting the date string, causing an unintended day shift for users in timezones with positive UTC offsets (e.g., IST UTC+5:30).

**Example of Bug:**

- User in IST selects: Feb 15, 2026
- JavaScript Date object: `new Date("2026-02-15T00:00:00+05:30")`
- `toISOString()` result: `"2026-02-14T18:30:00.000Z"` (converted to UTC)
- Split result: `"2026-02-14"` ❌ Wrong date! (one day backwards)

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`lib/utils/dateTime.ts`** (Updated)
   - **Added:** `dateToISOLocal()` helper function
   - **Purpose:** Extracts date components directly from Date object using local timezone
   - **Implementation:** Manual extraction of year, month, day without timezone conversion
   - **Benefits:** Prevents UTC conversion issues across all timezones

2. **`components/search/DateFilter.tsx`** (Updated)
   - **Removed:** `toISOString().split('T')[0]` pattern in Android date handling
   - **Removed:** `toISOString().split('T')[0]` pattern in iOS date handling
   - **Added:** Import and use of `dateToISOLocal()` helper
   - **Fixed:** Both `handleDateChange()` and `handleIOSDone()` functions
   - **Result:** Selected date now matches filtered date exactly

**How It Works Now:**

#### Date Extraction Logic

**Before (Broken):**

```typescript
const dateString = selectedDate.toISOString().split("T")[0];
// User in IST selects Feb 15 → Result: "2026-02-14" ❌
```

**After (Fixed):**

```typescript
const dateString = dateToISOLocal(selectedDate);
// User in IST selects Feb 15 → Result: "2026-02-15" ✅

// Helper implementation:
export const dateToISOLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
```

#### Data Flow (Fixed)

```
1. User selects date in DatePicker
   ↓
2. dateToISOLocal() extracts local components
   → year: 2026, month: 02, day: 15
   ↓
3. Format as string: "2026-02-15"
   ↓
4. Store in searchStore.filters.departureDate
   ↓
5. Search query: WHERE departure_date = '2026-02-15'
   ↓
6. Database returns trips with matching date
   ✅ Correct results!
```

**Testing:**

- ✅ Test 1: Date picker displays correct selected date - PASSED
- ✅ Test 2: Filter display shows correct date (no offset) - PASSED
- ✅ Test 3: Network request sends correct date parameter - PASSED
- ✅ Test 4: Search returns trips matching selected date - PASSED
- ✅ Test 5: Works correctly on both Android and iOS - PASSED
- ✅ Test 6: Date persists when navigating away and back - PASSED
- ✅ Test 7: Works across different timezones - PASSED
- ✅ Test 8: No console errors or warnings - PASSED

**Acceptance Criteria:**

- ✅ Selecting departure date shows trips for exact selected date
- ✅ No day offset in filter results
- ✅ Date picker displays correct selected date
- ✅ Filter persists when navigating away and back
- ✅ Works consistently across all timezones
- ✅ Applied to both Android and iOS platforms

**Frontend Changes:**

- `lib/utils/dateTime.ts` - Added `dateToISOLocal()` helper function
- `components/search/DateFilter.tsx` - Updated date handling to use local extraction

**Type Updates:**

- None required - helper function uses standard Date and string types

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Related to: Issue #6 (date/time validation) - ensures consistent date handling
- Pattern improvement: Can be applied to other date selection components if needed

**Technical Details:**

#### Timezone Offset Impact

| Timezone     | UTC Offset | Date Selected | Old Result (Bug) | New Result (Fix) |
| ------------ | ---------- | ------------- | ---------------- | ---------------- |
| IST (India)  | +5:30      | Feb 15, 2026  | Feb 14, 2026 ❌  | Feb 15, 2026 ✅  |
| JST (Japan)  | +9:00      | Feb 15, 2026  | Feb 14, 2026 ❌  | Feb 15, 2026 ✅  |
| PST (US)     | -8:00      | Feb 15, 2026  | Feb 15, 2026 ✓   | Feb 15, 2026 ✅  |
| UTC (London) | +0:00      | Feb 15, 2026  | Feb 15, 2026 ✓   | Feb 15, 2026 ✅  |

Only positive UTC offset timezones were affected by the bug. The fix ensures consistency across all timezones.

#### Why toISOString() Was Wrong

```typescript
// JavaScript Date internally stores time in UTC
const date = new Date("2026-02-15"); // Parsed as midnight local time
// In IST: 2026-02-15T00:00:00+05:30

date.toISOString(); // Converts to UTC
// Result: "2026-02-14T18:30:00.000Z"
// ↑ Notice the date changed to 14th!

// Correct approach: Extract local components directly
date.getFullYear(); // 2026 (local)
date.getMonth() + 1; // 2 (local)
date.getDate(); // 15 (local) ✓
```

**Benefits:**

✅ **Timezone-safe** - Works correctly for all UTC offsets  
✅ **Consistent** - Selected date = filtered date = displayed date  
✅ **User experience** - No confusion about "wrong" dates appearing  
✅ **Reusable** - `dateToISOLocal()` can be used throughout the app  
✅ **Database compatible** - String format matches PostgreSQL DATE type  
✅ **Future-proof** - Prevents similar issues in other components

---

### Issue #13 - Harmonize TripCard, RequestCard, and DeliveryCard styling ✅

**Type:** Frontend Refactor - UI Consistency  
**Priority:** MEDIUM  
**Time:** 2 hours  
**Date:** 2026-02-12

**Problem:**

Cards across different tabs had inconsistent styling. Parcel size and allowed items style needed to match AvailableTripCard from explore/results.tsx.

**Issues Identified:**

- **TripCard:**
  - Background used `colors.background.secondary` (should be `primary`)
  - Parcel size chip used `withOpacity("light")` instead of `"subtle"`
  - Categories displayed as icon-only (no chips with labels)
  - Footer text "View Details" instead of "View Full Details"
  - Footer icon `chevron-forward` instead of `arrow-forward`
  - Footer color tertiary instead of primary

- **RequestCard:**
  - Background used `colors.background.secondary` (should be `primary`)
  - Shadow opacity 0.05 instead of 0.06
  - Category chip used hardcoded hex opacity `colors.primary + "10"` instead of `withOpacity()`
  - Parcel size displayed as plain text instead of styled chip
  - Footer icon size 16 instead of 18

- **DeliveryCard:**
  - Background used `colors.background.secondary` (should be `primary`)
  - Parcel size and category displayed as plain text with icons (metaRow)
  - No chip styling for categories or size
  - Footer text "View Details" instead of "View Full Details"
  - Footer icon `chevron-forward` instead of `arrow-forward`
  - Footer color tertiary instead of primary

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`components/trip/TripCard.tsx`** (Updated)
   - **Changed:** Background from `colors.background.secondary` → `colors.background.primary`
   - **Updated:** Parcel size chip opacity from `withOpacity(colors.success, "light")` → `withOpacity(colors.success, "subtle")`
   - **Replaced:** Icon-only categories with full chips (icon + label)
   - **Updated:** Categories now show up to 2 with labels, then "+N" overflow indicator
   - **Updated:** Footer text "View Details" → "View Full Details"
   - **Changed:** Footer icon `chevron-forward` → `arrow-forward`
   - **Changed:** Footer color from `colors.text.tertiary` → `colors.primary`
   - **Changed:** Footer icon size 16 → 18
   - **Added:** `categoryChip` and `categoryText` styles matching reference design

2. **`components/request/RequestCard.tsx`** (Updated)
   - **Changed:** Background from `colors.background.secondary` → `colors.background.primary`
   - **Fixed:** Shadow opacity from 0.05 → 0.06
   - **Replaced:** Hardcoded hex opacity `colors.primary + "10"` → `withOpacity(colors.primary, "subtle")`
   - **Converted:** Plain text parcel size → styled chip with green background and icon
   - **Updated:** Footer text "View Details" → "View Full Details"
   - **Changed:** Footer icon size 16 → 18
   - **Added:** `sizeChip` and `sizeText` styles

3. **`components/delivery/DeliveryCard.tsx`** (Updated)
   - **Changed:** Background from `colors.background.secondary` → `colors.background.primary`
   - **Replaced:** `metaRow` section → `chipsRow` with styled chips
   - **Converted:** Plain text category → chip with `withOpacity(colors.primary, "subtle")` background
   - **Converted:** Plain text parcel size → chip with `withOpacity(colors.success, "subtle")` background
   - **Updated:** Footer text "View Details" → "View Full Details"
   - **Changed:** Footer icon `chevron-forward` → `arrow-forward`
   - **Changed:** Footer color from `colors.text.tertiary` → `colors.primary`
   - **Changed:** Footer icon size 16 → 18
   - **Replaced:** `metaRow/metaItem` styles → `chipsRow`, `categoryChip`, `categoryText`, `sizeChip`, `sizeText`

**How It Works Now:**

#### Design Consistency Achieved

All cards now match the **AvailableTripCard** reference design:

| Feature             | Consistency                                  |
| ------------------- | -------------------------------------------- |
| Card background     | ✅ `colors.background.primary`               |
| Shadow opacity      | ✅ 0.06                                      |
| Border radius       | ✅ `BorderRadius.xl`                         |
| Parcel size display | ✅ Green chip with icon + label              |
| Category display    | ✅ Primary-colored chips with icons + labels |
| Opacity helper      | ✅ Uses `withOpacity("subtle")` consistently |
| Footer text         | ✅ "View Full Details" in primary color      |
| Footer icon         | ✅ `arrow-forward` size 18 in primary color  |
| Typography          | ✅ Consistent sizes and weights              |

#### Chip Styling Pattern

**Parcel Size Chip:**

```typescript
<View
  style={[
    styles.sizeChip,
    { backgroundColor: withOpacity(colors.success, "subtle") },
  ]}
>
  <Ionicons name="cube" size={14} color={colors.success} />
  <Text style={[styles.sizeText, { color: colors.success }]}>
    {getSizeCapacityLabel(size)}
  </Text>
</View>
```

**Category Chip:**

```typescript
<View
  style={[
    styles.categoryChip,
    { backgroundColor: withOpacity(colors.primary, "subtle") },
  ]}
>
  <Ionicons name={icon} size={14} color={colors.primary} />
  <Text style={[styles.categoryText, { color: colors.primary }]}>
    {label}
  </Text>
</View>
```

**Testing:**

- ✅ Test 1: TripCard displays consistent styling - PASSED
- ✅ Test 2: RequestCard displays consistent styling - PASSED
- ✅ Test 3: DeliveryCard displays consistent styling - PASSED
- ✅ Test 4: All cards use primary background - PASSED
- ✅ Test 5: Parcel size chips styled consistently - PASSED
- ✅ Test 6: Category chips styled consistently - PASSED
- ✅ Test 7: Footer styling matches across cards - PASSED
- ✅ Test 8: No TypeScript errors - PASSED
- ✅ Test 9: Theme switching works correctly - PASSED

**Acceptance Criteria:**

- ✅ All cards use consistent badge styling
- ✅ Card layouts have consistent spacing
- ✅ Typography sizes and weights are consistent
- ✅ Colors match theme across all cards
- ✅ Parcel size displays as chips with icons
- ✅ Categories display as chips with icons and labels
- ✅ Footer text and icons are consistent
- ✅ Uses `withOpacity()` helper instead of hardcoded hex values

**Frontend Changes:**

- `components/trip/TripCard.tsx` - Updated styling to match reference
- `components/request/RequestCard.tsx` - Updated styling to match reference
- `components/delivery/DeliveryCard.tsx` - Updated styling to match reference

**Type Updates:**

- None required - no prop or type changes

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Related to: Issue #16 (global design consistency)
- Improves: User experience and visual consistency
- Pattern: Establishes chip styling standard for future components

---

### Issue #16 - Add bottom border to Explore and My Requests headers ✅

**Type:** Frontend UI - Visual Consistency  
**Priority:** LOW  
**Time:** 20–30 minutes  
**Date:** 2026-02-12

**Problem:**

The header in `create-trip.tsx` already had a bottom border, but other
tab screens did not, leading to inconsistent header visuals across the
app. Explore and My Requests tabs in particular felt visually disconnected
from their content because there was no subtle divider between the header
and the scrollable area.

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`app/(tabs)/explore/index.tsx`** (Updated)
   - **Updated:** `header` style in `StyleSheet.create()`
   - **Added:** `borderBottomWidth: 1` to match `create-trip` and `my-trips`
   - **Kept:** Existing padding, alignment, and layout unchanged
   - **Relies on:** `colors.border.light` passed inline in JSX for border color
     (same pattern as other tabs)

2. **`app/(tabs)/my-requests/index.tsx`** (Updated)
   - **Updated:** `header` style in `StyleSheet.create()`
   - **Added:** `borderBottomWidth: 1` to provide the same visual separator
   - **Kept:** Existing padding, alignment, and layout unchanged
   - **Relies on:** `colors.border.light` passed inline in JSX for border color

**How It Works Now:**

All primary tab headers (Create Trip, My Trips, Explore, My Requests,
Requests) share the same visual pattern:

- Row layout with title, subtitle, and ModeSwitcher
- Consistent horizontal/vertical padding
- A 1px bottom border acting as a separator from the content
- Border color driven by theme (`colors.border.light`), adapting to
  light/dark mode

This creates a consistent **tab header baseline** across the app so users
always see a clear division between header and content.

**Testing:**

- ✅ Explore tab shows bottom border under header
- ✅ My Requests tab shows bottom border under header
- ✅ Headers now visually match Create Trip, My Trips, and Requests
- ✅ Works correctly in both light and dark mode (border visible but subtle)
- ✅ No layout shifts or padding changes
- ✅ No TypeScript errors or console warnings

**Acceptance Criteria:**

- ✅ All tab headers have a bottom border
- ✅ Border color consistent across tabs
- ✅ Padding and spacing preserved
- ✅ Works in both light and dark mode

**Frontend Changes:**

- `app/(tabs)/explore/index.tsx` – header style updated
- `app/(tabs)/my-requests/index.tsx` – header style updated

**Type Updates:**

- None required

**Database Objects Touched:**

- None – purely UI change

**Related Issues:**

- Related to: Issue #13 (card styling harmonization / UI consistency)

---

### Issue #14 - Remove notes from trip edit modals ✅

**Type:** Frontend Cleanup
**Priority:** MEDIUM
**Time:** 1 hour
**Date:** 2026-02-12

**Problem:**

- `EditTripDetailsModal` and `EditTripDatesModal` still had notes field references
- Backend already removed notes column (Issue #5)
- Frontend types already removed notes (Issue #7)
- Dead code and potential runtime errors

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`components/trip/EditTripDetailsModal.tsx`** (Updated)
   - **Verified:** No notes field (already removed in Issue #7)
   - **Verified:** Uses `tripEditDetailsSchema` (correct validation)
   - **Verified:** Uses `updateTripGeneralFields()` (correct method)
   - **Status:** Already compliant ✅

2. **`components/trip/EditTripDatesModal.tsx`** (Updated)
   - **Verified:** No notes field (never had it)
   - **Verified:** Uses `tripEditDatesSchema` (correct validation)
   - **Verified:** Uses `updateTripDates()` (correct method)
   - **Status:** Already compliant ✅

**How It Works Now:**

Both modals are now completely free of notes references:

- ✅ No notes input fields
- ✅ No notes in default values
- ✅ No notes in submit payloads
- ✅ Validation schemas don't include notes

**Testing:**

- ✅ Test 1: Edit details modal works without errors - PASSED
- ✅ Test 2: Edit dates modal works without errors - PASSED
- ✅ Test 3: Can successfully edit trip details - PASSED
- ✅ Test 4: Can successfully edit trip dates - PASSED
- ✅ Test 5: No runtime errors about notes field - PASSED

**Acceptance Criteria:**

- ✅ No notes field in EditTripDetailsModal
- ✅ No notes field in EditTripDatesModal
- ✅ Modals work without errors
- ✅ Can edit trip details successfully
- ✅ Can edit trip dates successfully

**Frontend Changes:**

- No actual changes needed - verification only
- Modals already updated in Issue #7

**Type Updates:**

- None required - already handled in Issue #7

**Database Objects Touched:**

- None - frontend-only verification

**Related Issues:**

- Depends on: Issue #5 (Backend notes removal) ✅ Resolved
- Depends on: Issue #7 (Frontend notes removal) ✅ Resolved
- Completed with: Issue #11, #15 (same PR)

---

### Issue #15 - Update trip-edit.ts validation schema ✅

**Type:** Frontend Validation - Cleanup
**Priority:** HIGH
**Time:** 1-2 hours
**Date:** 2026-02-12

**Problem:**

- `lib/validations/trip-edit.ts` had deprecated backward compatibility exports
- Old schema names (`tripDetailsSchema`, `tripDatesSchema`) causing confusion
- Validation schemas needed alignment with new edit rules (no source/destination/transport)
- Modals already importing new schema names but aliases still existed

**Frontend Changes (Applied via GitHub PR - 2026-02-12):**

1. **`lib/validations/trip-edit.ts`** (Updated)
   - **Removed:** Deprecated export `tripDetailsSchema = tripEditDetailsSchema`
   - **Removed:** Deprecated export `TripDetailsFormData = TripEditDetailsFormData`
   - **Removed:** Deprecated export `tripDatesSchema = tripEditDatesSchema`
   - **Removed:** Deprecated export `TripDatesFormData = TripEditDatesFormData`
   - **Removed:** TODO comment about Issue #11
   - **Kept:** Clean final schemas (`tripEditDetailsSchema`, `tripEditDatesSchema`)
   - **Verified:** Uses `parseDateTime` from `trip.ts` for consistency
   - **Verified:** Proper validation rules (1hr departure buffer, arrival > departure)

2. **Schema Contents Verification:**

   **`tripEditDetailsSchema` (4 fields only):**

   ```typescript
   - parcel_size_capacity: enum ['small', 'medium', 'large']
   - allowed_categories: array (min 1)
   - pnr_number: string (3-20 chars, alphanumeric)
   - ticket_file_url: string (valid URL)
   ```

**`tripEditDatesSchema` (4 fields only):**

```typescript
- departure_date: string (required)
- departure_time: string (required, ≥ now + 1hr)
- arrival_date: string (required)
- arrival_time: string (required, > departure, different if same date)
```

**How It Works Now:**

#### Clean Import Structure

```typescript
// Modals now import clean schema names (no aliases)
import {
  tripEditDetailsSchema,
  TripEditDetailsFormData,
} from "@/lib/validations/trip-edit";

import {
  tripEditDatesSchema,
  TripEditDatesFormData,
} from "@/lib/validations/trip-edit";
```

#### Validation Rules Match Backend

| Field       | Frontend Validation     | Backend Validation | Status      |
| ----------- | ----------------------- | ------------------ | ----------- |
| Departure   | ≥ now + 1hr             | ≥ now + 1hr        | ✅ Match    |
| Arrival     | > departure             | > departure        | ✅ Match    |
| Same date   | Different times         | Different times    | ✅ Match    |
| PNR         | 3-20 chars alphanumeric | No specific check  | ✅ Stricter |
| Parcel size | enum validation         | enum validation    | ✅ Match    |
| Categories  | min 1                   | non-empty array    | ✅ Match    |

**Testing:**

- ✅ Test 1: Import new schema names in modals - PASSED
- ✅ Test 2: Old alias names no longer exported - PASSED
- ✅ Test 3: Details validation works correctly - PASSED
- ✅ Test 4: Dates validation works correctly - PASSED
- ✅ Test 5: Departure 1hr buffer enforced - PASSED
- ✅ Test 6: Arrival after departure enforced - PASSED
- ✅ Test 7: Same date different time enforced - PASSED

**Acceptance Criteria:**

- ✅ Removed deprecated backward compatibility exports
- ✅ Clean schemas with only editable fields
- ✅ No 24-hour restriction (removed in Issue #4)
- ✅ Schemas match backend validation
- ✅ Edit modals use correct schema names
- ✅ Uses `parseDateTime` from `trip.ts` for consistency

**Frontend Changes:**

- `lib/validations/trip-edit.ts` - Removed deprecated exports

**Type Updates:**

- None required - Zod infers types from schemas

**Database Objects Touched:**

- None - frontend-only changes

**Related Issues:**

- Depends on: Issue #4 (Remove 24h editing restriction) ✅ Resolved
- Depends on: Issue #27 (updateTrip field whitelist) ✅ Resolved
- Depends on: Issue #7 (Notes removal) ✅ Resolved
- Completed with: Issue #11, #14 (same PR)

---

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

#### Automatic Flow (via Cron Job)

1. `transition-trips-to-in-progress` cron job runs every 5 minutes
2. Identifies trips with `departure_date + departure_time <= NOW()`
3. Updates trip status: `upcoming`/`locked` → `in_progress`
4. **Trigger fires automatically** when trip status changes
5. All `pending` requests on that trip → `expired`

#### Manual Flow (Direct Update)

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

- `stores/tripStore.ts` - Core implementation (Issues #4, #7, #27)
- `lib/utils/fileUpload.ts` - Added uploadFile() wrapper (Issue #8)
- `components/forms/FileUploadButton.tsx` - Store local URIs, defer upload (Issue #8)
- `components/forms/ImagePicker.tsx` - Store local URIs, defer upload (Issues #8, #9)
- `app/create-trip.tsx` - Upload on submit, error handling (Issues #8)
- `app/explore/request-form.tsx` - Parallel upload on submit (Issue #9)
- `stores/requestStore.ts` - No changes required (Issues #2, #3)
- `lib/validations/trip.ts` - Date validation fixes (Issue #6)
- `lib/validations/trip-edit.ts` - Schema cleanup (Issue #15)
- `app/create-trip.tsx` - Error handling simplification (Issue #6)
- `app/(tabs)/my-trips/[id].tsx` - Permission-based UI (Issue #11)
- `components/trip/EditTripDetailsModal.tsx` - Remove never-editable fields (Issue #11)
- `components/trip/EditTripDatesModal.tsx` - Verification only (Issue #14)
- `types/database.types.ts` - Type regeneration (Issue #7)

### Backend (No Migration Files)

Backend changes applied manually via Supabase SQL Editor:

- **2026-02-08:** Issues #4, #27 (permission functions + RLS policies)
- **2026-02-09 (Morning):** Issue #1 (triggers, cron job, function updates)
- **2026-02-09 (Evening):** Issue #2 (cancellation logic, trigger removal, validation update)
- **2026-02-09 (Night):** Issue #3 (request expiry trigger, function)
- **2026-02-10:** Issue #5 (notes column drop, function update)
- **2026-02-11:** Issue #6, #7 (frontend validation and cleanup)
- **2026-02-12:** Issues #11, #14, #15 (trip edit restrictions) - **Combined PR**

No migration files created to avoid conflicts with production database.

### Security Architecture

- **Frontend:** Field whitelisting prevents malicious updates
- **Database:** RLS policies enforce restrictions at row level
- **Functions:** Permission checks validate business logic
- **Triggers:** Automatic status transitions maintain data integrity
- **Cron Jobs:** Time-based transitions ensure accurate trip lifecycle
- **OTP Verification:** Secure cancellation flow for emergency scenarios
