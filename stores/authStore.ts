// stores/authStore.ts
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";
import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { useProfileStore } from "./profileStore";

// Type for profile from database
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Type for signup data
interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  phone: string;
}

// Auth store state interface
interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  loading: boolean;
  pendingVerification: {
    email: string;
    phone: string;
    userId: string;
  } | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  resendEmailOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyResetOtp: (email: string, otp: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  setPendingVerification: (
    data: { email: string; phone: string; userId: string } | null,
  ) => void;
  checkAccountLocked: (email: string) => Promise<boolean>;
  recordFailedLogin: (email: string) => Promise<void>;
  clearFailedAttempts: (email: string) => Promise<void>;
}

// Conditional logging utility
const isDev = __DEV__;
const log = {
  info: (message: string, ...args: any[]) => {
    if (isDev) console.log(`[Auth] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    if (isDev) console.error(`[Auth Error] ${message}`, error);
  },
  warn: (message: string, ...args: any[]) => {
    if (isDev) console.warn(`[Auth Warning] ${message}`, ...args);
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  session: null,
  user: null,
  loading: true,
  pendingVerification: null,

  // Initialize auth state and listen for changes
  initialize: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError) throw profileError;

        // Sync profile to profileStore
        useProfileStore.getState().setProfile(profile);

        set({
          session,
          user: session.user,
          loading: false,
        });
      } else {
        set({ loading: false });
      }

      // Store subscription to clean up later
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        log.info("Auth state changed", event);

        if (event === "SIGNED_IN" && session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          // Sync profile to profileStore
          if (profile) {
            useProfileStore.getState().setProfile(profile);
          }

          set({
            session,
            user: session.user,
            loading: false,
          });
        } else if (event === "SIGNED_OUT") {
          // Clear profile from profileStore
          useProfileStore.getState().setProfile(null);

          set({
            session: null,
            user: null,
            loading: false,
          });
        } else if (event === "TOKEN_REFRESHED" && session) {
          set({ session, user: session.user });
        }
      });

      // Optional: Return cleanup function if needed
      // return () => subscription.unsubscribe();
    } catch (error) {
      log.error("Initialize auth failed", error);
      set({ loading: false });
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Check for specific error about email confirmation
      if (error) {
        log.error("Supabase auth error", error);

        // Email not confirmed error
        if (error.message.includes("Email not confirmed")) {
          log.info("Email verification required", email);

          // Set pending verification with available info
          set({
            pendingVerification: {
              email: email,
              phone: "",
              userId: "",
            },
          });

          // Throw custom error for the login screen to handle
          const customError = new Error("EMAIL_NOT_VERIFIED");
          customError.name = "EmailNotVerifiedError";
          throw customError;
        }

        // Other auth errors (wrong password, etc.)
        throw error;
      }

      // Successful login - additional verification check (if Supabase allows unverified logins)
      if (data.user && !data.user.email_confirmed_at) {
        log.warn("User email not verified (backup check)", data.user.email);

        set({
          pendingVerification: {
            email: data.user.email!,
            phone: data.user.user_metadata.phone || "",
            userId: data.user.id,
          },
        });

        // Sign out the session
        await supabase.auth.signOut();

        const customError = new Error("EMAIL_NOT_VERIFIED");
        customError.name = "EmailNotVerifiedError";
        throw customError;
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      // Sync profile to profileStore
      useProfileStore.getState().setProfile(profile);

      set({
        session: data.session,
        user: data.user,
      });

      // Clear failed login attempts after successful login
      await get().clearFailedAttempts(email);
      log.info("Failed login attempts cleared after successful login");
    } catch (error: any) {
      log.error("Sign in failed", error);
      throw error;
    }
  },

  // Sign up new user (sends OTP to email only)
  signUp: async ({
    email,
    password,
    full_name,
    username,
    phone,
  }: SignUpData) => {
    try {
      // Format phone with country code
      const phoneWithCountryCode = `+91${phone}`;

      // Create auth user with email (OTP automatically sent)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name,
            username,
            phone: phoneWithCountryCode,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Store pending verification data
      set({
        pendingVerification: {
          email,
          phone: phoneWithCountryCode,
          userId: authData.user.id,
        },
      });
    } catch (error) {
      log.error("Sign up failed", error);
      throw error;
    }
  },

  // Verify email OTP
  verifyEmailOtp: async (email: string, otp: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (error) throw error;

      // After successful verification, fetch/create profile
      if (data.user) {
        // Retry profile fetch with exponential backoff
        const fetchProfile = async (
          retries = 5,
          delay = 500,
        ): Promise<Profile | null> => {
          for (let i = 0; i < retries; i++) {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user!.id)
              .maybeSingle();

            if (profile) {
              log.info("Profile fetched successfully");
              return profile;
            }

            if (i < retries - 1) {
              log.warn(`Profile not found, retry ${i + 1}/${retries}`);
              await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
            }
          }
          return null;
        };

        const profile = await fetchProfile();

        if (!profile) {
          log.error("Profile creation failed after verification");
          throw new Error(
            "Account created but profile setup incomplete. Please contact support.",
          );
        }

        // Sync profile to profileStore
        useProfileStore.getState().setProfile(profile);

        set({
          session: data.session,
          user: data.user,
          pendingVerification: null,
        });
      }
    } catch (error) {
      log.error("Email OTP verification failed", error);
      throw error;
    }
  },

  // Resend email OTP
  resendEmailOtp: async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw error;
      log.info("OTP resent successfully", email);
    } catch (error) {
      log.error("Resend email OTP failed", error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const currentEmail = get().user?.email;

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear failed login attempts on logout
      if (currentEmail) {
        await get().clearFailedAttempts(currentEmail);
        log.info("Failed login attempts cleared on logout");
      }

      // Clear profile from profileStore
      useProfileStore.getState().setProfile(null);

      set({
        session: null,
        user: null,
      });
    } catch (error) {
      log.error("Sign out failed", error);
      throw error;
    }
  },

  // Reset password - send recovery OTP
  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "shelfscore://reset-password",
      });

      if (error) throw error;
      log.info("Password recovery OTP sent", email);
    } catch (error) {
      log.error("Reset password failed", error);
      throw error;
    }
  },

  // Verify recovery OTP and establish RECOVERY session
  verifyResetOtp: async (email: string, otp: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "recovery",
      });

      if (error) throw error;

      // User now has RECOVERY session (limited scope)
      set({
        session: data.session,
        user: data.user,
      });

      log.info("Recovery OTP verified successfully");
    } catch (error) {
      log.error("Recovery OTP verification failed", error);
      throw error;
    }
  },

  // Update password (requires active recovery session)
  updatePassword: async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      // Fetch profile after password update
      const currentUser = get().user;
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        // Sync profile to profileStore
        if (profile) {
          useProfileStore.getState().setProfile(profile);
        }

        // Clear failed login attempts after successful password reset
        if (currentUser.email) {
          await get().clearFailedAttempts(currentUser.email);
          log.info("Failed login attempts cleared after password reset");
        }
      }

      log.info("Password updated successfully");
    } catch (error) {
      log.error("Update password failed", error);
      throw error;
    }
  },

  // Set pending verification data
  setPendingVerification: (data) => set({ pendingVerification: data }),

  // Check if account is locked due to failed login attempts
  checkAccountLocked: async (email: string) => {
    try {
      const { data, error } = await supabase.rpc("is_account_locked", {
        user_email: email,
      });

      if (error) {
        log.error("Check account locked failed", error);
        return false; // Fail open - don't block user if check fails
      }

      return data as boolean;
    } catch (error) {
      log.error("Check account locked exception", error);
      return false;
    }
  },

  // Record a failed login attempt
  recordFailedLogin: async (email: string) => {
    try {
      const { error } = await supabase.rpc("record_failed_login", {
        user_email: email,
        user_ip: undefined,
      });

      if (error) {
        log.error("Record failed login failed", error);
      }
    } catch (error) {
      log.error("Record failed login exception", error);
    }
  },

  // Clear all failed login attempts (on successful login)
  clearFailedAttempts: async (email: string) => {
    try {
      const { error } = await supabase.rpc("clear_failed_attempts", {
        user_email: email,
      });

      if (error) {
        log.error("Clear failed attempts failed", error);
      }
    } catch (error) {
      log.error("Clear failed attempts exception", error);
    }
  },
}));
