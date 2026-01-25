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
- **Zustand**: Lightweight state management (4 stores: auth, profile, mode, request)
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
├── (auth)/ # Auth screen group (public)
│ ├── \_layout.tsx # Auth layout (Stack navigator)
│ ├── register.tsx # Registration with availability checks
│ ├── login.tsx # Login with account lockout
│ ├── verify-otp.tsx # Email OTP verification (registration)
│ ├── forgot-password.tsx # Password reset initiation
│ ├── verify-reset-otp.tsx # Reset OTP verification
│ └── reset-new-password.tsx # New password screen (recovery session)
│
├── (tabs)/ # Main app tabs (protected)
│ ├── \_layout.tsx # Tab bar layout with dynamic icons
│ ├── index.tsx # My Trips (traveller mode) / Home
│ ├── explore.tsx # Search trips (sender mode)
│ ├── requests.tsx # Request management (traveller mode)
│ └── profile.tsx # User profile with mode toggle
│
├── \_layout.tsx # Root layout (auth guard + recovery session handling)
└── index.tsx # Landing/redirect screen

components/
├── auth/ # Auth-specific components
│ ├── FormInput.tsx # Text input with validation
│ └── OtpInput.tsx # 6-box OTP input
│
├── trip/ # Trip components
│ ├── TripCard.tsx # Trip listing card (sender view)
│ └── MyTripCard.tsx # Trip card (traveller's own trips)
│
├── request/ # Request components
│ └── RequestCard.tsx # Parcel request card (incoming requests)
│
├── delivery/ # Delivery flow components
│ └── DeliveryCard.tsx # Active delivery card with OTP actions
│
├── modals/ # Modal components
│ ├── VerifyPickupOtpModal.tsx # Pickup OTP verification
│ └── VerifyDeliveryOtpModal.tsx # Delivery OTP verification
│
└── shared/ # Shared components
└── OfflineNotice.tsx # Network status banner

lib/
├── supabase.ts # Supabase client config
├── utils/
│ ├── availabilityCheck.ts # RPC function wrappers
│ ├── haptics.ts # Haptic feedback helpers
│ ├── network.ts # Network status hook
│ ├── parseSupabaseError.ts # Error message parser
│ ├── rateLimit.ts # Client-side rate limiter
│ └── sanitize.ts # Input sanitization
└── validations/
└── auth.ts # Zod schemas for auth

stores/
├── authStore.ts # Auth state (session, user, actions)
├── profileStore.ts # Profile state (synced with authStore)
├── modeStore.ts # User mode (sender/traveller toggle)
└── requestStore.ts # Trips & requests state (CRUD, OTP actions)

styles/
├── theme.ts # Design tokens (Colors, Spacing, Typography, BorderRadius)
├── commonStyles.ts # Reusable StyleSheet styles
└── index.ts # Barrel export

types/
├── database.types.ts # Auto-generated from Supabase
└── global.d.ts # Global type declarations

```

---

## Routing & Navigation

### File-Based Routing (Expo Router)

Expo Router uses Next.js-style file-based routing:

```

File: app/(tabs)/explore.tsx
Route: /(tabs)/explore
Access: After login, tap "Explore" tab

