import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";
import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

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
  profile: Profile | null;
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
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setPendingVerification: (
    data: { email: string; phone: string; userId: string } | null,
  ) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  session: null,
  user: null,
  profile: null,
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

        set({
          session,
          user: session.user,
          profile,
          loading: false,
        });
      } else {
        set({ loading: false });
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event);

        if (event === "SIGNED_IN" && session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          set({
            session,
            user: session.user,
            profile,
            loading: false,
          });
        } else if (event === "SIGNED_OUT") {
          set({
            session: null,
            user: null,
            profile: null,
            loading: false,
          });
        } else if (event === "TOKEN_REFRESHED" && session) {
          set({ session, user: session.user });
        }
      });
    } catch (error) {
      console.error("Initialize auth error:", error);
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
        console.log("❌ Supabase auth error:", error.message);

        // Email not confirmed error
        if (error.message.includes("Email not confirmed")) {
          console.log("⚠️ Email verification required for:", email);

          // Set pending verification with available info
          set({
            pendingVerification: {
              email: email,
              phone: "", // Unknown at this point
              userId: "", // Unknown at this point
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
        console.log(
          "⚠️ User email not verified (backup check):",
          data.user.email,
        );

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

      set({
        session: data.session,
        user: data.user,
        profile,
      });
    } catch (error: any) {
      console.error("❌ Sign in error:", error);
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
          emailRedirectTo: undefined, // Disable magic link
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

      // Email OTP is automatically sent by Supabase during signUp
    } catch (error) {
      console.error("Sign up error:", error);
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
        // Wait a moment for the database trigger to create the profile
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.warn("Profile not found after verification:", profileError);
        }

        set({
          session: data.session,
          user: data.user,
          profile: profile || null,
          pendingVerification: null,
        });
      }
    } catch (error) {
      console.error("Email OTP verification error:", error);
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
    } catch (error) {
      console.error("Resend email OTP error:", error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        session: null,
        user: null,
        profile: null,
      });
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  },

  // Refresh profile data
  refreshProfile: async () => {
    try {
      const currentUser = get().user;
      if (!currentUser) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) throw error;

      set({ profile });
    } catch (error) {
      console.error("Refresh profile error:", error);
      throw error;
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "travelconnect://reset-password",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  },

  // Set pending verification data
  setPendingVerification: (data) => set({ pendingVerification: data }),
}));
