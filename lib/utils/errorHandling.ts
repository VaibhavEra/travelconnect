// lib/utils/errorHandling.ts

import { logger } from "./logger";

// ─── Typed Error Shape ────────────────────────────────────────────────────────

export type AppErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_CONFIRMED"
  | "EMAIL_RATE_LIMIT"
  | "USER_ALREADY_REGISTERED"
  | "OTP_EXPIRED"
  | "OTP_INVALID"
  | "OTP_ALREADY_USED"
  | "OTP_BLOCKED"
  | "DUPLICATE_USERNAME"
  | "DUPLICATE_PHONE"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_VALUE"
  | "FOREIGN_KEY_VIOLATION"
  | "NOT_NULL_VIOLATION"
  | "INSUFFICIENT_PRIVILEGE"
  | "INPUT_TOO_LONG"
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export interface AppError extends Error {
  code: AppErrorCode;
  userMessage: string; // safe to show to the user
  originalError?: unknown;
}

export function createAppError(
  code: AppErrorCode,
  userMessage: string,
  originalError?: unknown,
): AppError {
  const err = new Error(userMessage) as AppError;
  err.code = code;
  err.userMessage = userMessage;
  err.originalError = originalError;
  return err;
}

// ─── OTP Error Parser ─────────────────────────────────────────────────────────

/**
 * Parses the code-as-message pattern used in OTP RPC responses.
 * requestStore and verifyOtp flows throw errors where error.message
 * is a machine code like "invalid_otp", "expired", "blocked".
 */
export interface ParsedOtpError {
  code: "invalid_otp" | "expired" | "blocked" | "unknown";
  userMessage: string;
  isBlocked: boolean;
  isExpired: boolean;
}

export function parseOtpError(
  error: unknown,
  otpType:
    | "pickup"
    | "delivery"
    | "cancellation"
    | "signup"
    | "reset" = "pickup",
): ParsedOtpError {
  const code = (error as any)?.message ?? "";

  if (code === "blocked") {
    return {
      code: "blocked",
      userMessage: "Too many failed attempts. Please wait before trying again.",
      isBlocked: true,
      isExpired: false,
    };
  }

  if (code === "expired") {
    const messages: Record<typeof otpType, string> = {
      pickup: "This OTP has expired. Please contact the sender to regenerate.",
      delivery: "This OTP has expired. Please contact support.",
      cancellation: "This OTP has expired. Please contact the sender.",
      signup: "Verification code has expired. Please request a new one.",
      reset: "Reset code has expired. Please request a new one.",
    };
    return {
      code: "expired",
      userMessage: messages[otpType],
      isBlocked: false,
      isExpired: true,
    };
  }

  if (code === "invalid_otp") {
    return {
      code: "invalid_otp",
      userMessage: "Invalid OTP. Please check and try again.",
      isBlocked: false,
      isExpired: false,
    };
  }

  return {
    code: "unknown",
    userMessage: "Failed to verify OTP. Please try again.",
    isBlocked: false,
    isExpired: false,
  };
}

// ─── Supabase / General Error Parser ─────────────────────────────────────────

/**
 * Parses any Supabase, PostgreSQL, or network error into a user-friendly
 * AppError. Always returns an AppError — never throws.
 *
 * Priority order:
 * 1. AppError passthrough (isAppError guard)
 * 2. Legacy EMAIL_NOT_VERIFIED plain Error check
 * 3. Supabase auth error codes and message strings
 * 4. OTP errors via message string
 * 5. PostgreSQL numeric error codes (switch)
 * 6. PostgreSQL unique constraint violations (message string fallback)
 * 7. Network errors
 * 8. Unhandled Supabase/PostgREST errors (logged)
 * 9. Generic fallback
 */
