// stores/profileStore.ts
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/utils/logger";
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
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  profile: null,
  loading: false,

  // Set profile directly (used by authStore after login)
  setProfile: (profile) => {
    set({ profile });
    logger.info("Profile set", { username: profile?.username });
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
      logger.info("Profile refreshed", { username: profile.username });
    } catch (error) {
      logger.error("Refresh profile failed", error);
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
      logger.info("Profile updated", { updates });
    } catch (error) {
      logger.error("Update profile failed", error);
      set({ loading: false });
      throw error;
    }
  },
}));
