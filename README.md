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
- Pay upfront (fake payment in MVP)
- Enter receiver details after traveller accepts
- Track delivery status with OTP verification

**2. Traveller Mode**

- Create trip listings with route, date, transport details
- Specify luggage capacity (max 5 parcel slots)
- Upload ticket/PNR for trust verification
- Review incoming package requests from senders
- Accept requests (automatic slot allocation)
- Coordinate pickup and delivery via phone/WhatsApp
- Confirm handoffs with OTP and photo uploads
- Receive payout after delivery

**3. Receiver (No App Required)**

- Receiver doesn't install the app
- Sender shares details via WhatsApp (traveller name, phone, delivery OTP)
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

**Payment & Pricing:**

- **Platform-set pricing**: Calculated from distance + transport mode
- **20% platform fee** (fixed for MVP)
- **Payment at request time**: Sender pays when creating request (before traveller accepts)
- **Auto-refund on rejection**: Full refund if traveller rejects (5-7 day processing)
- **Fake payments in MVP**: No real money, simulated flow only

**Trust & Safety:**

- **No KYC in MVP**: Name and phone only, no identity documents
- **No deposits**: Travellers don't pay upfront to create trips
- **OTP verification**: 6-digit codes for pickup and delivery
- **Photo uploads**: Multiple parcel photos + size reference tip
- **Ticket upload**: Required for train/bus/flight, optional for car
- **PNR masking**: Only last 4 digits shown to sender (e.g., \*\*\*\*4567)

**Request & Trip Policies:**

- **Request expiry**: 48 hours OR trip departure (whichever comes first)
- **Sender cancellation**: Allowed before acceptance (full refund)
- **Trip cancellation**: Allowed anytime (refunds all packages, rating penalty)
- **No trip edits**: Cannot edit trip after creation
- **1 parcel per request**: Sender can make multiple requests, but each is separate

**Closed Beta:**

- Manual user approval (if needed)
- Limited rollout to test core flows
- Focus on Delhi-Mumbai corridor initially

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

- **Zustand**: Lightweight state management for auth and profile
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

- `profiles`: User information with roles array (sender/traveller), rating, completed trips
- `trips`: Traveller trip listings with capacity, transport details, meetup/drop locations, stay duration
- `packages`: Package requests with status tracking, OTPs, photos array, timestamp tracking
- `payments`: Payment records with gateway details and settlement tracking
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
- **[ROADMAP.md](ROADMAP.md)** - Post-MVP expansion plans and feature roadmap
- **[docs/BACKEND.md](docs/BACKEND.md)** - Database schema, RPC functions, triggers, RLS policies
- **[docs/AUTH.md](docs/AUTH.md)** - Authentication system architecture and security
- **[docs/FRONTEND.md](docs/FRONTEND.md)** - Component structure, state management, UI patterns

---

## Current Implementation Status

### Completed: Authentication & Security (Phase 1, Week 1)

**Full Authentication Flow:**

- User registration with email, username, phone, password
- Email OTP verification (6-digit code)
- Login with database-side account lockout protection (5 attempts, 15-minute auto-expiry cooldown)
- **Complete password reset flow**: forgot-password → verify-reset-otp → reset-new-password
- Session persistence and automatic token refresh
- Secure logout with cleanup
- Auto-login after successful password reset

**Security Features:**

- Password requirements: 8+ chars, uppercase, lowercase, number, special character
- Password strength indicator during registration and reset
- **Database-side account lockout** (auto-expires after 15 minutes, cleared on successful login/logout/password reset)
- Email enumeration prevention (generic error messages)
- Real-time availability checking (username, email, phone) with debounced RPC calls
- Client-side rate limiting on OTP resend and password reset requests
- Recovery session handling for password reset flow
- Failed login attempt tracking with automatic cleanup

**Database & Profile Management:**

- **Dual-store architecture**: Separate `authStore` and `profileStore` with automatic sync
- Automatic profile creation via database trigger on signup
- **Profiles table with roles array**: Users can be both sender and traveller
- Row Level Security (RLS) policies for all tables
- Comprehensive indexes for performance
- Foreign key constraints with CASCADE rules
- Unique constraints on username, email, phone

**Form Validation:**

- Zod schemas with TypeScript type safety
- Real-time validation on blur (not on every keystroke)
- Debounced availability checks (500ms delay)
- Client-side and server-side validation
- Consistent error messaging with `parseSupabaseError()` utility

**UI/UX:**

- Clean, minimal auth screens (register, login, verify-otp, forgot-password, verify-reset-otp, reset-new-password)
- Reusable components: `FormInput`, `OtpInput` (6-box design)
- Loading states and disabled buttons during API calls
- Password visibility toggle with haptic feedback
- Offline detection with banner notification
- Accessibility support (proper labels, keyboard navigation, hit slop for touch targets)
- **Centralized design system**: Colors, Spacing, Typography, BorderRadius tokens

**Developer Experience:**

