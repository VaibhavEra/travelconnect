# TravelConnect Frontend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Routing & Navigation](#routing--navigation)
4. [Component Library](#component-library)
5. [State Management](#state-management)
6. [Form Handling](#form-handling)
7. [Styling Strategy](#styling-strategy)
8. [TypeScript Patterns](#typescript-patterns)
9. [Performance Optimization](#performance-optimization)

---

## Overview

TravelConnect's frontend is built with:

- **Expo (React Native)**: Cross-platform mobile framework
- **Expo Router**: File-based routing system
- **TypeScript**: Full type safety
- **Zustand**: Lightweight state management (dual-store architecture)
- **React Hook Form**: Form state and validation
- **Zod**: Schema validation with TypeScript inference

**Design Principles:**

- Component reusability (DRY)
- Type safety everywhere
- Performance-first (minimize re-renders)
- Accessibility built-in
- Offline-friendly

---

## Project Structure

```
app/
├── (auth)/                    # Auth screen group (public)
│   ├── _layout.tsx           # Auth layout (Stack navigator)
│   ├── register.tsx          # Registration with availability checks
│   ├── login.tsx             # Login with account lockout
│   ├── verify-otp.tsx        # Email OTP verification (registration)
│   ├── forgot-password.tsx   # Password reset initiation
│   ├── verify-reset-otp.tsx  # Reset OTP verification
│   └── reset-new-password.tsx # New password screen (recovery session)
│
├── (tabs)/                    # Main app tabs (protected)
│   ├── _layout.tsx           # Tab bar layout
│   ├── index.tsx             # Home/trips feed
│   ├── search.tsx            # Trip search
│   ├── requests.tsx          # Package requests
│   └── profile.tsx           # User profile
│
├── _layout.tsx               # Root layout (auth guard + recovery session handling)
└── index.tsx                 # Landing/redirect screen


components/
├── auth/                      # Auth-specific components
│   ├── FormInput.tsx         # Text input with validation
│   └── OtpInput.tsx          # 6-box OTP input
└── shared/                    # Shared components
    └── OfflineNotice.tsx     # Network status banner


lib/
├── supabase.ts               # Supabase client config
├── utils/
│   ├── availabilityCheck.ts  # RPC function wrappers
│   ├── haptics.ts            # Haptic feedback helpers
│   ├── network.ts            # Network status hook
│   ├── parseSupabaseError.ts # Error message parser
│   ├── rateLimit.ts          # Client-side rate limiter
│   └── sanitize.ts           # Input sanitization
└── validations/
    └── auth.ts               # Zod schemas for auth


stores/
├── authStore.ts              # Auth state (session, user, actions)
└── profileStore.ts           # Profile state (synced with authStore)


styles/
├── theme.ts                  # Design tokens (Colors, Spacing, Typography, BorderRadius)
├── commonStyles.ts           # Reusable StyleSheet styles
└── index.ts                  # Barrel export


types/
├── database.types.ts         # Auto-generated from Supabase
└── global.d.ts               # Global type declarations
```

---

## Routing & Navigation

### File-Based Routing (Expo Router)

Expo Router uses Next.js-style file-based routing:

```
File: app/(auth)/login.tsx
Route: /(auth)/login
URL: travelconnect:///(auth)/login
```

### Route Groups

**Protected Routes:**

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  const { session } = useAuthStore();


  // Redirect to login if not authenticated
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }


  return <Tabs>{/* ... */}</Tabs>;
}
```

**Public Routes:**

```typescript
// app/(auth)/_layout.tsx
export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen
        name="verify-otp"
        options={{
          headerShown: false,
          gestureEnabled: false // Prevent swipe back
        }}
      />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen
        name="verify-reset-otp"
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
      />
      <Stack.Screen
        name="reset-new-password"
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
      />
    </Stack>
  );
}
```

### Root Layout with Auth Guard

**Recovery Session Protection:**

```typescript
// app/_layout.tsx
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading, initialize } = useAuthStore();


  useEffect(() => {
    initialize();
  }, [initialize]);


  useEffect(() => {
    if (loading) return;


    const inAuthGroup = segments === "(auth)";


    // Check if user is on password reset screens
    const isOnPasswordResetFlow =
      segments === "ve"verify-reset-otp" ||
      segments === "reset-new-password";


    if (!session && !inAuthGroup) {
      // No session and not in auth screens → redirect to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Has session and in auth screens


      // CRITICAL: Don't redirect if user is resetting password
      if (isOnPasswordResetFlow) {
        // Let them complete password reset flow
        return;
      }


      // Otherwise redirect to home (they're logged in)
      router.replace("/");
    }
  }, [session, loading]); // Removed segments from deps to prevent loops


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }


  return <Slot />;
}
```

**Why Recovery Session Protection?**

- Recovery session looks like regular session to auth guard
- Without segments check, user would be redirected to home mid-reset
- `isOnPasswordResetFlow` prevents premature redirect

### Navigation

```typescript
import { router } from "expo-router";

