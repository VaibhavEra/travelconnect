interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// Helper to format wait time
const formatWaitTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
};

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();

  /**
   * Check if an action is allowed
   */
  check(
    key: string,
    config: RateLimitConfig,
  ): { allowed: boolean; retryAfter?: string } {
    const now = Date.now();
    const record = this.records.get(key);

    // No previous attempts
    if (!record) {
      this.records.set(key, {
        attempts: 1,
        firstAttempt: now,
      });
      return { allowed: true };
    }

    // Currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { allowed: false, retryAfter: formatWaitTime(retryAfterSeconds) };
    }

    // Window expired, reset
    if (now - record.firstAttempt > config.windowMs) {
      this.records.set(key, {
        attempts: 1,
        firstAttempt: now,
      });
      return { allowed: true };
    }

    // Within window, increment attempts
    record.attempts++;

    // Exceeded max attempts, block
    if (record.attempts > config.maxAttempts) {
      record.blockedUntil = now + config.blockDurationMs;
      this.records.set(key, record);
      const retryAfterSeconds = Math.ceil(config.blockDurationMs / 1000);
      return { allowed: false, retryAfter: formatWaitTime(retryAfterSeconds) };
    }

    this.records.set(key, record);
    return { allowed: true };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Clear all records (useful for logout)
   */
  clear(): void {
    this.records.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Preset configs
export const rateLimitConfigs = {
  // REMOVED: login config (database handles this now)
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  otpResend: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
};
