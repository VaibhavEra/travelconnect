/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export const sanitize = {
  /**
   * Remove HTML tags and dangerous characters
   */
  text: (input: string): string => {
    return input
      .replace(/[<>]/g, "") // Remove < and >
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .trim();
  },

  /**
   * Sanitize email
   */
  email: (input: string): string => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w@.+-]/g, ""); // Only allow valid email chars
  },

  /**
   * Sanitize username (lowercase, alphanumeric + underscore)
   */
  username: (input: string): string => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, ""); // Only lowercase letters, numbers, underscore
  },

  /**
   * Sanitize phone number (digits only)
   */
  phone: (input: string): string => {
    return input.replace(/\D/g, ""); // Remove all non-digits
  },

  /**
   * Sanitize name (letters and spaces only)
   */
  name: (input: string): string => {
    return input
      .replace(/[^a-zA-Z\s]/g, "") // Only letters and spaces
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/^\s+/, ""); // Remove leading spaces only (not trailing)
  },
};
