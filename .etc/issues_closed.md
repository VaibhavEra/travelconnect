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

### File Selection Flow

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

### Cache Management

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

### Component Responsibility

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

### Parallel Upload Implementation

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

### Filter Configuration (Centralized)

**Before (Duplicated):**

- `lib/constants/filters.ts` - Incomplete TRIP_FILTERS (only 4 statuses)
- `app/(tabs)/my-trips/index.tsx` - Local FILTER_CONFIG (6 statuses, missing expired)

**After (Single Source of Truth):**

- `lib/constants/filters.ts` - Complete TRIP_FILTERS (all 7 statuses)
- `app/(tabs)/my-trips/index.tsx` - Imports shared filters

### Filter Bar Display

```

┌─────────────────────────────────────────────────────────────────────┐
│ [All] [Upcoming] [Locked] [In Progress] [Completed] [Cancelled] [Expired] │
└─────────────────────────────────────────────────────────────────────┘

```

### Visual Appearance of Expired Trips

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

### Trip Details Screen Layout

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

### Permission Logic

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

### Clean Import Structure

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

### Validation Rules Match Backend

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
