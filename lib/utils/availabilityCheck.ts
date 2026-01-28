import { supabase } from "@/lib/supabase";
import { logger } from "./logger";

interface AvailabilityResult {
  available: boolean;
  error?: string;
}

export const availabilityCheck = {
  /**
   * Check if email is available
   */
  email: async (email: string): Promise<AvailabilityResult> => {
    try {
      const { data, error } = await supabase.rpc("check_email_available", {
        check_email: email,
      });

      if (error) {
        logger.error("Email availability check failed", error);
        return {
          available: true,
          error: "Unable to verify email availability",
        };
      }

      return { available: data as boolean };
    } catch (error) {
      logger.error("Email availability check exception", error);
      return {
        available: true,
        error: "Unable to verify email availability",
      };
    }
  },

  /**
   * Check if phone is available
   */
  phone: async (phone: string): Promise<AvailabilityResult> => {
    try {
      // Ensure phone has country code
      const phoneWithCode = phone.startsWith("+91") ? phone : `+91${phone}`;

      const { data, error } = await supabase.rpc("check_phone_available", {
        check_phone: phoneWithCode,
      });

      if (error) {
        logger.error("Phone availability check failed", error);
        return {
          available: true,
          error: "Unable to verify phone availability",
        };
      }

      return { available: data as boolean };
    } catch (error) {
      logger.error("Phone availability check exception", error);
      return {
        available: true,
        error: "Unable to verify phone availability",
      };
    }
  },

  /**
   * Check if username is available
   */
  username: async (username: string): Promise<AvailabilityResult> => {
    try {
      const { data, error } = await supabase.rpc("check_username_available", {
        check_username: username,
      });

      if (error) {
        logger.error("Username availability check failed", error);
        return {
          available: true,
          error: "Unable to verify username availability",
        };
      }

      return { available: data as boolean };
    } catch (error) {
      logger.error("Username availability check exception", error);
      return {
        available: true,
        error: "Unable to verify username availability",
      };
    }
  },
};
