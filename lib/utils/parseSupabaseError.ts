export function parseSupabaseError(error: any): string {
  const message = error?.message || "";

  // Custom error for unverified email
  if (
    message === "EMAIL_NOT_VERIFIED" ||
    error?.name === "EmailNotVerifiedError"
  ) {
    return "Please verify your email before logging in";
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

  // Generic fallback
  return message || "An unexpected error occurred";
}
