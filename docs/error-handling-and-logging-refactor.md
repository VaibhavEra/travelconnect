# Error Handling & Logging Architecture — TravelConnect App

## Context

TravelConnect is a React Native (Expo) app backed by Supabase/PostgreSQL.
The frontend is built with TypeScript, Zustand stores, React Hook Form + Zod,
and expo-router. The codebase has ~130 files across stores, screens, and
components.

This document describes the standardized error handling and logging
architecture and serves as the reference for future changes.

## Problems Identified (Pre‑refactor)

A full audit of all stores, screens, and components revealed three systemic
problems that affected every layer of the app.

### 1. No Shared Error Display Utility

Every screen and modal called `Alert.alert(title, message)` inline with its own
hardcoded title strings. There was no single place that controlled how errors
were presented to users. This caused:

- Different screens to show "Error", "Login Failed", "Verification Failed",
  "Registration Failed" etc. for the same category of error.
- Success feedback to be inconsistent — some screens used blocking Alerts
  for lightweight confirmations like "Details updated successfully".

### 2. Two Incompatible Error Flow Contracts

The stores were written in two different styles with no standardization.

**Style A — `tripStore`, `requestStore`:**

- Store called `parseSupabaseError(error)` internally.
- Store re‑threw `new Error(parsedString)`.
- Screen read `error.message` directly.
- Problem: lost original error shape and stack, and raw `.message` was leaked
  directly to users via `Alert.alert("Error", error.message)`.

**Style B — `authStore`:**

- Store threw raw Supabase errors with no parsing.
- Screens called `parseSupabaseError(error)` themselves.
- Problem: parsing responsibility was in the wrong layer, and some screens
  also did manual `error.message.includes(...)` checks on already‑parsed strings.

These two patterns coexisted in the same app with no single contract.

### 3. Inconsistent and Missing Logging

- Some files used the existing `logger` util, many used `console.error` directly.
- Several modal catch blocks had no logging at all (completely invisible
  failures in production).
- No module context was attached to any log (hard to trace which store or screen
  threw without reading the message string).
- Success paths were never logged.
- Some stores double‑logged (log in the action, then log again in the catch).

---

## Target Architecture

A layered refactor in 5 steps, touching utilities first, then stores,
then screens and components (mechanical at that point).

### Step 1 — Enhance `lib/utils/logger.ts`

Add optional `module` context to every log call so logs are traceable:

```ts
logger.error("Sign in failed", error, { module: "authStore" });
logger.info("Trip created", { tripId }, { module: "tripStore" });
```

Guidelines:

- Always pass a static `MODULE` constant per file, e.g. `const MODULE = "LoginScreen";`.
- Use `logger.error` in all catch blocks instead of `console.error`.
- Log success for important business events with `logger.info` where useful.

### Step 2 — Harden `lib/utils/errorHandling.ts`

Introduce a typed error abstraction for the app.

Key changes:

- Add a typed `AppError` interface to replace all `error: any` usage.
- Standardize `parseSupabaseError` — it now returns a typed `AppError` instead
  of a plain string, with priority‑ordered code/status checks before string
  matching.
- Add `createAppError(code, message, originalError?)` factory.
- Add `isAppError(error)` type guard — prevents double‑parsing.
- Add `parseOtpError(error, otpType?)` — dedicated parser for the
  `knownErrors` code‑as‑message pattern used in OTP verification flows
  (`"invalid_otp"`, `"expired"`, `"blocked"`), returning structured:

```ts
{
  code: string;
  userMessage: string;
  isBlocked: boolean;
  isExpired: boolean;
  blockSecondsRemaining?: number;
}
```

Usage notes:

- Only parse unknown errors at the store boundary.
- Screens/components should never call `parseSupabaseError` directly anymore.
- OTP flows must use `parseOtpError(error, otpType)` instead of string matching.

### Step 3 — Shared Alerts & Toaster

Two new utilities centralize user‑visible feedback.

**`lib/utils/alerts.ts`** — for blocking errors and confirmations:

```ts
showErrorAlert(error, context?);             // auto‑titles from error.code, parses internally
showConfirmAlert(title, message, onConfirm, confirmLabel?, destructive?);
showSessionAlert(title, message, onDismiss, buttonLabel?);
```

Guidelines:

- Use `showErrorAlert(error)` for all error surfaces that must block the user
  (e.g. critical failures, destructive confirmation flows that fail).
- Keep domain‑specific navigation guards (like “Cannot Edit Trip”) as direct
  `Alert.alert` when they are not coming from a thrown error and have very
  specific copy.

**`lib/utils/toast.ts`** — for non‑blocking success/info feedback
(uses `sonner-native`):

```ts
showSuccessToast(message);
showErrorToast(message);
showInfoToast(message);
```

