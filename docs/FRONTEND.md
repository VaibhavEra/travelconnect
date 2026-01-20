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
- **Zustand**: Lightweight state management
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
│   ├── _layout.tsx           # Auth layout (no tabs/header)
│   ├── register.tsx          # Registration screen
│   ├── login.tsx             # Login screen
│   ├── verify-otp.tsx        # Email OTP verification
│   ├── forgot-password.tsx   # Password reset initiation
│   ├── verify-reset-otp.tsx  # Reset OTP verification
│   └── reset-new-password.tsx # New password screen
│
├── (tabs)/                    # Main app tabs (protected)
│   ├── _layout.tsx           # Tab bar layout
│   ├── index.tsx             # Home/trips feed
│   ├── search.tsx            # Trip search
│   ├── requests.tsx          # Package requests
│   └── profile.tsx           # User profile
│
├── _layout.tsx               # Root layout (auth check)
└── index.tsx                 # Landing/redirect screen

components/
├── FormInput.tsx             # Reusable text input
├── OtpInput.tsx              # 6-box OTP input
├── OfflineNotice.tsx         # Network status banner
└── Button.tsx                # (Future) Reusable button

lib/
├── supabase.ts               # Supabase client config
├── utils/
│   ├── availabilityCheck.ts  # RPC function wrappers
│   ├── haptics.ts            # Haptic feedback
│   ├── network.ts            # Network status hook
│   ├── parseSupabaseError.ts # Error message parser
│   ├── rateLimit.ts          # Client-side rate limiter
│   └── sanitize.ts           # Input sanitization
└── validations/
    └── auth.ts               # Zod schemas for auth

stores/
└── authStore.ts              # Zustand auth state

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
URL: shelfscore:///(auth)/login
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
  const { session } = useAuthStore();

  // Redirect to home if already authenticated
  if (session) {
    return <Redirect href="/" />;
  }

  return <Stack>{/* ... */}</Stack>;
}
```

### Navigation

```typescript
import { router } from "expo-router";

// Push (adds to stack)
router.push("/(auth)/register");

// Replace (replaces current screen)
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

**Props:**

```typescript
interface FormInputProps extends TextInputProps {
  label: string;
  placeholder?: string;
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
  onChangeText={setEmail}
  error={errors.email?.message}
  touched={touchedFields.email}
  keyboardType="email-address"
  autoCapitalize="none"
  rightIcon={
    availability.email === 'available' ? (
      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
    ) : availability.email === 'taken' ? (
      <Ionicons name="close-circle" size={24} color="#FF3B30" />
    ) : null
  }
/>
```

**Features:**

- Shows label above input
- Displays error message below (only when touched and error exists)
- Accepts custom right icon (checkmark, password toggle, etc.)
- Forwards all TextInput props
- Ref support for focus management

**Implementation:**

```typescript
const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, touched, rightIcon, style, ...props }, ref) => {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor="#999"
            {...props}
          />
          {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
        </View>

        {touched && error && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>
    );
  }
);
```

---

### 2. OtpInput Component

**Purpose:** 6-box OTP input with auto-focus and keyboard handling.

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
- Auto-focus previous box on backspace
- Paste support (splits 6-digit code)
- Keyboard auto-opens on mount
- Haptic feedback on input

**Implementation:**

```typescript
export default function OtpInput({ length, value, onChange, disabled }: OtpInputProps) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [localValue, setLocalValue] = useState(value.split(''));

  const handleChange = (text: string, index: number) => {
    // Handle single digit input
    if (text.length === 1) {
      const newValue = [...localValue];
      newValue[index] = text;
      setLocalValue(newValue);
      onChange(newValue.join(''));

      // Auto-focus next box
      if (index < length - 1) {
        refs.current[index + 1]?.focus();
      }

      haptics.light();
    }

    // Handle paste (6-digit code)
    else if (text.length === length) {
      const newValue = text.split('').slice(0, length);
      setLocalValue(newValue);
      onChange(newValue.join(''));
      refs.current[length - 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !localValue[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => (refs.current[index] = ref)}
          style={[
            styles.box,
            localValue[index] && styles.boxFilled,
            disabled && styles.boxDisabled
          ]}
          value={localValue[index] || ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={length} // Allow paste
          selectTextOnFocus
          editable={!disabled}
          autoFocus={index === 0}
        />
      ))}
    </View>
  );
}
```

---

### 3. OfflineNotice Component

**Purpose:** Banner that appears when device is offline.

**Usage:**

```typescript
<OfflineNotice />
```

**Implementation:**

```typescript
export default function OfflineNotice() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}
```

---

## State Management

### Zustand Store Pattern

**Why Zustand?**

- No providers/context needed
- Simple API (just hooks)
- TypeScript-friendly
- Small bundle size (1KB)
- Can access outside components

**Store Structure:**

```typescript
interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // ...
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  session: null,
  user: null,
  profile: null,
  loading: true,

  // Actions
  signIn: async (email, password) => {
    // Implementation
    set({ session, user, profile });
  },

  signOut: async () => {
    // Implementation
    set({ session: null, user: null, profile: null });
  },
}));
```

**Using in Components:**

