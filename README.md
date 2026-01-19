# TravelConnect - Application Overview

## What is TravelConnect?

TravelConnect is a peer-to-peer crowd-shipping marketplace that connects three types of users: **Senders** (who need parcels delivered), **Travellers** (who have spare luggage capacity on their journeys), and **Receivers** (who accept deliveries). The core concept leverages existing travel routes to provide affordable, flexible parcel delivery across India.

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

## Tech Stack Decision

### Why This Stack?

As a solo developer targeting a 4-week MVP with Android + iOS support, the stack prioritizes:

- **Velocity**: Pre-built auth, storage, and database
- **Familiarity**: Leveraging React/TypeScript skills
- **Zero DevOps**: Managed services for infrastructure
- **India-focused**: Payment gateways, SMS providers, KYC APIs suited for Indian market

### Frontend: Expo (React Native)

**Chosen because:**

- Single codebase for Android and iOS
- React knowledge transfers directly
- Expo Router provides Next.js-like file-based routing
- Built-in camera, notifications, and device APIs
- OTA updates without app store resubmissions
- No Xcode/Android Studio setup needed initially

**Key Libraries:**

- **Zustand**: Lightweight state management for auth and app state
- **React Hook Form + Zod**: Type-safe form validation
- **React Native StyleSheets**: Separate stylesheet files for performant, type-safe styling
- **AsyncStorage**: Local storage for cached trips/packages and session persistence (WatermelonDB may be considered post-MVP for complex offline-first needs)

### Backend: Supabase

**Chosen because:**

- Postgres database with full SQL capabilities
- Built-in authentication (email/phone/password)
- Row Level Security for multi-tenant data access
- File storage for KYC documents and package photos
- Real-time subscriptions for status updates
- Serverless edge functions for notifications and matching logic
- Open-source with India hosting options

**Alternative considered:** Next.js API + Neon Postgres (similar to ShelfScore stack), but Supabase reduces boilerplate and provides more out-of-the-box features for mobile.

### Future Integrations (Post-MVP)

- **Payments**: Razorpay or Cashfree for UPI, escrow, payouts
- **KYC**: Sandbox API or Perfios for Aadhaar/DigiLocker verification
- **SMS/Email**: MSG91 or Twilio for notifications
- **Maps**: Google Maps API for meetup location selection

---

## MVP Feature Scope

### In Scope (4 Weeks)

**Week 1: Foundation**

- User registration (email/phone/username + password)
- Email/phone verification
- KYC document upload (images only, manual review)
- Basic profile management

**Week 2: Core Flows**

- Traveller: Create trip listings with capacity, route, dates
- Sender: Search trips with filters (source, destination, mode, date)
- Sender: Create package requests on trips
- Traveller: View and accept/reject requests

**Week 3: Handoffs & Status**

- Fake payment flow (no real money)
- OTP generation for pickup and delivery
- Photo uploads at each handoff
- Status tracking (requested → accepted → picked → delivered)

**Week 4: Polish & Launch**

- Email/SMS notifications for key events
- Offline caching of trips and requests
- Basic error handling and loading states
- EAS builds for Android/iOS TestFlight/Play Store internal testing

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

## Current Implementation Status

### Completed (Phase 1)

**Authentication System:**

- User registration with full name, username, email, phone, password
- Email OTP verification (6-digit code)
- Login with email/password
- Logout functionality
- Session persistence across app restarts
- Automatic route protection (auth screens vs main app)

**Database & Profile:**

- Supabase Postgres schema with users and profiles tables
- Automatic profile creation via database trigger on signup
- Profile includes user metadata (full name, username, phone)

**Form Validation:**

- Zod schemas for registration and login
- Password requirements (8+ chars, uppercase, lowercase, number, special char)
- Phone number validation (Indian 10-digit format)
- Username rules (3-20 chars, lowercase alphanumeric + underscores)
- Real-time form error feedback

**UI/UX:**

- Clean, minimal auth screens (login, register, OTP verification, forgot password)
- Reusable FormInput component with error states
- Reusable OtpInput component with auto-focus
- Loading states and disabled buttons during API calls
- Password visibility toggle

### Next Up

**Phase 2: Security Hardening**

- Enhanced password validation and strength indicator
- Failed login attempt tracking and account lockout
- Rate limiting on login attempts
- Session timeout after inactivity
- JWT token auto-refresh
- Offline detection and handling

**Phase 3: User Profiles & Roles**

- Role selection (sender/traveller/receiver)
- KYC document upload interface
- Profile editing
- Admin panel for KYC review

**Phase 4: Trip & Package Flows**

- Trip creation and listing
- Trip search with filters
- Package request workflow
- Request accept/reject
- Status tracking

**Phase 5: Delivery & Verification**

- OTP generation and validation
- Photo upload at pickup/delivery
- Notification system
- Receiver link generation

---

## Design Philosophy

**MVP-First Approach:**
Every feature decision asks: "Does this unblock real user value?" Advanced features like auto-KYC, live tracking, and dispute resolution are deferred until core flows are validated.

**Trust by Default:**
Since the platform involves physical goods and strangers meeting, trust mechanisms (KYC, OTPs, photos, ratings) are baked into the core experience, not added later.

**Offline-Resilient:**
Travellers may have poor connectivity on trains/buses. The app caches trips and allows offline viewing, syncing changes when connected.

**Solo-Dev Friendly:**
The stack choice (Expo + Supabase) minimizes infrastructure work, letting a single developer focus on product logic rather than server management, API boilerplate, or platform-specific code.

---

## Success Metrics (Post-Launch)

- **Week 1**: 50 registered users with verified KYC
- **Week 2**: 10 completed trip listings
- **Week 4**: 5 successful deliveries (full pickup → delivery flow)
- **Month 2**: 50 deliveries, 80% pickup success rate

Once core flows are validated, focus shifts to payment integration, auto-KYC, and growth features (referrals, ratings, in-app chat).