- Used for “happy path” confirmations like “Trip created” or “Request sent”.
- Replaces blocking success Alerts that previously required an extra tap.

`<Toaster />` from `sonner-native` is placed in `app/_layout.tsx` after `<Slot />`
so it renders above all screen content.

### Step 4 — Standardize All Stores

Adopt a single contract across **all** stores.

**Fetch actions** (e.g. `getMyTrips`, `getMyRequests`):

- Parse errors into `AppError` in the store.
- Store `AppError` in state (`error: AppError | null`), do **not** re‑throw.
- Screens read `store.error` and show `error.userMessage` when needed.

**Mutating actions** (e.g. `createTrip`, `cancelRequest`, `signIn`):

- Parse error into `AppError` inside the store.
- Store it in state.
- Re‑throw the same `AppError` so screens can react (navigation, form reset, etc.).

**Permission checks** (e.g. `canEditTrip`, `canEditRequestDetails`):

- Return `false` on failure.
- Log with module context.
- Never throw.

**`authStore` specifically:**

- All Supabase errors go through `parseSupabaseError` at the throw site.
- `EMAIL_NOT_VERIFIED` is thrown as
  `createAppError("EMAIL_NOT_VERIFIED", ...)` instead of
  `new Error("EMAIL_NOT_VERIFIED")` with `.name = "EmailNotVerifiedError"`.
- Screens check `error.code === "EMAIL_NOT_VERIFIED"` instead of
  `error.name === "EmailNotVerifiedError"`.
- `error.code === "email_not_confirmed"` is checked before any string matching.

All stores share an internal helper:

```ts
const handleMutationError = (
  error: unknown,
  message: string,
  setFn: (err: AppError) => void,
): never => {
  const appError = isAppError(error) ? error : parseSupabaseError(error);
  logger.error(message, error, { module: MODULE });
  setFn(appError);
  throw appError;
};
```

And all store `error` fields are now `AppError | null` instead of
`string | null`. Screens access `.userMessage` for display and `.code`
for branching.

### Step 5 — Screens & Components (Mechanical Changes)

With utilities and stores standardized, screens and components apply
the same pattern everywhere:

1. Replace `console.error(...)` → `logger.error(..., { module: "..." })`.
2. Replace `Alert.alert("Error", error.message || "...")` →
   `showErrorAlert(error)`.
3. Replace `Alert.alert("Success", "...")` for lightweight confirmations →
   `showSuccessToast("...")`.
4. Replace inline OTP code matching (`err.message === "invalid_otp"` etc.) →
   `parseOtpError(err, otpType)` from the shared utility.
5. In auth screens: check `error.code === "EMAIL_NOT_VERIFIED"` instead of
   `error.name === "EmailNotVerifiedError"`.

Permission guard Alerts (e.g. “Cannot Edit Dates”) remain direct `Alert.alert`
calls, as they are domain‑specific flow guards and not caught errors.

---

## Files Audited (Original Issues)

### Stores

| File                     | Key Issues Found                                                             |
| ------------------------ | ---------------------------------------------------------------------------- |
| `stores/authStore.ts`    | Threw raw errors, no `parseSupabaseError`, `email.includes` string match     |
| `stores/tripStore.ts`    | Parsed in store but re‑threw string, no module context on logs               |
| `stores/requestStore.ts` | Same as tripStore, plus `knownErrors` OTP code pattern needed its own parser |
| `stores/searchStore.ts`  | Minimal error handling, no logging                                           |
| `stores/profileStore.ts` | Inferred — followed same pattern as tripStore                                |

### Screens