// Push (adds to stack)
router.push("/(auth)/register");

// Replace (replaces current screen, no back button)
router.replace("/");

// Go back
router.back();

// Dismiss modal/sheet
router.dismiss();
```

### Passing Parameters

```typescript
// Navigate with params
router.push({
  pathname: "/(auth)/verify-reset-otp",
  params: { email: "user@example.com" },
});

// Receive params
import { useLocalSearchParams } from "expo-router";

const { email } = useLocalSearchParams();
```

---

## Component Library

### 1. FormInput Component

**Purpose:** Reusable text input with validation, error display, and icons.

**Location:** `components/auth/FormInput.tsx`

**Props:**

```typescript
interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  touched?: boolean;
  rightIcon?: React.ReactNode;
}
```

**Usage:**

```typescript
<FormInput
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={(text) => onChange(sanitize.email(text))}
  error={errors.email?.message}
  touched={touchedFields.email}
  keyboardType="email-address"
  autoCapitalize="none"
  rightIcon={
    checkingEmail ? (
      <ActivityIndicator size="small" color={Colors.text.secondary} />
    ) : emailAvailable === true ? (
      <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
    ) : emailAvailable === false ? (
      <Ionicons name="close-circle" size={24} color={Colors.error} />
    ) : null
  }
/>
```

**Features:**

- Shows label above input
- Displays error message below (only when touched and error exists)
- Accepts custom right icon (availability check, password toggle, etc.)
- Forwards all TextInput props
- Ref support for focus management
- Focus state styling (2px border)

**Implementation:**

```typescript
const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, touched, rightIcon, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const showError = touched && error;


    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={ref}
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              showError && styles.inputError,
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor={Colors.text.placeholder}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
        {showError && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);


FormInput.displayName = "FormInput";
```

---

### 2. OtpInput Component

**Purpose:** 6-box OTP input with auto-focus and keyboard handling.

**Location:** `components/auth/OtpInput.tsx`

**Props:**

```typescript
interface OtpInputProps {
  length: number; // Number of boxes (usually 6)
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
}
```

**Usage:**

```typescript
<OtpInput
  length={6}
  value={otp}
  onChange={setOtp}
  disabled={loading}
