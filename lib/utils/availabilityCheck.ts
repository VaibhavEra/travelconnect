// lib/utils/availabilityCheck.ts
import { supabase } from "@/lib/supabase";

export const availabilityCheck = {
  /**
   * Check if email is available
   */
  email: async (
    email: string,
  ): Promise<{ available: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc("check_email_available", {
        check_email: email,
      });

      if (error) {
        return { available: true }; // Fail open to not block users
      }

      return { available: data as boolean };
    } catch (error) {
      return { available: true };
    }
  },

  /**
   * Check if phone is available
   */
  phone: async (
    phone: string,
  ): Promise<{ available: boolean; error?: string }> => {
    try {
      // Ensure phone has country code
      const phoneWithCode = phone.startsWith("+91") ? phone : `+91${phone}`;

      const { data, error } = await supabase.rpc("check_phone_available", {
        check_phone: phoneWithCode,
      });

      if (error) {
        return { available: true }; // Fail open
      }

      return { available: data as boolean };
    } catch (error) {
      return { available: true };
    }
  },

  /**
   * Check if username is available
   */
  username: async (
    username: string,
  ): Promise<{ available: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc("check_username_available", {
        check_username: username,
      });

      if (error) {
        return { available: true };
      }

      return { available: data as boolean };
    } catch (error) {
      return { available: true };
    }
  },
};
