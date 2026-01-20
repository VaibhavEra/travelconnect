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

- ✅ Email/password registration with OTP verification
- ✅ Login with account lockout protection (5 attempts, 15-minute cooldown)
- ✅ Password reset via OTP (no magic links)
- ✅ Session persistence with automatic token refresh
- ✅ Email enumeration prevention
- ✅ Real-time field availability checking
- ✅ Client-side and server-side validation
- ✅ Rate limiting on sensitive operations

**Design Philosophy:** Security first, UX second. Every auth decision prioritizes preventing attacks over convenience, but maintains good UX through clear feedback and fast responses.

---

## Authentication Flow Diagrams

### 1. Registration Flow

```
User fills form → Client validation → Availability checks → Submit
                                                            ↓
                    Supabase creates auth.users → Trigger creates profile
                                                            ↓
                    OTP sent to email ← User sees OTP screen
                                                            ↓
                    User enters OTP → Verification → Session created → Home
```

### 2. Login Flow

```
User enters credentials → Validate → Check account locked?
                                             ↓ No
                    Attempt login → Success? → Clear failed attempts → Home
                                        ↓ No
                    Record failed attempt → Check locked? → Show error/lockout
```

### 3. Password Reset Flow

```
User enters email → OTP sent → Generic success message
                                         ↓
                    Enter OTP → Verify → Recovery session
                                         ↓
                    New password → Validate → Update → Auto-login → Home
```

---

## Authentication Components

### Files & Their Purpose

| File                                | Purpose                                    |
| ----------------------------------- | ------------------------------------------ |
| `stores/authStore.ts`               | Zustand store with all auth logic          |
| `app/(auth)/register.tsx`           | Registration form with availability checks |
| `app/(auth)/login.tsx`              | Login form with lockout protection         |
| `app/(auth)/verify-otp.tsx`         | OTP verification for registration          |
| `app/(auth)/forgot-password.tsx`    | Password reset initiation                  |
| `app/(auth)/verify-reset-otp.tsx`   | OTP verification for reset                 |
| `app/(auth)/reset-new-password.tsx` | New password input                         |
| `lib/validations/auth.ts`           | Zod validation schemas                     |
| `lib/utils/parseSupabaseError.ts`   | Error message parser                       |
| `lib/utils/availabilityCheck.ts`    | RPC function wrappers                      |
| `lib/utils/sanitize.ts`             | Input sanitization                         |
| `components/FormInput.tsx`          | Reusable input component                   |
| `components/OtpInput.tsx`           | 6-box OTP input                            |

---

## Security Features Deep Dive

### Account Lockout System

**Implementation:**

```typescript
// After failed login attempt
await recordFailedLogin(sanitizedEmail);

// Check if locked
const isLocked = await checkAccountLocked(sanitizedEmail);

if (isLocked) {
  Alert.alert(
    "Account Locked",
    "Too many failed attempts. Try again in 15 minutes or reset your password.",
  );
}
```

**Database function (auto-expires):**

```sql
CREATE FUNCTION is_account_locked(user_email text)
RETURNS boolean AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM failed_login_attempts
  WHERE email = user_email
    AND attempted_at > NOW() - INTERVAL '15 minutes';

  RETURN attempt_count >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why This Works:**

- Checks only last 15 minutes (auto-expires old attempts)
- No manual unlock needed
- Works across devices (server-side enforcement)
- Prevents brute-force attacks effectively

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
Alert.alert(
  "Check Your Email",
  "If an account exists, we've sent a reset code.",
);
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
const checkAvailability = debounce(async (field: string, value: string) => {
  setCheckingAvailability((prev) => ({ ...prev, [field]: true }));

  try {
    const isAvailable = await availabilityCheck[field](value);

    setAvailability((prev) => ({
      ...prev,
      [field]: isAvailable ? "available" : "taken",
    }));
  } finally {
    setCheckingAvailability((prev) => ({ ...prev, [field]: false }));
  }
}, 500);
```

**RPC Functions:**

