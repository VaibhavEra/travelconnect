import { z } from "zod";

// ============================================
// REUSABLE FIELD VALIDATORS (Building Blocks)
// ============================================

const emailField = z
  .email("Please enter a valid email address")
  .min(1, "Email is required");

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character",
  );

const confirmPasswordField = z.string().min(1, "Please confirm your password");

const fullNameField = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be less than 50 characters");

const usernameField = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Username can only contain lowercase letters, numbers, and underscores",
  );

const phoneField = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number");

const otpField = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only numbers");

// ============================================
// MULTI-STEP REGISTRATION SCHEMAS
// ============================================

// Step 1: Email + Password
export const registerStep1Schema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Step 2: Profile Information
export const registerStep2Schema = z.object({
  full_name: fullNameField,
  username: usernameField,
  phone: phoneField,
});

// Combined (for backward compatibility with existing signUp function)
export const registerSchema = z
  .object({
    full_name: fullNameField,
    username: usernameField,
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================
// OTHER AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const otpVerificationSchema = z.object({
  emailOtp: otpField,
});

export const newPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterStep1FormData = z.infer<typeof registerStep1Schema>;
export type RegisterStep2FormData = z.infer<typeof registerStep2Schema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OtpVerificationFormData = z.infer<typeof otpVerificationSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