/>
```

**Features:**

- Individual boxes for each digit
- Auto-focus next box on input
- Auto-focus previous box on backspace (when current box is empty)
- Only allows numeric input
- Visual states: default, focused (blue), filled (green)
- `selectTextOnFocus` for easy editing

**Implementation:**

```typescript
export default function OtpInput({
  length,
  value,
  onChange,
  disabled,
}: OtpInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);


  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;


    const newOtp = value.split("");
    newOtp[index] = text;
    const otpString = newOtp.join("");


    onChange(otpString);


    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };


  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };


  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.input,
            focusedIndex === index && styles.inputFocused,
            value[index] && styles.inputFilled,
          ]}
          value={value[index] || ""}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          editable={!disabled}
        />
      ))}
    </View>
  );
}
```

---

### 3. OfflineNotice Component

**Purpose:** Banner that appears when device is offline.

**Location:** `components/shared/OfflineNotice.tsx`

**Usage:**

```typescript
// Add to top of screen layout
<OfflineNotice />
```

**Implementation:**

```typescript
export default function OfflineNotice() {
  const { isOffline } = useNetworkStatus();


  if (!isOffline) return null;


  return (
    <View style={styles.container}>
      <Ionicons
        name="cloud-offline-outline"
        size={16}
        color={Colors.text.inverse}
      />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  text: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
```

---

## State Management

### Dual-Store Architecture

**Why Two Stores?**

TravelConnect uses separate stores for auth and profile:

1. **authStore.ts**: Session, user, auth actions
2. **profileStore.ts**: Profile data, sync logic

**Benefits:**

- Cleaner separation of concerns
- Profile can be refetched without re-auth
- Easier to add role-based UI (traveller vs sender)
- Profile creation via trigger can have delay (retry logic handles it)

### authStore Pattern

```typescript
interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  loading: boolean;
  pendingVerification: { email: string; userId: string } | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (data: RegisterData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  resendEmailOtp: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyResetOtp: (email: string, otp: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  checkAccountLocked: (email: string) => Promise<boolean>;
  recordFailedLogin: (email: string) => Promise<void>;
  clearFailedAttempts: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  session: null,
  user: null,
  loading: true,
  pendingVerification: null,

  // Actions
  initialize: async () => {
    try {
      set({ loading: true });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      if (session) {
        await useProfileStore.getState().syncProfile();
      }

      // Auth state listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          set({ session, user: session?.user });
          if (event === "SIGNED_IN") {
            await useProfileStore.getState().syncProfile();
          }
        } else if (event === "SIGNED_OUT") {
          set({ session: null, user: null, pendingVerification: null });
          useProfileStore.getState().clearProfile();
        }
      });
    } catch (error) {
      console.error("[Auth] Initialize failed:", error);
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Clear failed attempts on success
    await get().clearFailedAttempts(email);

    // Sync profile
    await useProfileStore.getState().syncProfile();

    set({
      session: data.session,
      user: data.user,
    });
  },

  signOut: async () => {
    const { user } = get();

    // Clear failed attempts before signing out
    if (user?.email) {
      await get().clearFailedAttempts(user.email);
    }

    await supabase.auth.signOut();

    set({
      session: null,
      user: null,
      pendingVerification: null,
    });

    useProfileStore.getState().clearProfile();
  },
}));
```

### profileStore Pattern

```typescript
interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  syncProfile: () => Promise<void>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,
  error: null,

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
          .from("profiles")
          .select("*")
          .eq("id", user.id)
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
            error: "Failed to load profile",
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

  clearProfile: () => {
    set({ profile: null, loading: false, error: null });
  },
}));
```

**Using in Components:**

```typescript
// Auth state
const { session, signIn, signOut } = useAuthStore();

// Profile state
const { profile, syncProfile } = useProfileStore();

// Selective subscription (only re-renders when profile changes)
const profile = useProfileStore((state) => state.profile);

// Access outside components
const { signIn } = useAuthStore.getState();
```

---

## Form Handling

### React Hook Form + Zod

**Why This Combo?**

- Type-safe validation
- Automatic TypeScript inference
- Great performance (uncontrolled inputs)
- Easy error handling
- Real-time availability checking

**Setup:**

```typescript
const {
  control,
  handleSubmit,
  watch,
  setError,
  clearErrors,
  formState: { errors, touchedFields, isValid },
} = useForm<RegisterFormData>({
  resolver: zodResolver(registerSchema),
  mode: "onTouched", // Validate on blur
  defaultValues: {
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  },
});
```

**Controller Usage with Sanitization:**

```typescript
<Controller
  control={control}
  name="email"
  render={({ field: { onChange, onBlur, value } }) => (
    <FormInput
      label="Email"
      value={value}
      onChangeText={(text) => onChange(sanitize.email(text))}
      onBlur={onBlur}
      error={errors.email?.message}
      touched={touchedFields.email}
      keyboardType="email-address"
      autoCapitalize="none"
      rightIcon={
        checkingEmail ? (
          <ActivityIndicator size="small" />
        ) : emailAvailable === true ? (
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
        ) : emailAvailable === false ? (
          <Ionicons name="close-circle" size={24} color={Colors.error} />
        ) : null
      }
    />
  )}
