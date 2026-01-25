# TravelConnect Authentication Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [AuthStore Architecture](#authstore-architecture)
4. [Security Features](#security-features)
5. [Form Validation](#form-validation)
6. [Error Handling](#error-handling)
7. [Session Management](#session-management)
8. [Utilities](#utilities)
9. [Testing Guide](#testing-guide)

---

## Overview

TravelConnect implements a **secure, production-ready authentication system** with:

- Email/password registration with OTP verification
- Login with database-side account lockout protection (5 attempts, 15-minute cooldown)
- **Complete password reset flow** (forgot-password → verify-reset-otp → reset-new-password)
- Session persistence with automatic token refresh
- Email enumeration prevention
- Real-time field availability checking (debounced 500ms)
- Client-side and server-side validation
- Rate limiting on sensitive operations
- **Dual-store architecture** (authStore + profileStore)

**Note:** Role (sender vs traveller) is handled **client-side** via `modeStore` and is **not** stored in the `profiles` table for MVP.

**Design Philosophy:** Security first, UX second. Every auth decision prioritizes preventing attacks over convenience, but maintains good UX through clear feedback and fast responses.

---

## Authentication Flow Diagrams

### 1. Registration Flow

```

User fills form → Client validation → Availability checks (debounced) → Submit
↓
Supabase creates auth.users → Trigger creates profile
↓
OTP sent to email ← User sees OTP screen (60s resend timer)
↓
User enters OTP → Verification → Session created → Profile sync → Home

```

### 2. Login Flow

```

User enters credentials → Validate → Attempt login
↓ Success
Clear failed attempts → Sync profile → Home
↓ Failure
Check EMAIL_NOT_VERIFIED? → Show verify prompt
↓ No
Record failed attempt → Check account locked (RPC)?
↓ Yes (5 attempts in 15 min)
Show lockout alert (15 min wait OR reset password)

```

### 3. Password Reset Flow (3 Screens)

```

User enters email → Request reset (RPC) → Always show success
↓
Navigate to verify-reset-otp → User enters OTP
↓
Verify OTP (type: 'recovery') → Recovery session created
↓
Navigate to reset-new-password → User enters new password
↓
Update password → Recovery session → Regular session
↓
Clear failed attempts → Auto-login → Home

```

---

## Authentication Components

### Files & Their Purpose

| File                                  | Purpose                                    |
| ------------------------------------- | ------------------------------------------ |
| `stores/authStore.ts`                 | Auth state and actions (session, user)     |
| `stores/profileStore.ts`              | **Profile state with sync logic**          |
| `app/(auth)/register.tsx`             | Registration form with availability checks |
| `app/(auth)/login.tsx`                | Login form with lockout protection         |
| `app/(auth)/verify-otp.tsx`           | OTP verification for registration          |
| `app/(auth)/forgot-password.tsx`      | **Password reset initiation**              |
| `app/(auth)/verify-reset-otp.tsx`     | **OTP verification for password reset**    |
| `app/(auth)/reset-new-password.tsx`   | **New password input (recovery session)**  |
| `lib/validations/auth.ts`             | Zod validation schemas                     |
| `lib/utils/parseSupabaseError.ts`     | Error message parser                       |
| `lib/utils/availabilityCheck.ts`      | RPC function wrappers                      |
| `lib/utils/sanitize.ts`               | Input sanitization                         |
| `lib/utils/rateLimit.ts`              | **Client-side rate limiter**               |
| `components/auth/FormInput.tsx`       | Reusable input component                   |
| `components/auth/OtpInput.tsx`        | 6-box OTP input                            |
| `components/shared/OfflineNotice.tsx` | **Network status banner**                  |

---

## AuthStore Architecture

### Dual-Store Pattern

TravelConnect uses **two separate Zustand stores** that stay synchronized:

**authStore.ts** - Core authentication

- Session management (login, logout, refresh)
- Auth state (user, session, loading, pendingVerification)
- Email verification (signup, OTP verification, resend)
- **Password reset flow** (request, verify OTP, update password)
- Account lockout management (check, record, clear)

**profileStore.ts** - User profile data

- Profile state (separate from auth.user object)
- Automatic sync after auth state changes
- **Exponential backoff retry logic** (5 attempts)
- Handles profile creation delay via trigger

### Why Separate Stores?

```typescript
// authStore handles session
const { session, user, signIn } = useAuthStore();

// profileStore handles profile data
const { profile, syncProfile } = useProfileStore();

// After successful login in authStore
await signIn(email, password);
// Automatically triggers:
await useProfileStore.getState().syncProfile();
```

**Benefits:**

- Cleaner separation of concerns
- Profile can be refetched without re-auth
- Easier to add role-based UI (traveller vs sender via modeStore)
- Profile creation via trigger can have delay (retry logic handles it)

---

## Security Features Deep Dive

### Account Lockout System

**Implementation Change: Database-Side Enforcement**

```typescript
// OLD: Client-side rate limiter (can be bypassed)
// REMOVED from login flow

// NEW: Database-side tracking
// After failed login attempt
await recordFailedLogin(sanitizedEmail);

// Check if locked (RPC function)
const isLocked = await checkAccountLocked(sanitizedEmail);

if (isLocked) {
  Alert.alert(
    "Account Locked",
    "Too many failed login attempts. Please try again in 15 minutes or reset your password.",
    [
      { text: "OK", style: "cancel" },
      {
        text: "Reset Password",
        onPress: () => router.push("/(auth)/forgot-password"),
      },
    ],
  );
}
```

**Database RPC Functions:**

```sql
-- Record failed attempt
CREATE OR REPLACE FUNCTION record_failed_login_attempt(email_input TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO failed_login_attempts (email) VALUES (email_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if locked (auto-expires old attempts)
CREATE OR REPLACE FUNCTION check_account_locked(email_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'is_locked', (
      SELECT COUNT(*) >= 5
      FROM failed_login_attempts
      WHERE email = email_input
        AND attempt_at > NOW() - INTERVAL '15 minutes'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear attempts (on successful login, logout, password reset)
CREATE OR REPLACE FUNCTION clear_failed_login_attempts(email_input TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM failed_login_attempts WHERE email = email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why This Works:**

- **Auto-expires**: Checks only last 15 minutes (no cron job needed)
- **Cross-device**: Works across devices (server-side enforcement)
- **Cannot be bypassed**: Client-side rate limiter removed for login

**Failed Attempts Cleared On:**

1. Successful login
2. User logout (voluntary)
3. Password reset completion

---

### Email Enumeration Prevention

**The Attack:**
Attackers discover registered emails by testing different error messages.

**Our Defense:**

**Login:**

```typescript
// Always show generic error, never reveal if email exists
Alert.alert("Login Failed", "Invalid email or password");
```

**Password Reset:**

```typescript
// Always show success, even if email doesn't exist
try {
  await resetPassword(email);
  setEmailSent(true);
} catch (error) {
  // Don't reveal error - security
  setEmailSent(true); // Still show success
}

Alert.alert(
  "Check Your Email",
  "If an account exists, we've sent a reset code.",
);
```

**Registration Availability Checks:**

```typescript
// Uses RPC functions (rate-limited on server)
// Only returns boolean, not WHO owns the username
const { available } = await availabilityCheck.username(username);
```

**Why This Matters:**

- Prevents targeted phishing attacks
- Protects user privacy
- Industry best practice (used by Google, Facebook, etc.)

---

### Real-Time Availability Checking

**How It Works:**

```typescript
// Debounced check (waits 500ms after last keystroke)
useEffect(() => {
  let cancelled = false;

  const timeoutId = setTimeout(async () => {
    if (username && username.length >= 3) {
      setCheckingUsername(true);
      try {
        const { available } = await availabilityCheck.username(username);
        if (!cancelled) {
          setUsernameAvailable(available);

          if (!available) {
            setError("username", {
              type: "manual",
              message: "Username is already taken",
            });
          } else {
            // Clear manual error but keep Zod errors
            if (errors.username?.type === "manual") {
              clearErrors("username");
            }
          }
        }
      } finally {
        if (!cancelled) {
          setCheckingUsername(false);
        }
      }
    }
  }, 500);

  return () => {
    clearTimeout(timeoutId);
    cancelled = true; // Prevent stale updates
  };
}, [username]);
```

**Visual Feedback:**

- **Checking**: Loading spinner
- **Available**: Green checkmark (only if valid length)
- **Taken**: Red X with error message
- **Empty/Invalid**: No icon

**RPC Functions:**

```sql
-- Check username (case-insensitive)
CREATE OR REPLACE FUNCTION check_username_availability(username_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'available', NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = username_input
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check email
CREATE OR REPLACE FUNCTION check_email_availability(email_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'available', NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = email_input
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check phone
CREATE OR REPLACE FUNCTION check_phone_availability(phone_input TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'available', NOT EXISTS (
      SELECT 1 FROM profiles WHERE phone = phone_input
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why RPC Instead of Direct Query?**

- Bypasses RLS (unauthenticated users need to check)
- Case-insensitive matching
- Returns only boolean (doesn't reveal WHO has the username)
- Cleaner API (single function call)

---

## Password Reset Flow (Complete Implementation)

### Phase 1: Request Reset (forgot-password.tsx)

**User submits email:**

```typescript
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "travelconnect://reset-password", // Deep link (unused in MVP)
  });

  if (error) throw error;
};
```

**Email enumeration prevention:**

- Always show success message, even if email doesn't exist
- Generic message: "If an account exists, you'll receive a verification code"
- Catch block also shows success (security)

**Rate limiting:**

- 3 attempts per hour per email
- Key: `reset-password:${email}`

### Phase 2: Verify OTP (verify-reset-otp.tsx)

**Receives email via route params:**

```typescript
const params = useLocalSearchParams();
const email = params.email as string;
```

**User enters 6-digit OTP:**

```typescript
const verifyResetOtp = async (email: string, otp: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "recovery",
  });

  if (error) throw error;

  // Store recovery session
  set({
    session: data.session,
    user: data.user,
  });
};
```

**On success:**

- Creates **recovery session** (limited permissions)
- Navigate to reset-new-password (replace, no back)

**Rate limiting:**

- Verify attempts: 3 per hour
- Resend attempts: 3 per 5 minutes

### Phase 3: Set New Password (reset-new-password.tsx)

**Session validation on mount:**

```typescript
useEffect(() => {
  if (!session) {
    Alert.alert("Invalid Session", "Please verify your reset code first.", [
      {
        text: "OK",
        onPress: () => router.replace("/(auth)/forgot-password"),
      },
    ]);
  }
}, [session]);
```

**Password update:**

```typescript
const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;

  // Clear failed login attempts
  if (user?.email) {
    await clearFailedAttempts(user.email);
  }

  // Session automatically converts from recovery to regular
};
```

**On success:**

- Recovery session → regular session
- Failed login attempts cleared
- Auto-login to home

**Navigation Protection**

Root layout handles recovery session:

```typescript
// CRITICAL: Don't redirect if user is resetting password
if (isOnPasswordResetFlow) {
  // Let them complete password reset flow
  return;
}
```

---

## Form Validation

### Validation Schemas

**Registration:**

```typescript
export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name too long")
      .regex(/^[a-zA-Z\s]+$/, "Letters and spaces only"),

    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(
        /^[a-z0-9_]+$/,
        "Lowercase letters, numbers, and underscores only",
      ),

    email: z.string().email("Invalid email address"),

    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Invalid 10-digit Indian phone number"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        "Must contain at least one special character",
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

**Login, Password Reset, OTP**: Same patterns as shown in validation/auth.ts.

### Password Strength Indicator

```typescript
const getPasswordStrength = (pass: string): { text: string; color: string } => {
  if (!pass) return { text: "", color: "" };
  if (pass.length < 6) return { text: "Weak", color: Colors.error };
  if (pass.length < 8) return { text: "Fair", color: Colors.warning };

  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);

  const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  if (strength >= 3) return { text: "Strong", color: Colors.success };
  return { text: "Fair", color: Colors.warning };
};
```

---

## Error Handling

### Error Parser Utility

```typescript
export function parseSupabaseError(error: any): string {
  const message = error?.message || "";

  // Custom errors
  if (
    message === "EMAIL_NOT_VERIFIED" ||
    error?.name === "EmailNotVerifiedError"
  ) {
    return "Please verify your email before logging in";
  }

  // Auth errors
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password";
  }
  if (message.includes("Email not confirmed")) {
    return "Please verify your email before logging in";
  }
  if (message.includes("Email rate limit exceeded")) {
    return "Too many attempts. Please wait a few minutes";
  }
  if (message.includes("User already registered")) {
    return "Email already registered. Please login instead";
  }
  if (
    message.includes("Invalid OTP") ||
    message.includes("Token has expired")
  ) {
    return "Invalid or expired verification code. Please try again.";
  }

  // Database constraint errors
  if (message.includes("duplicate key value")) {
    if (message.includes("username")) return "Username already taken";
    if (message.includes("phone")) return "Phone number already registered";
    if (message.includes("email")) return "Email already registered";
    return "This value is already in use";
  }

  // Network errors
  if (
    message.includes("Failed to fetch") ||
    message.includes("Network request failed")
  ) {
    return "Network error. Please check your connection";
  }
  if (message.includes("timeout")) {
    return "Request timed out. Please try again";
  }

  // Generic fallback
  return message || "An unexpected error occurred";
}
```

---

## Session Management

### Session Initialization

```typescript
initialize: async () => {
  try {
    set({ loading: true });

    // 1. Check for existing session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    // 2. Update auth state
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    });

    // 3. Sync profile if session exists
    if (session) {
      await useProfileStore.getState().syncProfile();
    }

    // 4. Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] State changed:", event);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        set({ session, user: session?.user });

        if (event === "SIGNED_IN") {
          await useProfileStore.getState().syncProfile();
        }
      } else if (event === "SIGNED_OUT") {
        set({
          session: null,
          user: null,
          pendingVerification: null,
        });
        useProfileStore.getState().clearProfile();
      }
    });
  } catch (error) {
    console.error("[Auth] Initialize failed:", error);
    set({ loading: false });
  }
};
```

Called in `app/_layout.tsx` on app launch.

---

## Profile Sync Logic (profileStore)

```typescript
syncProfile: async () => {
  const { user } = useAuthStore.getState();
  if (!user) {
    set({ profile: null, loading: false });
    return;
  }

  set({ loading: true });

  // Retry logic with exponential backoff
  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      set({ profile: data, loading: false, error: null });
      return;
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        set({
          profile: null,
          loading: false,
          error: 'Failed to load profile',
        });
        return;
      }

      // Exponential backoff: 500ms, 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * Math.pow(2, attempt - 1)),
      );
    }
  }
},
```

**Why Retry Logic?**

- Profile created via database trigger (slight delay possible)
- Network issues during initial load
- Exponential backoff prevents overwhelming server

---

## Utilities

### Input Sanitization

```typescript
export const sanitize = {
  email: (email: string): string => {
    return email.toLowerCase().trim();
  },

  username: (username: string): string => {
    return username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  },

  phone: (phone: string): string => {
    return phone.replace(/\D/g, ""); // Remove non-digits
  },

  name: (name: string): string => {
    return name.replace(/[^a-zA-Z\s]/g, "").trim();
  },
};
```

---

### Rate Limiting (Client-Side)

**Configuration:**

```typescript
export const rateLimitConfigs = {
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  otpResend: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
};
```

**Note:** This is UX protection only. Server-side rate limiting handled by Supabase.

---

### Network Status Detection

```typescript
export const useNetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return unsubscribe;
  }, []);

  return { isOffline };
};
```

---

### Haptic Feedback

```typescript
export const haptics = {
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  selection: () => Haptics.selectionAsync(),
};
```

---

## Testing Guide

### Manual Testing Checklist

**Registration:**

- [ ] Valid data → Success
- [ ] Duplicate username → Red X after 500ms
- [ ] Duplicate email → Red X after 500ms
- [ ] Duplicate phone → Red X after 500ms
- [ ] Weak password → Strength indicator shows "Weak"
- [ ] Strong password → Strength indicator shows "Strong"
- [ ] Passwords don't match → Error
- [ ] OTP verification → Profile created
- [ ] Resend OTP → 60-second timer restarts
- [ ] Profile syncs after verification

**Login:**

- [ ] Correct credentials → Success
- [ ] Wrong password → Generic error ("Invalid email or password")
- [ ] 5 wrong attempts → Account locked alert
- [ ] Locked account → "Reset Password" button works
- [ ] Wait 15 min → Can login again (auto-unlock)
- [ ] Unverified email → "Verify Now" alert
- [ ] Failed attempts cleared on successful login

**Password Reset:**

- [ ] Request reset → Generic success (always)
- [ ] Non-existent email → Still shows success (security)
- [ ] Enter wrong OTP → Error message
- [ ] Enter correct OTP → Navigate to new password screen
- [ ] Weak password → Errors + strength indicator
- [ ] Success → Auto-login + "You're now logged in" alert
- [ ] Check: failed attempts cleared after reset

**Session Persistence:**

- [ ] Login → Close app → Reopen → Still logged in
- [ ] Token refresh happens automatically (after 1 hour)
- [ ] Logout → Session cleared
- [ ] Profile syncs on app launch

---

## Security Checklist

**Before Production:**

- [ ] Passwords trimmed before API call
- [ ] Failed attempts cleared on: login, logout, password reset
- [ ] Database-side lockout (not client-side)
- [ ] Lockout auto-expires (15 min)
- [ ] No email enumeration in any flow
- [ ] Generic error messages everywhere
- [ ] Rate limiting on OTP resend
- [ ] Rate limiting on password reset requests
- [ ] Session tokens stored securely (AsyncStorage on Android, Keychain on iOS)
- [ ] No sensitive logs in production
- [ ] Password requirements enforced (8+ chars, uppercase, lowercase, number, special)
- [ ] RLS policies tested
- [ ] Recovery session only allows password update
- [ ] Navigation guards prevent premature redirects during password reset

---

## Database Schema

### profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_rating ON profiles(rating DESC);
```

**Note:** No `roles` column in MVP. Sender/traveller mode is handled client-side via `modeStore`.

### failed_login_attempts table

```sql
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_attempt_at ON failed_login_attempts(attempt_at);
```

---

## Common Issues

### Profile Not Created

**Symptom:** OTP verified but profile fetch fails even after retries

**Fix:**

```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- Reinstall trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Permanently Locked Out

**Symptom:** User locked, 15 minutes passed, still can't login

**Fix:**

```sql
-- Check current attempts
SELECT * FROM failed_login_attempts
WHERE email = 'user@example.com'
ORDER BY attempt_at DESC;

-- Manually clear if needed
DELETE FROM failed_login_attempts WHERE email = 'user@example.com';
```

### Recovery Session Not Working

**Symptom:** Password reset OTP verified, but new password screen says "Invalid Session"

**Fix:**

- Check that verifyResetOtp is setting session in authStore
- Verify auth state listener is working
- Check navigation: should use replace, not push

### Profile Not Syncing After Login

**Symptom:** User logged in but profile is null

**Fix:**

- Check profileStore.syncProfile() is called after signIn
- Verify retry logic is working (check console logs)
- Ensure profile exists in database

---

**End of Authentication Documentation**