- Comprehensive logging system (dev-only console logs)
- Type-safe database queries with auto-generated types
- Error parsing utility for user-friendly messages
- Network status detection and handling
- Input sanitization utilities (email, username, phone, name, text)

---

### In Progress: Foundation & Profiles (Phase 2, Week 2)

**Database Setup:**

- Cities table (5 metros with coordinates)
- City distances matrix (pre-calculated for pricing)
- Parcel categories table
- Profile management with roles array
- Storage buckets (ticket-images, parcel-photos, pickup-photos, delivery-photos)

**Frontend:**

- Profile viewing screen (name, phone, rating, completed trips, roles)
- Edit profile screen (minimal: name, phone only)
- Role management (users can have multiple roles simultaneously)
- Dynamic UI based on active role
- City and category dropdowns (data-driven from database)

**Utils:**

- Pricing calculator (distance × transport mode multiplier × base rate)
- Distance calculation (haversine formula or pre-calculated matrix)
- Image upload utilities with compression
- Date/time helpers for trip search (±7 days)

**Goal:** Users can manage profile, view their roles, see role-specific UI.

---

### Next Up: Trip Creation & Listing (Phase 3, Week 3)

**Traveller Flow:**

- Create Trip form (multi-step: route, date, transport, ticket, capacity, pricing)
- My Trips list (active, completed)
- Trip details screen (with edit/cancel options if no packages accepted)

**Sender Flow:**

- Find Trips screen (search with filters: origin, destination, date, weight)
- Trip listing with traveller info, ratings, price breakdown
- Trip details screen (sender view) with "Send Parcel" button

**Goal:** Travellers create trips with platform-set pricing, senders search and view trips.

---

### Upcoming: Request & Payment (Phase 4, Week 4)

**Sender Flow:**

- Create Parcel Request form (category, weight, description, multiple photos)
- Fake payment screen (simulate UPI/Card)
- My Packages list (status tracking)
- Package details with timeline

**Traveller Flow:**

- Requests tab (incoming requests)
- Request details (view parcel info, sender rating)
- Accept/Reject actions (slot management)

**Policies Implemented:**

- Payment at request time (fake in MVP)
- Request auto-expiry (48hrs or departure)
- Auto-refund on rejection
- Sender cancellation before acceptance

**Goal:** Complete request → payment → acceptance → details exchange flow.

---

### Upcoming: Pickup & Delivery (Phase 5, Days 29-35)

**Handoff Verification:**

- Pickup: Traveller enters OTP (from sender) + uploads photo
- Delivery: Traveller enters OTP (from receiver) + uploads photo
- Status transitions: requested → accepted → picked → delivered

**Receiver Communication:**

- Sender shares details via WhatsApp (traveller name, phone, delivery OTP)
- Pre-filled message generator in app

**Trip Completion:**

- Auto-complete when: (departure_date + 1 day) AND all packages delivered
- Payout released to traveller (fake in MVP)

**Goal:** Full pickup → transit → delivery flow with OTP verification.

---

### Upcoming: Ratings & Polish (Phase 6, Days 36-42)

**Ratings System:**

- Post-delivery rating prompt (7-day window)
- 5-star + tags (on-time, careful-handling, good-communication) + comment
- Both parties rate each other (sender rates traveller, traveller rates sender)
- Average rating calculation via database trigger

**Notifications:**

- Push notifications (Expo)
- In-app notification center (bell icon)
- Status updates (request accepted, in transit, delivered)

**Support:**

- In-app support form (issue type + description + package ID)
- Emails sent to developer for manual resolution

**Polish:**

- Loading states and skeletons
- Error handling and retry logic
- Empty states (no trips found, no packages)
- Onboarding tooltips

**Goal:** Complete MVP with ratings, notifications, support ready for closed beta.

---

## MVP Development Timeline (6 Weeks)

### Week 1: Authentication & Security (COMPLETED)

- User registration with email/phone/username/password
- Email OTP verification
- Login with database-side account lockout protection (5 attempts, 15-min cooldown)
- Complete password reset flow (forgot-password → verify-reset-otp → reset-new-password)
- Session management and persistence
- Real-time field availability checking
- Security: rate limiting, failed attempt tracking, email enumeration prevention
- Dual-store architecture (authStore + profileStore with sync)

### Week 2: Foundation & Profiles (CURRENT)

- Database setup (cities, categories, distances)
- Profile management (view, edit)
- Role management (roles array: sender/traveller)
- Dynamic UI based on roles
- Storage buckets and image upload utilities

### Week 3: Trip Creation & Listing

- Traveller: Create trip with transport details, ticket upload, pricing
- Sender: Search trips with filters (origin, destination, date, weight)
- Trip details screens (both views)
- Pricing calculator implementation

### Week 4: Request & Payment Flow

- Sender: Create parcel request with multiple photos
- Fake payment implementation
- Traveller: View and accept/reject requests
- Request expiry logic (scheduled function)
- Auto-refund on rejection

### Week 5: Pickup & Delivery

