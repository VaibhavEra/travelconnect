# TravelConnect - Peer-to-Peer Crowd-Shipping Platform

## What is TravelConnect?

TravelConnect is a peer-to-peer crowd-shipping marketplace that connects **Senders** (who need parcels delivered) and **Travellers** (who have spare luggage capacity on their journeys). The platform leverages existing travel routes to provide affordable, flexible parcel delivery across Indian metro cities.

---

## The Problem We're Solving

Traditional courier services are expensive and inflexible for inter-city routes, especially for small, non-urgent parcels. Meanwhile, travellers often have unused luggage capacity on trains, buses, and flights. TravelConnect creates a marketplace that benefits both parties: senders get cheaper delivery through trusted individuals, travellers earn extra income during trips they're already making.

---

## How It Works

### Two Active User Roles

When users open the app, they choose their current role (can be switched anytime):

**1. Sender Mode**

- Search for travellers going from origin to destination city
- Filter by transportation mode, date, weight capacity
- View traveller profiles with ratings and completed trips
- Create parcel request with photos and details
- Track delivery status with OTP verification
- Rate traveller after delivery

**2. Traveller Mode**

- Create trip listings with route, date, transport details
- Specify luggage capacity (max 5 parcel slots)
- Upload ticket/PNR for trust verification
- Review incoming package requests from senders
- Accept/reject requests (automatic slot allocation)
- Verify pickup with sender's OTP
- Verify delivery with receiver's OTP
- Receive rating from sender

**3. Receiver (No App Required)**

- Receiver doesn't install the app
- Sender shares delivery OTP via WhatsApp/SMS
- Receiver meets traveller and provides OTP to confirm delivery
- Simple, no-friction experience

---

## MVP Scope & Boundaries

### Locked Constraints (Not Compromises, Design Choices)

**Geographic Coverage:**

- **5 Cities Only**: Delhi, Mumbai, Bengaluru, Pune, Jaipur
- **Inter-city routes only** between these metros
- No intra-city deliveries in MVP

**Parcel Restrictions:**

- **Allowed Categories**: Documents & Papers, Clothing & Apparel, Medicines, Small Personal Items, Books & Magazines
- **Banned Categories**: Electronics, Cash, Jewellery, Controlled Items
- **Weight Limits**: Small (0-2kg), Medium (2-5kg), Large (5-10kg)
- **No Declared Value Field** in MVP (reduces complexity and liability)
- **Max 5 parcels per trip** (per traveller)

**Trust & Safety:**

- **No KYC in MVP**: Name and phone only, no identity documents
- **No deposits**: Travellers don't pay upfront to create trips
- **OTP verification**: 6-digit codes for pickup and delivery with expiry times
- **Photo uploads**: Multiple parcel photos required
- **Ticket upload**: Required for train/bus/flight, optional for car
- **PNR masking**: Only last 4 digits shown to sender (e.g., \*\*\*\*4567)

**Request & Trip Policies:**

- **Request flow**: Sender creates request → Traveller accepts → OTP verification at pickup → OTP verification at delivery
- **Sender cancellation**: Allowed before acceptance
- **Trip cancellation**: Allowed anytime (refunds all packages, rating penalty)
- **No trip edits**: Cannot edit trip after creation
- **1 parcel per request**: Sender can make multiple requests, but each is separate

---

## Tech Stack

### Frontend: Expo (React Native)

**Why Expo?**

- Single codebase for Android and iOS
- File-based routing (Expo Router) similar to Next.js
- Built-in camera, notifications, and device APIs
- OTA updates without app store resubmissions
- No Xcode/Android Studio setup needed initially

**Key Libraries:**

- **Zustand**: Lightweight state management (authStore, profileStore, modeStore, requestStore)
- **React Hook Form + Zod**: Type-safe form validation with real-time feedback
- **Centralized Styling System**: Design tokens (Colors, Spacing, Typography, BorderRadius) in `styles/`
- **AsyncStorage + SecureStore**: Local storage for session persistence and secure token storage
- **Expo Image Picker**: Camera and photo gallery access
- **Expo Notifications**: Push notifications for request updates
- **Expo Haptics**: Tactile feedback for user interactions

### Backend: Supabase

**Why Supabase?**

- Postgres database with full SQL capabilities
- Built-in authentication (phone OTP, email/password)
- Row Level Security (RLS) for multi-tenant data access
- File storage for ticket images and parcel photos
- Real-time subscriptions for status updates
- Edge functions for scheduled jobs (request expiry, trip completion)
- Open-source with potential India hosting

**Database Schema:**

