// stores/authStore.ts
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/utils/logger";
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

// Auth flow states (NEW)
export enum AuthFlowState {
  UNAUTHENTICATED = "unauthenticated",
  SIGNUP_OTP_SENT = "signup_otp_sent",
  RESET_OTP_SENT = "reset_otp_sent",
  RESET_SESSION_ACTIVE = "reset_session_active",
  AUTHENTICATED = "authenticated",
}

// Flow context (NEW)
interface AuthFlowContext {
  email?: string;
  phone?: string;
  userId?: string;
  otpPurpose?: "signup" | "reset";
  resetSessionExpiry?: number; // timestamp
}

// Auth store state interface
interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  loading: boolean;

  // NEW: Flow state
  flowState: AuthFlowState;
  flowContext: AuthFlowContext | null;

  // DEPRECATED: Use flowContext instead
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

  // NEW: Flow state management
  setFlowState: (state: AuthFlowState, context?: AuthFlowContext) => void;
  clearFlowContext: () => void;

  // DEPRECATED: Use setFlowState instead
  setPendingVerification: (
    data: { email: string; phone: string; userId: string } | null,
  ) => void;

  // Security
  checkAccountLocked: (email: string) => Promise<boolean>;
  recordFailedLogin: (email: string) => Promise<void>;
  clearFailedAttempts: (email: string) => Promise<void>;
}