```typescript
// Full store (re-renders on any change)
const store = useAuthStore();

// Selective subscription (only re-renders when user changes)
const user = useAuthStore((state) => state.user);

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

**Setup:**

```typescript
const {
  control,
  handleSubmit,
  formState: { errors, touchedFields, isValid },
} = useForm<RegisterFormData>({
  resolver: zodResolver(registerSchema),
  mode: "onTouched", // Validate on blur
  defaultValues: {
    email: "",
    password: "",
    // ...
  },
});
```

**Controller Usage:**

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
    />
  )}
/>
```

**Submit Handler:**

```typescript
const onSubmit = async (data: RegisterFormData) => {
  try {
    await signUp(data);
    router.push('/(auth)/verify-otp');
  } catch (error: any) {
    Alert.alert("Error", parseSupabaseError(error));
  }
};

<Button onPress={handleSubmit(onSubmit)} />
```

---

### Validation Timing

**Options:**

```typescript
mode: "onChange"; // Validates on every keystroke (annoying)
mode: "onBlur"; // Validates when leaving field (good UX)
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

### StyleSheet Pattern

**Why StyleSheet.create?**

- Performance: Styles compiled once, not on every render
- Type safety: Catches typos in style properties
- Auto-complete: IDE suggestions for style properties
- Validation: Warns about invalid values

**Pattern:**

```typescript
import { StyleSheet } from 'react-native';

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
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
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
    backgroundColor: '#007AFF',
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonError: {
    backgroundColor: '#FF3B30',
  },
});
```

---

### Design Tokens

**Colors:**

```typescript
const Colors = {
  primary: "#007AFF",
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",
  gray: "#666",
  lightGray: "#F5F5F5",
  white: "#fff",
  black: "#000",
};
```

**Spacing:**

```typescript
const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

**Typography:**

```typescript
const Typography = {
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  heading: {
    fontSize: 24,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
    fontWeight: "normal",
  },
  caption: {
    fontSize: 12,
    fontWeight: "normal",
  },
};
```

---

## TypeScript Patterns

### Supabase Type Generation

```bash
# Generate types from database schema
supabase gen types typescript --project-id YOUR_ID > types/database.types.ts
```

**Usage:**

```typescript
import { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Trip = Database["public"]["Tables"]["trips"]["Row"];
type Package = Database["public"]["Tables"]["packages"]["Row"];
```

**Benefits:**

- Auto-complete for database columns
- Type errors if column doesn't exist
- Automatic updates when schema changes

---

### Form Type Inference

```typescript
// Zod schema
export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  // ...
});

// Automatic TypeScript type
export type RegisterFormData = z.infer<typeof registerSchema>;

// Type-safe form
const onSubmit = async (data: RegisterFormData) => {
  // data.email is typed as string
  // data.password is typed as string
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

const FormInput: React.FC<FormInputProps> = ({ label, error, ...props }) => {
  // Implementation
};
```

**Why Extend TextInputProps?**

- Inherits all native TextInput props
- Type-safe (TypeScript checks valid props)
- Auto-complete for props

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
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  const handlePress = () => {
    // Handler logic
  };

  // 3d. Render
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
}

// 4. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

### Error Boundaries

```typescript
// Future: Add error boundary for graceful failures
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }
    return this.props.children;
  }
}
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

## Testing Strategy (Future)

### Unit Tests

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import FormInput from '@/components/FormInput';

describe('FormInput', () => {
  it('displays error when touched and invalid', () => {
    const { getByText } = render(
      <FormInput
        label="Email"
        error="Invalid email"
        touched={true}
      />
    );

    expect(getByText('Invalid email')).toBeTruthy();
  });
});
```

### Integration Tests

```typescript
describe('Login Flow', () => {
  it('should login successfully with valid credentials', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'Password123!');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });
});
```

---

## Debugging Tools

### React Native Debugger

```bash
# Install
brew install react-native-debugger

# Run
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

**Features:**

- Redux DevTools (works with Zustand)
- React DevTools
- Network inspector
- Console logs

---

### Flipper

```bash
# Install
brew install --cask flipper

# Connect device
npm run android # or npm run ios
```

**Features:**

- Layout inspector
- Network requests
- Database inspector (Supabase)
- Logs and crashes

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
// Simple list
{trips.map(trip => (
  <TripCard key={trip.id} trip={trip} />
))}

// FlatList (better for long lists)
<FlatList
  data={trips}
  renderItem={({ item }) => <TripCard trip={item} />}
  keyExtractor={item => item.id}
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

<Button disabled={loading}>
  {loading ? <ActivityIndicator /> : <Text>Submit</Text>}
</Button>
```

---

## Future Enhancements

### Component Library

- [ ] Button component (primary, secondary, outline variants)
- [ ] Card component (consistent elevation, padding)
- [ ] Modal component (bottom sheet, alert)
- [ ] Avatar component (with initials fallback)
- [ ] Badge component (notification counts)
- [ ] Empty state component (no data screens)

### Animation

```typescript
import Animated from 'react-native-reanimated';

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
    backgroundColor: isDark ? "#000" : "#fff",
  },
});
```

---

**End of Frontend Documentation**
