// lib/utils/passwordStrength.ts
import { Colors } from "@/styles";

export interface PasswordStrength {
  text: string;
  color: string;
  score: number; // 0-4
}

/**
 * Calculate password strength
 * Returns text, color, and numeric score
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { text: "", color: "", score: 0 };
  }

  if (password.length < 6) {
    return { text: "Weak", color: Colors.error, score: 1 };
  }

  if (password.length < 8) {
    return { text: "Fair", color: Colors.warning, score: 2 };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const criteriaCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  if (criteriaCount >= 4 && password.length >= 10) {
    return { text: "Very Strong", color: Colors.success, score: 4 };
  }

  if (criteriaCount >= 3) {
    return { text: "Strong", color: Colors.success, score: 3 };
  }

  return { text: "Fair", color: Colors.warning, score: 2 };
}

/**
 * Check if password meets minimum requirements
 */
export function meetsPasswordRequirements(password: string): boolean {
  if (password.length < 8) return false;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUpper && hasLower && hasNumber && hasSpecial;
}