- `profiles`: User information (name, username, phone, email, rating). **Sender vs traveller handled client-side via modeStore** (no roles column in MVP).
- `trips`: Traveller trip listings with capacity, transport details, ticket verification
- `parcel_requests`: Package requests with status tracking, OTPs with expiry, photos array, timestamp tracking
- `failed_login_attempts`: Account lockout protection (5 attempts, 15-min auto-expiry)

### Future Integrations (Post-MVP)

- **Payments**: Razorpay Route for escrow and auto-payouts
- **KYC**: DigiLocker API for Aadhaar/PAN verification
- **SMS**: MSG91 or Twilio for receiver OTP delivery
- **Maps**: Google Maps API for meetup location selection
- **Insurance**: 3rd party partner for high-value parcels

---

## Documentation Structure

This repository contains comprehensive documentation:

- **[README.md](README.md)** (this file) - Project overview and MVP specifications
- **[docs/AUTH.md](docs/AUTH.md)** - Authentication system architecture and security
- **[docs/BACKEND.md](docs/BACKEND.md)** - Database schema, RPC functions, triggers, RLS policies
- **[docs/FRONTEND.md](docs/FRONTEND.md)** - Component structure, state management, UI patterns
- **[docs/DELIVERY-FLOW.md](docs/DELIVERY-FLOW.md)** - Complete OTP-based delivery workflow

---

## Current Implementation Status

### ✅ Phase 1: Authentication & Security (COMPLETE)

**Full Authentication Flow:**

- User registration with email, username, phone, password
- Email OTP verification (6-digit code)
- Login with database-side account lockout protection (5 attempts, 15-minute auto-expiry cooldown)
- Complete password reset flow: forgot-password → verify-reset-otp → reset-new-password
- Session persistence and automatic token refresh
- Secure logout with cleanup
- Auto-login after successful password reset

**Security Features:**

- Password requirements: 8+ chars, uppercase, lowercase, number, special character
- Password strength indicator during registration and reset
- Database-side account lockout (auto-expires after 15 minutes, cleared on successful login/logout/password reset)
- Email enumeration prevention (generic error messages)
- Real-time availability checking (username, email, phone) with debounced RPC calls
- Client-side rate limiting on OTP resend and password reset requests
- Recovery session handling for password reset flow
- Failed login attempt tracking with automatic cleanup

**Database & Profile Management:**

- Dual-store architecture: Separate `authStore` and `profileStore` with automatic sync
- Automatic profile creation via database trigger on signup
- Profiles table with no roles column (sender/traveller handled by client-side `modeStore`)
- Row Level Security (RLS) policies for all tables
- Comprehensive indexes for performance
- Foreign key constraints with CASCADE rules
- Unique constraints on username, email, phone

### ✅ Phase 2-5: Trips & Requests (COMPLETE)

**Trip Management:**

- Create trip with route, date, transport mode, capacity
- Upload ticket photo with PNR number
- Specify allowed parcel categories
- View own trips (active, completed)
- Trip auto-completion when all parcels delivered

**Request Flow:**

- Search trips by origin, destination, date
- Filter by transport mode and available slots
- Create parcel request with multiple photos
- Category selection and size specification
- Receiver details collection (name, phone) – exact locations coordinated via phone in MVP
- Request sent to traveller for review

**Traveller Actions:**

- View incoming requests with sender details
- See parcel photos and specifications
- Accept request → calls `generate_pickup_otp()` RPC
- Reject request with optional reason
- View all accepted requests (active deliveries)

### ✅ Phase 6-9: OTP Delivery Flow (COMPLETE)

**OTP System:**

- Pickup OTP generated via `generate_pickup_otp()` RPC on acceptance (24-hour expiry)
- Delivery OTP generated by `verify_pickup_otp()` RPC after pickup (72-hour expiry)
- Database-stored OTPs with expiry timestamps
- `verify_pickup_otp()` and `verify_delivery_otp()` RPCs return boolean
- Auto-clear OTPs after successful verification

**Pickup Verification:**

- Traveller initiates "Mark as Picked Up"
- Modal opens requesting sender's pickup OTP
- `verify_pickup_otp()` RPC → status → `picked_up`, generates delivery OTP
- Pickup OTP cleared from database

**Delivery Verification:**

- Traveller initiates "Mark as Delivered"
- Modal opens requesting receiver's delivery OTP
- `verify_delivery_otp()` RPC → status → `delivered`
- Delivery OTP cleared from database
- Trigger auto-completes trip if all parcels delivered

**Request Status Tracking:**

- `pending`: Initial state when created
- `accepted`: Traveller accepted request
- `rejected`: Traveller rejected request
- `picked_up`: Traveller verified pickup with OTP
- `delivered`: Traveller verified delivery with OTP
- Timeline tracking with timestamps for each transition

