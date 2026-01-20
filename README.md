# TravelConnect - Peer-to-Peer Crowd-Shipping Platform

## What is TravelConnect?

TravelConnect is a peer-to-peer crowd-shipping marketplace that connects **Senders** (who need parcels delivered), **Travellers** (who have spare luggage capacity on their journeys), and **Receivers** (who accept deliveries). The platform leverages existing travel routes to provide affordable, flexible parcel delivery across India.

---

## The Problem We're Solving

Traditional courier services are expensive and inflexible for certain routes, especially tier-2/tier-3 cities. Meanwhile, travellers often have unused luggage capacity. TravelConnect creates a marketplace that benefits both parties: senders get cheaper delivery, travellers earn extra income during trips they're already making.

---

## How It Works

### Three User Modes

When users open the app, they choose their current role:

**1. Sender Mode**

- Search for travellers going from point A to point B
- Filter by transportation mode, date, item category, weight
- View traveller profiles with ratings, capacity, meeting locations
- Send package requests to suitable travellers
- Pay and track delivery status

**2. Traveller Mode**

- Create trip listings (up to 5 days in advance)
- Specify route, transport details, luggage capacity (max 5 slots)
- Review incoming package requests from senders
- Accept requests and coordinate pickup/delivery
- Earn income per package carried

**3. Receiver Mode**

- No account needed - access via shared link
- View trip and package details
- Verify delivery with OTP
- See photos from sender and traveller

### Trust & Safety

**KYC Requirements:**

- Mandatory: Aadhaar OR PAN card
- Optional: Passport, Driving License
- Manual review for MVP (auto-verification via DigiLocker planned post-MVP)

**OTP Verification:**

- Pickup OTP: Exchanged when sender hands package to traveller
- Delivery OTP: Exchanged when traveller delivers to receiver
- Both parties upload photos at each handoff

**Notifications:**

- Traveller: Alert 3 hours before boarding
- Receiver: Alert 1 hour before traveller's arrival

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

- **Zustand**: Lightweight state management for auth and app state
- **React Hook Form + Zod**: Type-safe form validation with real-time feedback
- **React Native StyleSheets**: Performant, type-safe styling
- **AsyncStorage**: Local storage for session persistence and caching

### Backend: Supabase

**Why Supabase?**

- Postgres database with full SQL capabilities
- Built-in authentication (email/phone/password with OTP)
- Row Level Security (RLS) for multi-tenant data access
- File storage for KYC documents and package photos
- Real-time subscriptions for status updates
- Edge functions for business logic and notifications
- Open-source with potential India hosting

**Database Schema:**

- `profiles`: User information and KYC status
- `trips`: Traveller trip listings with capacity and routes
- `packages`: Package requests with status tracking
- `payments`: Payment records (escrow, payouts)
- `failed_login_attempts`: Security tracking for account lockout

### Future Integrations (Post-MVP)

- **Payments**: Razorpay or Cashfree for UPI, escrow, payouts
- **KYC**: Sandbox API or Perfios for Aadhaar/DigiLocker verification
- **SMS/Email**: MSG91 or Twilio for notifications
- **Maps**: Google Maps API for meetup location selection

---

## Documentation Structure

This repository contains comprehensive documentation:

- **[README.md](README.md)** (this file) - Project overview and roadmap
- **[docs/BACKEND.md](docs/BACKEND.md)** - Database schema, RPC functions, triggers, and RLS policies
- **[docs/AUTH.md](docs/AUTH.md)** - Authentication system architecture and security implementation
- **[docs/FRONTEND.md](docs/FRONTEND.md)** - Component structure, state management, and UI patterns

---

## Current Implementation Status

### Completed: Authentication & Security (Phase 1)

**Full Authentication Flow:**

- User registration with email, username, phone, password
- Email OTP verification (6-digit code)
- Login with account lockout protection (5 attempts, 15-minute cooldown)
- Password reset via OTP (no magic links)
- Session persistence and automatic token refresh
- Secure logout with cleanup

**Security Features:**

- Password requirements: 8+ chars, uppercase, lowercase, number, special character
- Password strength indicator during registration and reset
- Account lockout after failed login attempts (database-level, auto-expires after 15 minutes)
- Email enumeration prevention (generic error messages)
- Real-time availability checking (username, email, phone)
- Rate limiting on OTP resend and password reset attempts
- Failed login attempt tracking cleared on: successful login, logout, password reset

**Database & Profile Management:**

- Automatic profile creation via database trigger on signup
- Row Level Security (RLS) policies for all tables
- Comprehensive indexes for performance
- Foreign key constraints with CASCADE rules
- Unique constraints on username, email, phone

**Form Validation:**

- Zod schemas with TypeScript type safety
- Real-time validation on blur (not on every keystroke)
- Debounced availability checks (500ms delay)
- Client-side and server-side validation
- Consistent error messaging

**UI/UX:**

- Clean, minimal auth screens (register, login, OTP, forgot password, reset password)
- Reusable components: `FormInput`, `OtpInput` (6-box design)
- Loading states and disabled buttons during API calls
- Password visibility toggle with haptic feedback
- Offline detection with banner notification
- Accessibility support (proper labels, keyboard navigation)

**Developer Experience:**

- Comprehensive logging system (dev-only console logs)
- Type-safe database queries with generated types
- Error parsing utility for user-friendly messages
- Network status detection and handling
- Input sanitization utilities

### Next Up

**Phase 2: User Profiles & KYC (In Progress)**

- Role selection UI (sender/traveller toggle)
- KYC document upload interface (image picker)
- Profile editing screen
- Avatar upload and management
- Admin panel for manual KYC review

**Phase 3: Trip Management**