/>
```

**Availability Check with Manual Errors:**

```typescript
const username = watch("username");

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
  }, 500); // 500ms debounce

  return () => {
    clearTimeout(timeoutId);
    cancelled = true; // Prevent stale updates
  };
}, [username]);
```

**Submit Handler:**

```typescript
const onSubmit = async (data: RegisterFormData) => {
  // Double-check availability before submitting
  if (usernameAvailable === false) {
    haptics.error();
    Alert.alert("Error", "Username is already taken. Please choose another.");
    return;
  }


  // Check network
  if (isOffline) {
    haptics.error();
    Alert.alert("No Internet", "Please check your internet connection.");
    return;
  }


  // Rate limiting check
  const rateCheck = rateLimiter.check("signup", rateLimitConfigs.signup);
  if (!rateCheck.allowed) {
    haptics.error();
    Alert.alert(
      "Too Many Attempts",
      `Please wait ${rateCheck.retryAfter} before trying again.`,
    );
    return;
  }


  setLoading(true);
  try {
    await signUp(data);
    haptics.success();
    router.push("/(auth)/verify-otp");
  } catch (error: any) {
    haptics.error();
    Alert.alert("Registration Failed", parseSupabaseError(error));
  } finally {
    setLoading(false);
  }
};


<TouchableOpacity
  style={[styles.button, !canSubmit && styles.buttonDisabled]}
  onPress={handleSubmit(onSubmit)}
  disabled={!canSubmit}
>
  {loading ? (
    <ActivityIndicator color={Colors.text.inverse} />
  ) : (
    <Text style={styles.buttonText}>Create Account</Text>
  )}
</TouchableOpacity>
```

---

### Validation Timing

**Options:**

```typescript
mode: "onChange"; // Validates on every keystroke (annoying)
mode: "onBlur"; // Validates when leaving field
mode: "onTouched"; // Validates after blur (our choice)
mode: "onSubmit"; // Validates only on submit (too late)
```

**Why `onTouched`?**

- Doesn't show errors while typing
- Shows errors immediately after leaving field
- Re-validates on change after first blur
- Best balance of UX and immediate feedback

---

## Styling Strategy

### Centralized Design System

**Location:** `styles/` directory

**Files:**

- `theme.ts`: Design tokens (Colors, Spacing, Typography, BorderRadius, Shadows, Layout)
- `commonStyles.ts`: Reusable StyleSheet styles
- `index.ts`: Barrel export

**theme.ts:**

```typescript
export const Colors = {
  primary: "#007AFF",
  primaryDark: "#0051D5",
  primaryLight: "#4DA2FF",

  secondary: "#5856D6",
  secondaryDark: "#3634A3",
  secondaryLight: "#7D7AFF",

  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",
  info: "#007AFF",

  text: {
    primary: "#000000",
    secondary: "#666666",
    tertiary: "#999999",
    placeholder: "#999999",
    inverse: "#FFFFFF",
  },

  background: {
    primary: "#FFFFFF",
    secondary: "#F5F5F5",
    tertiary: "#F9F9F9",
    overlay: "rgba(0, 0, 0, 0.5)",
  },

  border: {
    default: "#DDDDDD",
    light: "#EEEEEE",
    focus: "#007AFF",
    error: "#FF3B30",
  },

  disabled: "#CCCCCC",
  overlay: "rgba(0, 0, 0, 0.5)",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  weights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.lg,
  contentMaxWidth: 600,
  minTouchSize: 44,
} as const;
```

**commonStyles.ts:**

```typescript
import { StyleSheet } from "react-native";
import {
  BorderRadius,
  Colors,
  Layout,
  Shadows,
  Spacing,
  Typography,
} from "./theme";