```sql
-- Check username (case-insensitive)
CREATE FUNCTION check_username_available(check_username text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = LOWER(check_username)
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

## Form Validation

### Validation Schemas

**Registration:**

```typescript
export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name too long"),

    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters")
      .regex(
        /^[a-z0-9_]+$/,
        "Lowercase letters, numbers, and underscores only",
      ),

    email: z.email("Invalid email address"),

    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Invalid 10-digit Indian phone number"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[0-9]/, "Must contain number")
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        "Must contain special character",
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

### Password Strength Indicator

```typescript
const getPasswordStrength = (pass: string): { text: string; color: string } => {
  if (!pass) return { text: "", color: "" };
  if (pass.length < 6) return { text: "Weak", color: "#FF3B30" };
  if (pass.length < 8) return { text: "Fair", color: "#FF9500" };

  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);

  const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  if (strength >= 3) return { text: "Strong", color: "#34C759" };
  return { text: "Fair", color: "#FF9500" };
};
```

Displayed in registration and password reset screens.

---

## Session Management

### Session Initialization

```typescript
initialize: async () => {
  try {
    // 1. Check for existing session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    // 2. If session exists, fetch profile
    if (session) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      set({
        session,
        user: session.user,
        profile,
        loading: false,
      });
    } else {
      set({ loading: false });
    }

    // 3. Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      log.info("Auth state changed", event);

      if (event === "SIGNED_IN" && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        set({
          session,
          user: session.user,
          profile,
          loading: false,
        });
      } else if (event === "SIGNED_OUT") {
        set({
          session: null,
          user: null,
          profile: null,
          loading: false,
        });
      } else if (event === "TOKEN_REFRESHED" && session) {
        set({ session, user: session.user });
      }
    });
  } catch (error) {
    log.error("Initialize auth failed", error);
    set({ loading: false });
  }
};
```

Called in `app/_layout.tsx` on app launch.

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

## Utilities

### Input Sanitization

```typescript
export const sanitize = {
  email: (email: string): string => {
    return email.toLowerCase().trim();
  },

  username: (username: string): string => {
    return username.toLowerCase().trim();
  },

  phone: (phone: string): string => {
    return phone.replace(/\D/g, ""); // Remove non-digits
  },
};
```

**Usage in forms:**

```typescript
<FormInput
  value={email}
  onChangeText={(text) => onChange(sanitize.email(text))}
/>
```

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

Shows offline banner and prevents API calls when disconnected.

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

**Usage:**

```typescript
// On successful login
haptics.success();

// On error
haptics.error();

// On button press
haptics.light();
```

---

## Testing Guide

### Manual Testing Checklist

**Registration:**

- [ ] Valid data → Success
- [ ] Duplicate username → Red X after 500ms
- [ ] Duplicate email → Red X
- [ ] Weak password → Validation errors
- [ ] Passwords don't match → Error
- [ ] OTP verification → Profile created

**Login:**

- [ ] Correct credentials → Success
- [ ] Wrong password → Generic error
- [ ] 5 wrong attempts → Account locked
- [ ] Wait 15 min → Can login
- [ ] Unverified email → Proper alert

**Password Reset:**

- [ ] Request reset → Generic success
- [ ] Enter OTP → New password screen
- [ ] Weak password → Errors
- [ ] Success → Auto-login
- [ ] Check: failed attempts cleared

**Logout:**

- [ ] 3 failed attempts
- [ ] Reset password
- [ ] Logout
- [ ] Wrong password → Counter at 1 (not 4)

---

## Security Checklist

**Before Production:**

- [ ] Passwords trimmed before API call
- [ ] Failed attempts cleared on: login, logout, reset
- [ ] Lockout auto-expires (15 min)
- [ ] No email enumeration
- [ ] Generic error messages
- [ ] Rate limiting on OTP resend
- [ ] Session tokens secure
- [ ] No sensitive logs in production
- [ ] Password requirements enforced
- [ ] RLS policies tested

---

## Common Issues

### Profile Not Created

**Symptom:** OTP verified but profile fetch fails

**Fix:**

```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Reinstall
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Permanently Locked Out

**Fix:**

```sql
-- Clear attempts
DELETE FROM failed_login_attempts WHERE email = 'user@example.com';
```

---

**End of Authentication Documentation**