**UI Components:**

- DeliveryCard with action buttons based on status
- VerifyPickupOtpModal for pickup OTP entry
- VerifyDeliveryOtpModal for delivery OTP entry
- Loading states and error handling
- Success alerts on verification
- Request filtering by status (all, ready, in transit, completed)

---

### 🚧 In Progress: Phase 10 - Polish & Edge Cases

**Next Steps:**

- Error handling improvements throughout app
- Loading states and skeleton loaders
- Empty state designs with helpful CTAs
- Image compression and optimization
- Better offline handling

---

## Project Structure

```

travelconnect/
├── app/ # Expo Router file-based routing
│ ├── (auth)/ # Auth screens (login, register, OTP, password reset)
│ │ ├── \_layout.tsx # Auth stack navigation
│ │ ├── login.tsx
│ │ ├── register.tsx
│ │ ├── verify-otp.tsx
│ │ ├── forgot-password.tsx
│ │ ├── verify-reset-otp.tsx
│ │ └── reset-new-password.tsx
│ ├── (tabs)/ # Main app tabs (protected routes)
│ │ ├── \_layout.tsx # Tab bar layout
│ │ ├── index.tsx # Home/trips screen
│ │ ├── explore.tsx # Search trips (sender mode)
│ │ ├── requests.tsx # Request management (traveller mode)
│ │ └── profile.tsx # User profile
│ ├── \_layout.tsx # Root layout with auth guard
│ └── index.tsx # Landing/redirect screen
├── components/ # Reusable UI components
│ ├── auth/ # Auth-specific components
│ │ ├── FormInput.tsx # Text input with validation
│ │ └── OtpInput.tsx # 6-box OTP input
│ ├── delivery/ # Delivery flow components
│ │ └── DeliveryCard.tsx # Active delivery card with OTP actions
│ ├── modals/ # Modal components
│ │ ├── VerifyPickupOtpModal.tsx # Pickup OTP verification
│ │ └── VerifyDeliveryOtpModal.tsx # Delivery OTP verification
│ ├── request/ # Request components
│ │ └── RequestCard.tsx # Parcel request card
│ ├── shared/ # Shared components
│ │ └── OfflineNotice.tsx # Network status banner
│ └── trip/ # Trip components
│ └── TripCard.tsx # Trip listing card
├── lib/ # Utilities and configurations
│ ├── supabase.ts # Supabase client setup
│ ├── utils/ # Helper functions
│ │ ├── availabilityCheck.ts # RPC function wrappers
│ │ ├── haptics.ts # Haptic feedback
│ │ ├── network.ts # Network status hook
│ │ ├── parseSupabaseError.ts # Error message parser
│ │ ├── rateLimit.ts # Client-side rate limiter
│ │ └── sanitize.ts # Input sanitization
│ └── validations/ # Zod schemas
│ └── auth.ts # Auth validation schemas
├── stores/ # Zustand state management
│ ├── authStore.ts # Auth state (session, user, actions)
│ ├── profileStore.ts # Profile state (synced with authStore)
│ ├── modeStore.ts # User mode (sender/traveller toggle)
│ └── requestStore.ts # Request state (trips, requests, OTP actions)
├── styles/ # Centralized design system
│ ├── theme.ts # Design tokens (Colors, Spacing, Typography)
│ ├── commonStyles.ts # Reusable StyleSheet styles
│ └── index.ts # Barrel export
├── types/ # TypeScript types
│ └── database.types.ts # Auto-generated from Supabase
├── docs/ # Documentation
│ ├── AUTH.md # Authentication architecture
│ ├── BACKEND.md # Database schema, RLS, triggers
│ ├── FRONTEND.md # Component structure, state management
│ └── DELIVERY-FLOW.md # Complete delivery workflow
├── supabase/ # Supabase configuration
│ └── migrations/ # SQL migrations
└── README.md # This file

```

---

## MVP Development Timeline

### ✅ Week 1: Authentication & Security (COMPLETE)

- User registration with email/phone/username/password
- Email OTP verification
- Login with database-side account lockout protection (5 attempts, 15-minute cooldown)
- Complete password reset flow (forgot-password → verify-reset-otp → reset-new-password)
- Session management and persistence
- Real-time field availability checking
- Security: rate limiting, failed attempt tracking, email enumeration prevention
- Dual-store architecture (authStore + profileStore with sync)

### ✅ Week 2-3: Trips & Requests (COMPLETE)