```

### Route Groups

**Protected Routes (Tabs):**

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  const { currentMode } = useModeStore();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: currentMode === 'traveller' ? 'My Trips' : 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={currentMode === 'traveller' ? 'airplane' : 'home'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Public Routes (Auth):**

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
      segments === "verify-reset-otp" ||
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
      router.replace("/(tabs)");
    }
  }, [session, loading]);

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

---

### 3. TripCard Component

**Purpose:** Display trip listing for senders to browse.

**Location:** `components/trip/TripCard.tsx`

**Props:**

```typescript
interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}
```

**Features:**

- Shows source → destination with transport icon
- Displays departure date and available slots
- Shows traveller name and rating
- Tap to view details or request delivery

---

### 4. RequestCard Component

**Purpose:** Display incoming parcel requests for travellers.

**Location:** `components/request/RequestCard.tsx`

**Props:**

```typescript
interface RequestCardProps {
  request: ParcelRequest;
  variant: "traveller" | "sender";
}
```

**Features:**

- Shows parcel details (`item_description`, `category`, `size`)
- Displays sender information (if traveller view)
- Shows status badge (pending, accepted, rejected)
- Accept/Reject buttons for pending requests (traveller)
- Status timeline for accepted requests (sender)

---

### 5. DeliveryCard Component

**Purpose:** Display active delivery with OTP action buttons.

**Location:** `components/delivery/DeliveryCard.tsx`

**Props:**

```typescript
interface DeliveryCardProps {
  request: ParcelRequest;
  onMarkPickup: (requestId: string) => void;
  onMarkDelivery: (requestId: string) => void;
}
```

**Features:**

- Shows parcel details (`item_description`, `category`, `size`)
- Displays receiver contact info (`delivery_contact_name`, `delivery_contact_phone`)
- Displays current status (accepted, picked_up, delivered)
- **Mark as Picked Up** button (if status === 'accepted')
- **Mark as Delivered** button (if status === 'picked_up')
- Disabled states when action not available
- Status badges with color coding

**Implementation:**

```typescript
export default function DeliveryCard({
  request,
  onMarkPickup,
  onMarkDelivery,
}: DeliveryCardProps) {
  const canMarkPickup = request.status === 'accepted';
  const canMarkDelivery = request.status === 'picked_up';

  return (
    <View style={styles.card}>
      {/* Parcel details */}
      <Text style={styles.itemDescription}>{request.item_description}</Text>
      <Text style={styles.category}>{request.category}</Text>
      <Text style={styles.size}>{request.size}</Text>

      {/* Receiver info */}
      <Text style={styles.receiver}>
        📞 {request.delivery_contact_name}: {request.delivery_contact_phone}
      </Text>

      {/* Status badge */}
      <View style={[styles.badge, styles[`badge_${request.status}`]]}>
        <Text style={styles.badgeText}>
          {request.status === 'accepted' && 'Ready for Pickup'}
          {request.status === 'picked_up' && 'In Transit'}
          {request.status === 'delivered' && 'Delivered'}
        </Text>
      </View>

      {/* Action buttons */}
      {canMarkPickup && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => onMarkPickup(request.id)}
        >
          <Text style={styles.buttonText}>Mark as Picked Up</Text>
        </TouchableOpacity>
      )}

      {canMarkDelivery && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => onMarkDelivery(request.id)}
        >
          <Text style={styles.buttonText}>Mark as Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

### 6. VerifyPickupOtpModal Component

**Purpose:** Modal for entering pickup OTP verification.

**Location:** `components/modals/VerifyPickupOtpModal.tsx`

**Props:**

```typescript
interface VerifyPickupOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  senderName: string;
}
```

**Features:**

- 6-digit OTP input
- Shows sender name for context
- Loading state during verification
- Error message display (inline, not alert)
- Success callback closes modal
- Cancel button to dismiss

**Implementation:**

```typescript
export default function VerifyPickupOtpModal({
  visible,
  onClose,
  onVerify,
  senderName,
}: VerifyPickupOtpModalProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const isValid = await onVerify(otp);

      if (isValid) {
        setOtp('');
        onClose();
      } else {
        setError('Invalid or expired OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('Verify pickup OTP failed:', error);
      setError(error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Verify Pickup</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP from {senderName}
          </Text>

          <OtpInput
            length={6}
            value={otp}
            onChange={setOtp}
            disabled={loading}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.verifyButton]}
              onPress={handleVerify}
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.verifyText}>Verify & Pickup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

### 7. VerifyDeliveryOtpModal Component

**Purpose:** Modal for entering delivery OTP verification.

**Location:** `components/modals/VerifyDeliveryOtpModal.tsx`

**Props:**

```typescript
interface VerifyDeliveryOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  receiverName: string;
}
```

**Same pattern as VerifyPickupOtpModal** but for delivery verification.

---

### 8. OfflineNotice Component

**Purpose:** Banner that appears when device is offline.

**Location:** `components/shared/OfflineNotice.tsx`

---

## State Management

### Multi-Store Architecture

TravelConnect uses **4 separate Zustand stores** that work together:

1. **authStore.ts**: Session, user, auth actions
2. **profileStore.ts**: Profile data, sync logic
3. **modeStore.ts**: User mode (sender/traveller toggle)
4. **requestStore.ts**: Trips, requests, OTP actions

---

### 1. authStore Pattern

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
```

