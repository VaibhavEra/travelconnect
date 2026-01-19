import { supabase } from "@/lib/supabase";

export const availabilityCheck = {
  /**
   * Check if email is available
   */
  email: async (
    email: string,
  ): Promise<{ available: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Email check error:", error);
        return { available: true }; // Fail open to not block users
      }

      return { available: !data };
    } catch (error) {
      console.error("Email check exception:", error);
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
      // Format with country code
      const phoneWithCode = phone.startsWith("+91") ? phone : `+91${phone}`;

      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("phone", phoneWithCode)
        .maybeSingle();

      if (error) {
        console.error("Phone check error:", error);
        return { available: true }; // Fail open
      }

      return { available: !data };
    } catch (error) {
      console.error("Phone check exception:", error);
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
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Username check error:", error);
        return { available: true };
      }

      return { available: !data };
    } catch (error) {
      console.error("Username check exception:", error);
      return { available: true };
    }
  },
};