export function parseSupabaseError(error: unknown): AppError {
  // 1. Already an AppError — pass through
  if (isAppError(error)) return error;

  const err = error as any;
  const message: string = err?.message ?? "";
  const code: string = err?.code ?? "";

  // 2. Legacy plain Error with message "EMAIL_NOT_VERIFIED"
  if (message === "EMAIL_NOT_VERIFIED") {
    return createAppError(
      "EMAIL_NOT_VERIFIED",
      "Please verify your email before logging in.",
      error,
    );
  }

  // 3. Supabase auth status/error codes (checked before string matching)
  if (
    message.includes("Invalid login credentials") ||
    code === "invalid_credentials"
  ) {
    return createAppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
      error,
    );
  }

  if (message.includes("Email not confirmed")) {
    return createAppError(
      "EMAIL_NOT_CONFIRMED",
      "Please verify your email before logging in.",
      error,
    );
  }

  if (
    message.includes("Email rate limit exceeded") ||
    code === "over_email_send_rate_limit"
  ) {
    return createAppError(
      "EMAIL_RATE_LIMIT",
      "Too many attempts. Please wait a few minutes.",
      error,
    );
  }

  if (message.includes("User already registered")) {
    return createAppError(
      "USER_ALREADY_REGISTERED",
      "Email already registered. Please log in instead.",
      error,
    );
  }

  // 4. OTP errors via message string (Supabase auth OTP responses)
  if (
    message.includes("Token has expired") ||
    message.includes("otp_expired")
  ) {
    return createAppError(
      "OTP_EXPIRED",
      "Verification code has expired. Please request a new one.",
      error,
    );
  }

  if (message.includes("Token already used")) {
    return createAppError(
      "OTP_ALREADY_USED",
      "This verification code has already been used. Please request a new one.",
      error,
    );
  }

  // NOTE: "invalid" check is last among OTP checks — it's too broad
  if (
    message.includes("Invalid token") ||
    (message.includes("invalid") && message.includes("otp"))
  ) {
    return createAppError(
      "OTP_INVALID",
      "Invalid verification code. Please check and try again.",
      error,
    );
  }

  // 5. PostgreSQL error codes (numeric)
  switch (code) {
    case "23503":
      return createAppError(
        "FOREIGN_KEY_VIOLATION",
        "Referenced item does not exist.",
        error,
      );
    case "23502":
      return createAppError(
        "NOT_NULL_VIOLATION",
        "Required field is missing.",
        error,
      );
    case "42501":
      return createAppError(
        "INSUFFICIENT_PRIVILEGE",
        "You don't have permission to perform this action.",
        error,
      );
    case "22001":
      return createAppError("INPUT_TOO_LONG", "Input is too long.", error);
    case "PGRST116":
      return createAppError("NOT_FOUND", "Item not found.", error);
  }

  // 6. PostgreSQL unique constraint violations (message string fallback)
  if (message.includes("duplicate key value violates unique constraint")) {
    if (message.includes("username")) {
      return createAppError(
        "DUPLICATE_USERNAME",
        "Username already taken.",
        error,
      );
    }
    if (message.includes("phone")) {
      return createAppError(
        "DUPLICATE_PHONE",
        "Phone number already registered.",
        error,
      );
    }
    if (message.includes("email")) {
      return createAppError(
        "DUPLICATE_EMAIL",
        "Email already registered.",
        error,
      );
    }
    return createAppError(
      "DUPLICATE_VALUE",
      "This value is already in use.",
      error,
    );
  }

  // 7. Network errors
  if (
    message.includes("Failed to fetch") ||
    message.includes("Network request failed")
  ) {
    return createAppError(
      "NETWORK_ERROR",
      "Network error. Please check your connection.",
      error,
    );
  }

  if (message.includes("timeout")) {
    return createAppError(
      "TIMEOUT",
      "Request timed out. Please try again.",
      error,
    );
  }

  // 8. Unhandled Supabase/PostgREST errors — log and return generic
  if (code?.startsWith("PGRST") || message.toLowerCase().includes("supabase")) {
    logger.error("Unhandled Supabase error", error, {
      module: "errorHandling",
    });
    return createAppError(
      "UNKNOWN",
      "An error occurred. Please try again.",
      error,
    );
  }

  // 9. Generic fallback
  return createAppError(
    "UNKNOWN",
    message || "An unexpected error occurred.",
    error,
  );
}

// ─── Type Guard ───────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "userMessage" in error
  );
}
