import { UI } from "@/lib/constants";
import { formatCountdown } from "@/lib/utils/dateTime";
import { useEffect, useState } from "react";

interface CountdownResult {
  text: string;
  expired: boolean;
  expiringSoon: boolean;
}

/**
 * Hook to manage countdown timer for expiry dates
 * @param expiryISOString - ISO datetime string for expiry
 * @returns Countdown information that updates every minute
 */
export const useCountdown = (
  expiryISOString?: string,
): CountdownResult | null => {
  const [countdown, setCountdown] = useState<CountdownResult | null>(() =>
    expiryISOString ? formatCountdown(expiryISOString) : null,
  );

  useEffect(() => {
    if (!expiryISOString) {
      setCountdown(null);
      return;
    }

    const update = () => {
      setCountdown(formatCountdown(expiryISOString));
    };

    // Update immediately
    update();

    // Then update every minute
    const interval = setInterval(update, UI.TIMER_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [expiryISOString]);

  return countdown;
};
