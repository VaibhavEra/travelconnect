import { logger } from "./logger";

/**
 * Parse Supabase errors into user-friendly messages
 * Consolidates all error parsing logic in one place
 */
export function parseSupabaseError(error: any): string {
  const message = error?.message || "";

  // Custom error for unverified email
  if (
    message === "EMAIL_NOT_VERIFIED" ||
    error?.name === "EmailNotVerifiedError"
  ) {
    return "Please verify your email before logging in";
  }

  // OTP-specific errors
  if (message.includes("Token has expired") || message.includes("expired")) {
    return "Verification code has expired. Please request a new one";
  }

  if (message.includes("Invalid token") || message.includes("invalid")) {
    return "Invalid verification code. Please check and try again";
  }

  if (message.includes("Token already used")) {
    return "This verification code has already been used. Please request a new one";
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
  if (message.includes("duplicate key value violates unique constraint")) {
    if (message.includes("username")) {
      return "Username already taken";
    }
    if (message.includes("phone")) {
      return "Phone number already registered";
    }
    if (message.includes("email")) {
      return "Email already registered";
    }
    return "This value is already in use";
  }

  // PostgreSQL error codes
  if (error?.code) {
    switch (error.code) {
      case "23503": // Foreign key violation
        return "Referenced item does not exist";
      case "23502": // Not null violation
        return "Required field is missing";
      case "42501": // Insufficient privilege
        return "You don't have permission to perform this action";
      case "22001": // String data right truncation
        return "Input is too long";
      case "PGRST116": // No rows returned
        return "Item not found";
    }
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

  // Catch-all for unknown Supabase/PostgreSQL errors
  if (
    error?.code?.startsWith("PGRST") ||
    message.toLowerCase().includes("supabase")
  ) {
    logger.error("Unhandled Supabase error", error);
    return "An error occurred. Please try again";
  }

  // Generic fallback
  return message || "An unexpected error occurred";
}
