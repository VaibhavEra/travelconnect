// lib/utils/logger.ts

/**
 * Logger utility for development and production
 *
 * - Development: Logs to console for debugging
 * - Production: Silent (can add Sentry/LogRocket later)
 *
 * __DEV__ is automatically set by React Native:
 * - true in development builds
 * - false in production (completely stripped out during minification)
 */

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, ...args);
    }
    // TODO: Add analytics service in production (e.g., Mixpanel, Amplitude)
  },

  error: (message: string, error?: any) => {
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, error);
    }
    // TODO: Add error tracking in production (e.g., Sentry)
  },

  warn: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
};
