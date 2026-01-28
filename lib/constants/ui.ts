export const UI = {
  // OTP
  OTP_LENGTH: 6,
  OTP_EXPIRY_WARNING_THRESHOLD: 60 * 60 * 1000, // 1 hour in ms
  OTP_EXPIRY_PICKUP: 60 * 60 * 1000, // 1 hour
  OTP_EXPIRY_DELIVERY: 6 * 60 * 60 * 1000, // 6 hours

  // Display limits
  MAX_VISIBLE_SLOTS: 5,
  MAX_VISIBLE_CATEGORIES: 3,
  MAX_VISIBLE_PHOTOS: 3,

  // Timer intervals
  TIMER_UPDATE_INTERVAL: 60000, // 1 minute in ms
  COUNTDOWN_UPDATE_INTERVAL: 1000, // 1 second in ms

  // Animations
  PRESSED_OPACITY: 0.7,
  SCROLL_THROTTLE: 16, // ~60fps

  // Debounce/Throttle
  SEARCH_DEBOUNCE: 300, // ms
  INPUT_DEBOUNCE: 500, // ms

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  INFINITE_SCROLL_THRESHOLD: 0.8,
} as const;

// Rate limiting (in-memory)
export const RATE_LIMITS = {
  EMAIL_CHECK: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  PHONE_CHECK: {
    maxAttempts: 10,
    windowMs: 60 * 1000,
  },
  OTP_REQUEST: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  LOGIN_ATTEMPT: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;