**See AUTH.md for complete implementation.**

---

### 2. profileStore Pattern

```typescript
interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  syncProfile: () => Promise<void>;
  clearProfile: () => void;
}
```

**Automatic sync after auth state changes with exponential backoff retry logic.**

---

### 3. modeStore Pattern

**Purpose:** Manage user's current mode (sender/traveller toggle).

**Location:** `stores/modeStore.ts`

```typescript
interface ModeState {
  currentMode: "sender" | "traveller";
  setMode: (mode: "sender" | "traveller") => void;
}

export const useModeStore = create<ModeState>((set) => ({
  currentMode: "sender", // Default mode

  setMode: (mode) => {
    set({ currentMode: mode });
  },
}));
```

---

### 4. requestStore Pattern

**Purpose:** Manage trips and requests with CRUD operations and OTP verification.

**Location:** `stores/requestStore.ts`

```typescript
interface RequestState {
  // Trips (traveller's own trips)
  myTrips: Trip[];

  // Requests (sender's sent requests)
  myRequests: ParcelRequest[];

  // Incoming requests (traveller receives)
  incomingRequests: ParcelRequest[];

  // Accepted requests (traveller's active deliveries)
  acceptedRequests: ParcelRequest[];

  loading: boolean;
  error: string | null;

  // Trip actions
  getMyTrips: (travellerId: string) => Promise<void>;
  createTrip: (tripData: CreateTripData) => Promise<void>;

  // Request actions (sender)
  getMyRequests: (senderId: string) => Promise<void>;
  createRequest: (requestData: CreateRequestData) => Promise<void>;

  // Request actions (traveller)
  getIncomingRequests: (travellerId: string) => Promise<void>;
  getAcceptedRequests: (travellerId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string, reason?: string) => Promise<void>;

  // OTP verification
  verifyPickupOtp: (requestId: string, otp: string) => Promise<boolean>;
  verifyDeliveryOtp: (requestId: string, otp: string) => Promise<boolean>;
}
```

**Implementation Highlights:**