export const commonStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  contentContainer: {
    flex: 1,
    padding: Layout.screenPadding,
  },

  // Typography
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  heading: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  body: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.normal,
    color: Colors.text.primary,
  },

  // Buttons
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: Layout.minTouchSize,
  },

  buttonPrimary: {
    backgroundColor: Colors.primary,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  // Cards
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
});
```

**Usage:**

```typescript
import { Colors, Spacing, Typography, BorderRadius } from "@/styles";
import { commonStyles } from "@/styles";

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
```

---

### StyleSheet Pattern

**Why StyleSheet.create?**

- Performance: Styles compiled once, not on every render
- Type safety: Catches typos in style properties
- Auto-complete: IDE suggestions for style properties
- Validation: Warns about invalid values

**Pattern:**

```typescript
import { StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/styles';


export default function MyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
});
```

**Conditional Styles:**

```typescript
<View style={[
  styles.button,
  loading && styles.buttonDisabled,
  error && styles.buttonError
]} />


const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonError: {
    backgroundColor: Colors.error,
  },
});
```

---

## TypeScript Patterns

### Supabase Type Generation

```bash
# Generate types from database schema
npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts
```

**Usage:**

```typescript
import { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type Package = Database["public"]["Tables"]["packages"]["Row"];
```

**Benefits:**

- Auto-complete for database columns
- Type errors if column doesn't exist
- Automatic updates when schema changes
- Type-safe RPC function calls

---

### Form Type Inference

```typescript
// Zod schema
export const registerSchema = z
  .object({
    full_name: z.string().min(2).max(50),
    username: z.string().min(3).max(30),
    email: z.email(),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Automatic TypeScript type
export type RegisterFormData = z.infer<typeof registerSchema>;

// Type-safe form
const onSubmit = async (data: RegisterFormData) => {
  // data.email is typed as string
  // data.password is typed as string
  // TypeScript validates all fields exist
};
```

---

### Component Props

```typescript
interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  touched?: boolean;
  rightIcon?: React.ReactNode;
}

const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, touched, rightIcon, ...props }, ref) => {
    // Implementation
  },
);
```

**Why Extend TextInputProps?**

- Inherits all native TextInput props
- Type-safe (TypeScript checks valid props)
- Auto-complete for props
- No need to redeclare common props

---

## Performance Optimization

### Memo Usage

**When to use React.memo:**

```typescript
// Expensive component that rarely changes
export default React.memo(TripCard, (prevProps, nextProps) => {
  return prevProps.trip.id === nextProps.trip.id;
});
```

**When NOT to use:**

- Components that change frequently
- Simple components (overhead > benefit)
- Components with children (children change often)

---

### useCallback for Event Handlers

```typescript
const handlePress = useCallback(() => {
  router.push('/details');
}, []); // Empty deps = stable reference


<Button onPress={handlePress} />
```

**Why?**

- Prevents child component re-renders
- Stable reference for memo'd components

---

### FlatList Performance

```typescript
<FlatList
  data={trips}
  renderItem={({ item }) => <TripCard trip={item} />}
  keyExtractor={(item) => item.id}


  // Performance props
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={10}


  // Optimization
  getItemLayout={(data, index) => ({
    length: TRIP_CARD_HEIGHT,
    offset: TRIP_CARD_HEIGHT * index,
    index,
  })}
/>
```

---

### Image Optimization

```typescript
import { Image } from 'expo-image';


<Image
  source={{ uri: profile.avatar_url }}
  style={styles.avatar}
  contentFit="cover"


  // Caching
  cachePolicy="memory-disk"


  // Placeholder
  placeholder={require('../assets/avatar-placeholder.png')}


  // Transitions
  transition={200}