- Database setup (trips, parcel_requests tables)
- Profile management (view, edit)
- Mode management (sender/traveller toggle with modeStore)
- Trip creation with ticket upload
- Trip listing and search (sender view)
- Request creation with multiple photos
- Request acceptance/rejection (traveller view)
- Slot management (auto-decrement on acceptance)

### ✅ Week 4: OTP Delivery Flow (COMPLETE)

- Pickup OTP generation via `generate_pickup_otp()` RPC on request acceptance
- Pickup verification with VerifyPickupOtpModal
- Delivery OTP generated automatically after pickup verification
- Delivery verification with VerifyDeliveryOtpModal
- Status transitions (pending → accepted → picked_up → delivered)
- Trip auto-completion when all parcels delivered
- DeliveryCard component with action buttons
- Request filtering by status

### 🚧 Week 5: Polish & Edge Cases (IN PROGRESS - Phase 10)

- Error handling improvements
- Loading states and skeleton loaders
- Empty states with helpful CTAs
- Image compression and optimization
- Better offline handling

### 📅 Week 6: Ratings & Launch Prep (UPCOMING - Phase 11-14)

- Post-delivery ratings (5-star + tags + comment)
- Notifications center (in-app + push)
- Support form
- Onboarding tooltips
- EAS builds for TestFlight/Play Store internal testing

---

## Out of Scope for MVP

**Post-Launch Features:**

- Real payment processing (Razorpay integration)
- KYC verification (DigiLocker API)
- Higher declared values (unlocked after KYC)
- Traveller deposits (reduces no-shows)
- In-app chat (sender ↔ traveller)
- SMS notifications for receiver
- Rating filters and traveller badges
- Insurance integration for high-value parcels
- Route recommendations (AI-based matching)
- Bulk sender accounts (small businesses)
- Referral program
- Multi-parcel bundling (same trip, single payment)

---

## Design Philosophy

**MVP-First Approach:**
Every feature decision asks: "Does this unblock real user value?" Advanced features like auto-KYC, live tracking, and in-app chat are deferred until core flows (trip creation, request, handoff) are validated with real users.

**Security by Design:**
Authentication and security were built first and properly, not bolted on later. Database-side account lockout, email enumeration prevention, OTP expiry, and session management are foundational, not afterthoughts.

**Trust Without Complexity:**
Instead of heavy KYC upfront (which slows onboarding), we use lightweight trust signals: OTPs, photos, ratings, and ticket verification. Post-MVP, DigiLocker integration will unlock higher-value parcels.

**Offline-Resilient:**
Travellers may have poor connectivity on trains/buses. The app caches trips and allows offline viewing, syncing changes when connected. Critical actions (OTP entry, photo upload) queue for retry.

**Developer Velocity:**
The stack choice (Expo + Supabase) minimizes infrastructure work, letting a single developer focus on product logic rather than server management, API boilerplate, or platform-specific code. No backend deployment, no API versioning, no Docker configs in MVP.

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Expo CLI: `npm install -g expo-cli`
- Supabase account with project created
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/travelconnect.git
cd travelconnect

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your Supabase URL and anon key to .env

# Generate database types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts

# Start development server
npm start
```

### Running the App

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web (for quick testing)
npm run web
```

### Database Setup

Apply the migration files via Supabase dashboard SQL editor in order:

1. Initial schema (profiles, trips, parcel_requests)
2. OTP columns and functions
3. RLS policies

**Note:** You may need to manually create the trigger on `auth.users` table for profile auto-creation:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## Success Metrics (Closed Beta)

**Week 1-2 (Initial Onboarding):**

- 50 registered users
- 25 users with complete profiles
- Role distribution: 60% senders, 40% travellers

**Week 3-4 (First Transactions):**

- 20 trip listings created
- 50 package requests sent
- 10 requests accepted

**Week 5-6 (First Deliveries):**

- 5 completed deliveries (full pickup → delivery flow)
- 80% pickup success rate (traveller shows up)
- 4+ average rating for both senders and travellers

**Month 2 (Validation):**

- 100 total users
- 50 trips listed
- 25 successful deliveries
- <10% cancellation rate
- Positive feedback on pricing and UX

Once core flows are validated, focus shifts to:

- Real payment integration (Razorpay)
- KYC implementation (DigiLocker)
- Expansion to more routes (Delhi-Jaipur, Mumbai-Pune)
- Growth features (referrals, in-app chat, insurance)

---

## Contributing

This is currently a solo project in MVP development phase. Contributions will be welcomed after the initial closed beta launch.

For feature requests or bug reports, please use the in-app support form or email [your-email@example.com].

---

## License

[To be determined - likely MIT or Apache 2.0 post-launch]

---

**Built for the Indian travel and logistics community**

---