```typescript
export const useRequestStore = create<RequestState>((set, get) => ({
  myTrips: [],
  myRequests: [],
  incomingRequests: [],
  acceptedRequests: [],
  loading: false,
  error: null,

  getIncomingRequests: async (travellerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          sender:profiles!sender_id(full_name,rating),
          trip:trips!trip_id(source,destination,transport_mode,available_slots)
        `,
        )
        .eq("trip.traveller_id", travellerId)
        .in("status", ["pending"]);

      if (error) throw error;
      set({ incomingRequests: data || [], loading: false });
    } catch (error) {
      console.error("Get incoming requests failed:", error);
      set({ error: "Failed to load requests", loading: false });
    }
  },

  getAcceptedRequests: async (travellerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          sender:profiles!sender_id(full_name),
          trip:trips!trip_id(source,destination)
        `,
        )
        .eq("trip.traveller_id", travellerId)
        .in("status", ["accepted", "picked_up", "delivered"]);

      if (error) throw error;
      set({ acceptedRequests: data || [], loading: false });
    } catch (error) {
      console.error("Get accepted requests failed:", error);
      set({ error: "Failed to load deliveries", loading: false });
    }
  },

  acceptRequest: async (requestId) => {
    try {
      // Generate pickup OTP and set accepted status
      const { data: otp, error } = await supabase.rpc("generate_pickup_otp", {
        request_id: requestId,
      });

      if (error) throw error;
      // Refresh incoming requests
    } catch (error) {
      console.error("Accept request failed:", error);
      throw error;
    }
  },

  verifyPickupOtp: async (requestId, otp) => {
    try {
      const { data, error } = await supabase.rpc("verify_pickup_otp", {
        request_id: requestId,
        otp: otp,
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error("Verify pickup OTP failed:", error);
      return false;
    }
  },

  verifyDeliveryOtp: async (requestId, otp) => {
    try {
      const { data, error } = await supabase.rpc("verify_delivery_otp", {
        request_id: requestId,
        otp: otp,
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error("Verify delivery OTP failed:", error);
      return false;
    }
  },
}));
```

---

## Form Handling

### React Hook Form + Zod

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

**See AUTH.md for complete form handling patterns.**

---

## Styling Strategy

### Centralized Design System

**Location:** `styles/` directory

**theme.ts:**

```typescript
export const Colors = {
  primary: "#007AFF",
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",

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
  },

  border: {
    default: "#DDDDDD",
    light: "#EEEEEE",
    focus: "#007AFF",
    error: "#FF3B30",
  },
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
  sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32, xxxl: 40 },
  weights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
```

---

## TypeScript Patterns

### Supabase Type Generation

```bash
npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts
```

**Usage:**

```typescript
import { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Trip = Database["public"]["Tables"]["trips"]["Row"];
type ParcelRequest = Database["public"]["Tables"]["parcel_requests"]["Row"];
```

---

## Performance Optimization

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
/>
```

---

## Screen Examples

### requests.tsx (Complete Implementation)

Shows how all pieces come together:

```typescript
export default function RequestsScreen() {
  const { user } = useAuthStore();
  const { currentMode } = useModeStore();
  const {
    incomingRequests,
    acceptedRequests,
    loading,
    getIncomingRequests,
    getAcceptedRequests,
    verifyPickupOtp,
    verifyDeliveryOtp,
  } = useRequestStore();

  const [viewMode, setViewMode] = useState<'incoming' | 'accepted'>('incoming');
  const [pickupOtpModalVisible, setPickupOtpModalVisible] = useState(false);
  const [deliveryOtpModalVisible, setDeliveryOtpModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedRequestSender, setSelectedRequestSender] = useState('');
  const [selectedRequestReceiver, setSelectedRequestReceiver] = useState('');

  // Fetch requests on screen focus
  useFocusEffect(
    useCallback(() => {
      if (user && currentMode === 'traveller') {
        if (viewMode === 'incoming') {
          getIncomingRequests(user.id);
        } else {
          getAcceptedRequests(user.id);
        }
      }
    }, [user, currentMode, viewMode])
  );

  const handleMarkPickup = (requestId: string) => {
    const request = acceptedRequests.find((r) => r.id === requestId);
    if (request) {
      setSelectedRequestId(requestId);
      setSelectedRequestSender(request.sender?.full_name || 'Sender');
      setPickupOtpModalVisible(true);
    }
  };

  const handleMarkDelivery = (requestId: string) => {
    const request = acceptedRequests.find((r) => r.id === requestId);
    if (request) {
      setSelectedRequestId(requestId);
      setSelectedRequestReceiver(request.delivery_contact_name);
      setDeliveryOtpModalVisible(true);
    }
  };

  const handleVerifyPickup = async (otp: string) => {
    const isValid = await verifyPickupOtp(selectedRequestId, otp);
    if (isValid && user) {
      Alert.alert('Success', 'Parcel marked as picked up!');
      await getAcceptedRequests(user.id);
    }
    return isValid;
  };

  const handleVerifyDelivery = async (otp: string) => {
    const isValid = await verifyDeliveryOtp(selectedRequestId, otp);
    if (isValid && user) {
      Alert.alert('Success', 'Parcel marked as delivered!');
      await getAcceptedRequests(user.id);
    }
    return isValid;
  };

  return (
    <View style={styles.container}>
      {/* View switcher: Incoming vs Active */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity onPress={() => setViewMode('incoming')}>
          <Text>Incoming ({incomingRequests.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('accepted')}>
          <Text>Active ({acceptedRequests.length})</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {viewMode === 'incoming' ? (
        <FlatList
          data={incomingRequests}
          renderItem={({ item }) => (
            <RequestCard request={item} variant="traveller" />
          )}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <FlatList
          data={acceptedRequests}
          renderItem={({ item }) => (
            <DeliveryCard
              request={item}
              onMarkPickup={handleMarkPickup}
              onMarkDelivery={handleMarkDelivery}
            />
          )}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* OTP Modals */}
      <VerifyPickupOtpModal
        visible={pickupOtpModalVisible}
        onClose={() => setPickupOtpModalVisible(false)}
        onVerify={handleVerifyPickup}
        senderName={selectedRequestSender}
      />

      <VerifyDeliveryOtpModal
        visible={deliveryOtpModalVisible}
        onClose={() => setDeliveryOtpModalVisible(false)}
        onVerify={handleVerifyDelivery}
        receiverName={selectedRequestReceiver}
      />
    </View>
  );
}
```

---

**End of Frontend Documentation**