- Trip creation form with route, capacity, dates
- Trip listing and search interface
- Filters: source, destination, mode, date range, capacity
- Trip detail view with traveller profile
- Edit/cancel trip functionality

**Phase 4: Package Request Flow**

- Package request creation (item details, weight, photo)
- Request viewing for travellers
- Accept/reject request actions
- Status tracking UI (requested → accepted → picked → delivered)
- Notification system for status updates

**Phase 5: Delivery & Verification**

- OTP generation for pickup and delivery
- Photo upload at each handoff
- OTP verification screens
- Receiver access via shared link (no account needed)
- Trip completion and slot management

**Phase 6: Payments (Fake for MVP)**

- Payment flow UI (no real transactions)
- Escrow simulation
- Payment history
- Payout simulation for travellers

---

## MVP Feature Scope (4 Weeks)

### Week 1: Foundation (COMPLETED)

- User registration with email/phone/username/password
- Email OTP verification
- Login with account lockout protection
- Password reset via OTP
- Session management and persistence
- Real-time field availability checking
- Security: rate limiting, failed attempt tracking, email enumeration prevention

### Week 2: Profiles & Roles (CURRENT)

- KYC document upload (images only, manual review)
- Profile management (edit name, phone, avatar)
- Role selection (sender/traveller mode switching)
- Basic profile viewing

### Week 3: Core Flows

- Traveller: Create trip listings with capacity, route, dates
- Sender: Search trips with filters
- Sender: Create package requests on trips
- Traveller: View and accept/reject requests
- Status tracking implementation

### 📅 Week 4: Handoffs & Launch

- OTP generation for pickup and delivery
- Photo uploads at each handoff
- Fake payment flow (no real money)
- Email/SMS notifications for key events
- Offline caching of trips and requests
- EAS builds for TestFlight/Play Store internal testing

### Out of Scope (Post-MVP)

- Real payment processing and escrow
- Automated KYC via DigiLocker API
- Live location tracking during delivery
- In-app chat between users
- Rating and review system
- Advanced matching algorithms
- Dispute resolution workflows
- Receiver user accounts (MVP uses OTP links only)

---

## Design Philosophy

**MVP-First Approach:**
Every feature decision asks: "Does this unblock real user value?" Advanced features like auto-KYC, live tracking, and dispute resolution are deferred until core flows are validated.

**Security by Design:**
Authentication and security were built first and properly, not bolted on later. Account lockout, email enumeration prevention, and proper session management are foundational.

**Trust by Default:**
Since the platform involves physical goods and strangers meeting, trust mechanisms (KYC, OTPs, photos, ratings) are baked into the core experience, not added later.

**Offline-Resilient:**
Travellers may have poor connectivity on trains/buses. The app caches trips and allows offline viewing, syncing changes when connected.

**Developer Velocity:**
The stack choice (Expo + Supabase) minimizes infrastructure work, letting a single developer focus on product logic rather than server management, API boilerplate, or platform-specific code.

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
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
npm run generate-types

# Start development server
npm start
```

````

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

Run the SQL migrations in `supabase/migrations/` in order:

1. `001_initial_schema.sql` - Core tables
2. `002_rpc_functions.sql` - Helper functions
3. `003_rls_policies.sql` - Row Level Security
4. `004_triggers.sql` - Automated actions
5. `005_indexes.sql` - Performance optimization

---

## Project Structure

```
travelconnect/
├── app/                      # Expo Router file-based routing
│   ├── (auth)/              # Auth screens (login, register, etc.)
│   ├── (tabs)/              # Main app tabs (home, trips, profile)
│   ├── _layout.tsx          # Root layout with auth provider
│   └── index.tsx            # Landing/redirect screen
├── components/              # Reusable UI components
│   ├── FormInput.tsx
│   ├── OtpInput.tsx
│   └── OfflineNotice.tsx
├── lib/                     # Utilities and configurations
│   ├── supabase.ts         # Supabase client setup
│   ├── utils/              # Helper functions
│   └── validations/        # Zod schemas
├── stores/                  # Zustand state management
│   └── authStore.ts
├── types/                   # TypeScript types
│   └── database.types.ts   # Auto-generated from Supabase
├── docs/                    # Documentation
│   ├── BACKEND.md
│   ├── AUTH.md
│   └── FRONTEND.md
└── supabase/               # Database migrations
    └── migrations/
```

---

## Success Metrics (Post-Launch)

- **Week 1**: 50 registered users with verified KYC
- **Week 2**: 10 completed trip listings
- **Week 4**: 5 successful deliveries (full pickup → delivery flow)
- **Month 2**: 50 deliveries, 80% pickup success rate

Once core flows are validated, focus shifts to payment integration, auto-KYC, and growth features (referrals, ratings, in-app chat).

---

## Contributing

This is currently a solo project in MVP development phase. Contributions will be welcomed after the initial launch.

## License

[To be determined]

---

**Built with ❤️ for the Indian travel and logistics community**

```

## Key Changes Made:

1. **Added "Documentation Structure" section** - Links to the upcoming BACKEND.md, AUTH.md, and FRONTEND.md files
2. **Expanded "Current Implementation Status"** - Added all the security features, validation improvements, and UI components we built
3. **Updated "Next Up" section** - Reflected that Phase 1 is complete, Phase 2 is current
4. **Added "Development Setup" section** - Installation and running instructions
5. **Added "Project Structure"** - Clear folder organization
6. **Updated Week 1 status to COMPLETED** with checkmark
7. **Marked Week 2 as CURRENT** with proper emoji
8. **Clarified the documentation structure** - Noted this is the root README with separate docs coming
9. **Added more technical details** about the auth system implementation
10. **Maintained all original content** - Nothing removed, only enhanced
```
````