// Store auth subscription outside store to prevent leaks (FIXED)
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  session: null,
  user: null,
  loading: true,
  flowState: AuthFlowState.UNAUTHENTICATED,
  flowContext: null,
  pendingVerification: null, // DEPRECATED

  // NEW: Set flow state
  setFlowState: (state: AuthFlowState, context?: AuthFlowContext) => {
    logger.info("Setting flow state", { state, context });
    set({ flowState: state, flowContext: context || null });
  },

  // NEW: Clear flow context
  clearFlowContext: () => {
    logger.info("Clearing flow context");
    set({
      flowState: AuthFlowState.UNAUTHENTICATED,
      flowContext: null,
      pendingVerification: null,
    });
  },

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
          flowState: AuthFlowState.AUTHENTICATED,
          loading: false,
        });
      } else {
        set({ loading: false });
      }

      // Clean up previous subscription if exists (FIXED)
      if (authSubscription) {
        authSubscription.unsubscribe();
      }

      // Store subscription to clean up later
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.info("Auth state changed", { event });

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
            flowState: AuthFlowState.AUTHENTICATED,
            loading: false,
          });
        } else if (event === "SIGNED_OUT") {
          // Clear profile from profileStore
          useProfileStore.getState().setProfile(null);

          set({
            session: null,
            user: null,
            flowState: AuthFlowState.UNAUTHENTICATED,
            flowContext: null,
            loading: false,
          });
        } else if (event === "TOKEN_REFRESHED" && session) {
          set({ session, user: session.user });
        }
      });

      authSubscription = subscription;
    } catch (error) {
      logger.error("Initialize auth failed", error);
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
        logger.error("Supabase auth error", error);

        // Email not confirmed error
        if (error.message.includes("Email not confirmed")) {
          logger.info("Email verification required", { email });

          // Set pending verification with available info
          set({
            flowState: AuthFlowState.SIGNUP_OTP_SENT,
            flowContext: {
              email,
              phone: "",
              userId: "",
              otpPurpose: "signup",
            },
            // DEPRECATED: Also set old format for backward compatibility
            pendingVerification: {
              email,
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
        logger.warn("User email not verified (backup check)", {
          email: data.user.email,
        });

        set({
          flowState: AuthFlowState.SIGNUP_OTP_SENT,
          flowContext: {
            email: data.user.email!,
            phone: data.user.user_metadata.phone || "",
            userId: data.user.id,
            otpPurpose: "signup",
          },
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
        flowState: AuthFlowState.AUTHENTICATED,
      });

      // Clear failed login attempts after successful login
      await get().clearFailedAttempts(email);
      logger.info("Failed login attempts cleared after successful login");
    } catch (error: any) {
      logger.error("Sign in failed", error);
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

      // Store flow context (NEW)
      set({
        flowState: AuthFlowState.SIGNUP_OTP_SENT,
        flowContext: {
          email,
          phone: phoneWithCountryCode,
          userId: authData.user.id,
          otpPurpose: "signup",
        },
        // DEPRECATED: Also set old format for backward compatibility
        pendingVerification: {
          email,
          phone: phoneWithCountryCode,
          userId: authData.user.id,
        },
      });
    } catch (error) {
      logger.error("Sign up failed", error);
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
              logger.info("Profile fetched successfully");
              return profile;
            }

            if (i < retries - 1) {
              logger.warn(`Profile not found, retry ${i + 1}/${retries}`);
              await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
            }
          }
          return null;
        };

        const profile = await fetchProfile();

        if (!profile) {
          logger.error("Profile creation failed after verification");
          throw new Error(
            "Account created but profile setup incomplete. Please contact support.",
          );
        }

        // Sync profile to profileStore
        useProfileStore.getState().setProfile(profile);

        set({
          session: data.session,
          user: data.user,
          flowState: AuthFlowState.AUTHENTICATED,
          flowContext: null,
          pendingVerification: null,
        });
      }
    } catch (error) {
      logger.error("Email OTP verification failed", error);
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
      logger.info("OTP resent successfully", { email });
    } catch (error) {
      logger.error("Resend email OTP failed", error);
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
        logger.info("Failed login attempts cleared on logout");
      }

      // Clean up auth subscription (FIXED)
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }

      // Clear profile from profileStore
      useProfileStore.getState().setProfile(null);

      // FULL RESET (FIXED)
      set({
        session: null,
        user: null,
        flowState: AuthFlowState.UNAUTHENTICATED,
        flowContext: null,
        pendingVerification: null,
      });
    } catch (error) {
      logger.error("Sign out failed", error);
      throw error;
    }
  },

  // Reset password - send recovery OTP
  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "travelconnect://reset-password",
      });

      if (error) throw error;

      // Set flow state (NEW)
      set({
        flowState: AuthFlowState.RESET_OTP_SENT,
        flowContext: {
          email,
          otpPurpose: "reset",
        },
      });

      logger.info("Password recovery OTP sent", { email });
    } catch (error) {
      logger.error("Reset password failed", error);
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

      // User now has RECOVERY session with expiry (NEW)
      const resetSessionExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      set({
        session: data.session,
        user: data.user,
        flowState: AuthFlowState.RESET_SESSION_ACTIVE,
        flowContext: {
          email,
          otpPurpose: "reset",
          resetSessionExpiry,
        },
      });

      logger.info("Recovery OTP verified successfully");
    } catch (error) {
      logger.error("Recovery OTP verification failed", error);
      throw error;
    }
  },

  // Update password (requires active recovery session)
  updatePassword: async (newPassword: string) => {
    try {
      // Check if reset session is still valid (NEW)
      const { flowContext } = get();
      if (
        !flowContext?.resetSessionExpiry ||
        Date.now() > flowContext.resetSessionExpiry
      ) {
        throw new Error(
          "Reset session has expired. Please request a new code.",
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
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
          logger.info("Failed login attempts cleared after password reset");
        }
      }

      // Update to authenticated state (NEW)
      set({
        flowState: AuthFlowState.AUTHENTICATED,
        flowContext: null,
      });

      logger.info("Password updated successfully");
    } catch (error) {
      logger.error("Update password failed", error);
      throw error;
    }
  },

  // DEPRECATED: Use setFlowState instead
  setPendingVerification: (data) => {
    set({ pendingVerification: data });
  },

  // Check if account is locked due to failed login attempts
  checkAccountLocked: async (email: string) => {
    try {
      const { data, error } = await supabase.rpc("is_account_locked", {
        user_email: email,
      });

      if (error) {
        logger.error("Check account locked failed", error);
        return false; // Fail open - don't block user if check fails
      }

      return data as boolean;
    } catch (error) {
      logger.error("Check account locked exception", error);
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
        logger.error("Record failed login failed", error);
      }
    } catch (error) {
      logger.error("Record failed login exception", error);
    }
  },

  // Clear all failed login attempts (on successful login)
  clearFailedAttempts: async (email: string) => {
    try {
      const { error } = await supabase.rpc("clear_failed_attempts", {
        user_email: email,
      });

      if (error) {
        logger.error("Clear failed attempts failed", error);
      }
    } catch (error) {
      logger.error("Clear failed attempts exception", error);
    }
  },
}));