- OTP generation (6-digit for pickup, delivery)
- Photo uploads at each handoff
- Status tracking (requested → in_transit → delivered)
- Trip auto-completion logic
- Receiver message generator (WhatsApp share)

### Week 6: Ratings & Launch Prep

- Post-delivery ratings (5-star + tags + comment)
- Notifications center (in-app + push)
- Support form
- Loading states, error handling, empty states
- EAS builds for TestFlight/Play Store internal testing

---

## Out of Scope for MVP (See ROADMAP.md)

**Phase 2 Features (Post-Launch):**

- Real payment processing (Razorpay integration)
- KYC verification (DigiLocker API)
- Higher declared values (unlocked after KYC)
- Traveller deposits (reduces no-shows)
- In-app chat (sender ↔ traveller)
- SMS notifications for receiver

**Phase 3 Features (Growth):**

- Rating filters and traveller badges
- Insurance integration for high-value parcels
- Route recommendations (AI-based matching)
- Bulk sender accounts (small businesses)
- Referral program
- Multi-parcel bundling (same trip, single payment)

**Phase 4 Features (Scale):**

- Pan-India expansion (tier-2/tier-3 cities)
- Live location tracking during delivery
- Dispute resolution workflows
- In-app support chat
- Receiver user accounts (optional)
- Automated fraud detection

---

## Design Philosophy

**MVP-First Approach:**
Every feature decision asks: "Does this unblock real user value?" Advanced features like auto-KYC, live tracking, and in-app chat are deferred until core flows (trip creation, request, handoff) are validated with real users.

**Security by Design:**
Authentication and security were built first and properly, not bolted on later. Database-side account lockout, email enumeration prevention, and session management are foundational, not afterthoughts.
**Trust Without Complexity:**
Instead of heavy KYC upfront (which slows onboarding), we use lightweight trust signals: OTPs, photos, ratings, and ticket verification. Post-MVP, DigiLocker integration will unlock higher-value parcels.

**Offline-Resilient:**
Travellers may have poor connectivity on trains/buses. The app caches trips and allows offline viewing, syncing changes when connected. Critical actions (OTP entry, photo upload) queue for retry.

**Closed Beta Validation:**
MVP launches as closed beta in Delhi-Mumbai corridor first. This allows us to:

- Manually onboard initial users
- Test full delivery flows in controlled environment
- Gather feedback before wider rollout
- Validate pricing model and unit economics

**Developer Velocity:**
The stack choice (Expo + Supabase) minimizes infrastructure work, letting a single developer focus on product logic rather than server management, API boilerplate, or platform-specific code. No backend deployment, no API versioning, no Docker configs in MVP.

---

## Project Structure

```
travelconnect/
├── app/                      # Expo Router file-based routing
│   ├── (auth)/              # Auth screens (login, register, OTP, password reset)
│   │   ├── _layout.tsx      # Auth stack navigation
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── verify-otp.tsx
│   │   ├── forgot-password.tsx
│   │   ├── verify-reset-otp.tsx
│   │   └── reset-new-password.tsx
│   ├── _layout.tsx          # Root layout with auth guard
│   └── index.tsx            # Landing/home screen
├── components/              # Reusable UI components
│   ├── auth/               # Auth-specific components
│   │   ├── FormInput.tsx   # Text input with validation
│   │   └── OtpInput.tsx    # 6-box OTP input
│   └── shared/             # Shared components
│       └── OfflineNotice.tsx # Network status banner
├── lib/                     # Utilities and configurations
│   ├── supabase.ts         # Supabase client setup
│   ├── utils/              # Helper functions
│   │   ├── availabilityCheck.ts  # RPC function wrappers
│   │   ├── haptics.ts            # Haptic feedback
│   │   ├── network.ts            # Network status hook
│   │   ├── parseSupabaseError.ts # Error message parser
│   │   ├── rateLimit.ts          # Client-side rate limiter
│   │   └── sanitize.ts           # Input sanitization
│   └── validations/        # Zod schemas
│       └── auth.ts         # Auth validation schemas
├── stores/                  # Zustand state management
│   ├── authStore.ts        # Auth state (session, user, actions)
│   └── profileStore.ts     # Profile state (synced with authStore)
├── styles/                  # Centralized design system
│   ├── theme.ts            # Design tokens (Colors, Spacing, Typography)
│   ├── commonStyles.ts     # Reusable StyleSheet styles
│   └── index.ts            # Barrel export
├── types/                   # TypeScript types
│   └── database.types.ts   # Auto-generated from Supabase
├── docs/                    # Documentation
│   ├── BACKEND.md          # Database schema, RLS, triggers
│   ├── AUTH.md             # Authentication architecture
│   └── FRONTEND.md         # Component structure, state management
├── supabase/               # Supabase configuration
│   └── migrations/         # SQL migrations
│       └── 20260120230702_remote_schema.sql
└── README.md               # This file
```

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

The migration file `supabase/migrations/20260120230702_remote_schema.sql` contains the complete database schema. Apply it via Supabase dashboard SQL editor.

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
