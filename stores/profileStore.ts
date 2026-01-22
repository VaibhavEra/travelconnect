// stores/profileStore.ts
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";
import { create } from "zustand";

// Type for profile from database
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// Profile store state interface
interface ProfileState {
  // State
  profile: Profile | null;
  loading: boolean;

  // Actions
  setProfile: (profile: Profile | null) => void;
  refreshProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: ProfileUpdate) => Promise<void>;
  // updateAvatar: (userId: string, avatarUrl: string) => Promise<void>; // Commented out until avatar_url is added to DB
}

// Conditional logging utility
const isDev = __DEV__;
const log = {
  info: (message: string, ...args: any[]) => {
    if (isDev) console.log(`[Profile] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    if (isDev) console.error(`[Profile Error] ${message}`, error);
  },
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  profile: null,
  loading: false,

  // Set profile directly (used by authStore after login)
  setProfile: (profile) => {
    set({ profile });
    log.info("Profile set", profile?.username);
  },

  // Refresh profile data from database
  refreshProfile: async (userId: string) => {
    try {
      set({ loading: true });

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      set({ profile, loading: false });
      log.info("Profile refreshed", profile.username);
    } catch (error) {
      log.error("Refresh profile failed", error);
      set({ loading: false });
      throw error;
    }
  },

  // Update profile data
  updateProfile: async (userId: string, updates: ProfileUpdate) => {
    try {
      set({ loading: true });

      const { data: profile, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      set({ profile, loading: false });
      log.info("Profile updated", updates);
    } catch (error) {
      log.error("Update profile failed", error);
      set({ loading: false });
      throw error;
    }
  },

  // TODO: Uncomment when avatar_url is added to database
  // Update avatar URL
  // updateAvatar: async (userId: string, avatarUrl: string) => {
  //   try {
  //     set({ loading: true });

  //     const { data: profile, error } = await supabase
  //       .from("profiles")
  //       .update({ avatar_url: avatarUrl })
  //       .eq("id", userId)
  //       .select()
  //       .single();

  //     if (error) throw error;

  //     set({ profile, loading: false });
  //     log.info("Avatar updated", avatarUrl);
  //   } catch (error) {
  //     log.error("Update avatar failed", error);
  //     set({ loading: false });
  //     throw error;
  //   }
  // },
}));