/>
```

**Why expo-image?**

- Better caching than React Native Image
- Smoother transitions
- Supports more formats (WebP, AVIF)

---

## Best Practices

### Component Organization

```typescript
// 1. Imports
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/styles';


// 2. Types/Interfaces
interface Props {
  title: string;
}


// 3. Component
export default function MyComponent({ title }: Props) {
  // 3a. State
  const [loading, setLoading] = useState(false);


  // 3b. Hooks
  useEffect(() => {
    // Effect logic
  }, []);


  // 3c. Event handlers
  const handlePress = useCallback(() => {
    // Handler logic
  }, []);


  // 3d. Render
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}


// 4. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xl,
    color: Colors.text.primary,
  },
});
```

---

### Accessibility

```typescript
<TouchableOpacity
  accessibilityLabel="Login button"
  accessibilityHint="Double tap to login"
  accessibilityRole="button"
>
  <Text>Login</Text>
</TouchableOpacity>


<TextInput
  accessibilityLabel="Email input"
  accessibilityHint="Enter your email address"
/>
```

---

### Haptic Feedback

```typescript
import { haptics } from "@/lib/utils/haptics";

// On success
haptics.success();

// On error
haptics.error();

// On button press
haptics.light();

// On selection
haptics.selection();
```

---

## Common Patterns

### Conditional Rendering

```typescript
// Boolean shortcut
{isLoading && <ActivityIndicator />}


// Ternary
{isOffline ? <OfflineNotice /> : <OnlineContent />}


// Early return
if (loading) return <LoadingScreen />;
if (error) return <ErrorScreen />;
return <MainContent />;
```

---

### List Rendering

```typescript
// Simple list (for small lists)
{trips.map(trip => (
  <TripCard key={trip.id} trip={trip} />
))}


// FlatList (better for long lists)
<FlatList
  data={trips}
  renderItem={({ item }) => <TripCard trip={item} />}
  keyExtractor={item => item.id}
  ListEmptyComponent={<EmptyState />}
/>
```

---

### Loading States

```typescript
const [loading, setLoading] = useState(false);


const handleSubmit = async () => {
  setLoading(true);
  try {
    await apiCall();
  } finally {
    setLoading(false); // Always reset, even on error
  }
};


<TouchableOpacity
  style={[styles.button, loading && styles.buttonDisabled]}
  disabled={loading}
>
  {loading ? (
    <ActivityIndicator color={Colors.text.inverse} />
  ) : (
    <Text style={styles.buttonText}>Submit</Text>
  )}
</TouchableOpacity>
```

---

## Future Enhancements

### Component Library

- Button component (primary, secondary, outline variants)
- Card component (consistent elevation, padding)
- Modal component (bottom sheet, alert)
- Avatar component (with initials fallback)
- Badge component (notification counts)
- Empty state component (no data screens)
- Skeleton loader component

### Animation

```typescript
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';


const fadeIn = useAnimatedStyle(() => ({
  opacity: withTiming(visible ? 1 : 0, { duration: 300 })
}));


<Animated.View style={[styles.container, fadeIn]}>
  {/* Content */}
</Animated.View>
```

### Dark Mode

```typescript
import { useColorScheme } from "react-native";

const colorScheme = useColorScheme();
const isDark = colorScheme === "dark";

const styles = StyleSheet.create({
  container: {
    backgroundColor: isDark
      ? Colors.background.dark
      : Colors.background.primary,
  },
});
```

---

**End of Frontend Documentation**

```

***

**Key Changes Made:**

1. Added dual-store architecture (authStore + profileStore)
2. Added centralized styling system (styles/ directory)
3. Updated root layout with recovery session protection
4. Added password reset flow screens
5. Updated FormInput and OtpInput implementations
6. Added OfflineNotice component
7. Updated form handling with availability checks and manual errors
8. Added retry logic for profile sync
9. Removed emojis throughout
10. Updated project structure to match actual implementation
```