| File                                         | Key Issues Found                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/(auth)/login.tsx`                       | Manual `error.name === "EmailNotVerifiedError"` check, account lock logic in screen |
| `app/(auth)/register/step-2-profile.tsx`     | `errorMessage.includes("Username already taken")` on already‑parsed string          |
| `app/(auth)/register/step-3-verify.tsx`      | No logger, parsed in screen                                                         |
| `app/(auth)/reset-password/index.tsx`        | Intentionally swallowed errors (security), but zero logging                         |
| `app/(auth)/reset-password/verify.tsx`       | No logger                                                                           |
| `app/(auth)/reset-password/new-password.tsx` | Duplicate session expiry guard in screen + store                                    |
| `app/(tabs)/create-trip.tsx`                 | `console.error`, raw `error.message` in Alert                                       |
| `app/(tabs)/explore/request-form.tsx`        | `console.error`, raw `error.message` in Alert                                       |
| `app/(tabs)/my-requests/[id].tsx`            | Raw `error.message` in all handlers, no logger                                      |
| `app/(tabs)/my-trips/[id].tsx`               | Same pattern as `my-requests/[id].tsx`                                              |
| `app/(tabs)/requests/[id].tsx`               | Same pattern                                                                        |

### Components / Modals

| File                                              | Key Issues Found                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `components/modals/AcceptRequestModal.tsx`        | `console.error` in safety‑net catch                                    |
| `components/modals/CancellationOtpModal.tsx`      | `console.error`, inline OTP code matching, raw `err.message` to user   |
| `components/modals/RejectRequestModal.tsx`        | `console.error`, swallowed actual error with hardcoded fallback string |
| `components/modals/VerifyOtpModal.tsx`            | No logging, inline OTP code matching, raw `err.message` to user        |
| `components/request/CancelRequestModal.tsx`       | Completely empty catch block                                           |
| `components/request/EditReceiverDetailsModal.tsx` | `console.error`, raw `error.message`, blocking Alert for success       |
| `components/request/EditRequestDetailsModal.tsx`  | Same as EditReceiverDetailsModal                                       |
| `components/trip/EditTripDatesModal.tsx`          | `console.error`, raw `error.message`, blocking Alert for success       |
| `components/trip/EditTripDetailsModal.tsx`        | Same as EditTripDatesModal                                             |

---

## Existing Utilities (Pre‑refactor)

- `lib/utils/logger.ts` — existed, now has module context support.
- `lib/utils/errorHandling.ts` — previously only `parseSupabaseError` returning strings.
- `lib/utils/haptics.ts` — unchanged.
- `lib/utils/rateLimit.ts` — unchanged.
- `lib/validations/` — Zod schemas, unchanged (field‑level validation only).

---

## Scope and Non‑Goals

- No changes to Supabase backend / SQL functions.
- No changes to UI layout, styles, or navigation logic.
- Zod validation errors are still handled via React Hook Form inline field errors
  and do **not** go through the new error utilities.
- `app/(auth)/reset-password/index.tsx` intentionally keeps user‑silent behavior
  for security (email enumeration prevention), but now logs internally via
  `logger.error`.
- No changes to domain logic beyond error handling, logging, and user feedback
  surfaces.

---

## Implementation Order

1. `lib/utils/logger.ts`
2. `lib/utils/errorHandling.ts`
3. `lib/utils/alerts.ts` _(new)_
4. `lib/utils/toast.ts` _(new)_
5. `stores/authStore.ts`
6. `stores/tripStore.ts`
7. `stores/requestStore.ts`
8. `stores/searchStore.ts` + `stores/profileStore.ts`
9. All screens (auth first, then tabs)
10. All modals and components

Steps 1–4 must be completed before touching any store or screen.
Steps 9–10 are mechanical once the utilities and stores are fixed.

---

## Progress

### ✅ Completed

- `lib/utils/logger.ts` — module context added.
- `lib/utils/errorHandling.ts` — `AppError`, `createAppError`, `isAppError`,
  `parseOtpError`, hardened `parseSupabaseError`.
- `lib/utils/alerts.ts` — created.
- `lib/utils/toast.ts` — created (`sonner-native` installed).
- `app/_layout.tsx` — `<Toaster />` added.
- `stores/tripStore.ts` — fully updated.
- `stores/requestStore.ts` — fully updated.
- `stores/authStore.ts` — fully updated.
- `stores/searchStore.ts` — fully updated.
- `stores/profileStore.ts` — fully updated.
- `stores/modeStore.ts` — logger module context added.
- `app/(auth)/login.tsx` — fully updated.
- `app/(auth)/register/step-2-profile.tsx` — fully updated.
- `app/(auth)/register/step-3-verify.tsx` — fully updated.
- `app/(auth)/reset-password/index.tsx` — fully updated.
- `app/(auth)/reset-password/verify.tsx` — fully updated.
- `app/(auth)/reset-password/new-password.tsx` — fully updated.
- `app/(tabs)/create-trip.tsx` — fully updated.
- `app/(tabs)/explore/request-form.tsx` — fully updated.
- `app/(tabs)/my-requests/[id].tsx` — fully updated.
- `app/(tabs)/my-trips/[id].tsx` — fully updated.
- `app/(tabs)/requests/[id].tsx` — fully updated.

### ⏳ Remaining (Step 5 — Components)

**Modals & Components**

- `components/modals/AcceptRequestModal.tsx`
- `components/modals/CancellationOtpModal.tsx`
- `components/modals/RejectRequestModal.tsx`
- `components/modals/VerifyOtpModal.tsx`
- `components/request/CancelRequestModal.tsx`
- `components/request/EditReceiverDetailsModal.tsx`
- `components/request/EditRequestDetailsModal.tsx`
- `components/trip/EditTripDatesModal.tsx`
- `components/trip/EditTripDetailsModal.tsx`
- Other components as they are audited.

---
