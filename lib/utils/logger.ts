// lib/utils/logger.ts

type LogContext = Record<string, unknown>;

interface LogMeta {
  module?: string;
  [key: string]: unknown;
}

const formatMessage = (message: string, meta?: LogMeta): string => {
  return meta?.module ? `[${meta.module}] ${message}` : message;
};

export const logger = {
  info: (message: string, context?: LogContext, meta?: LogMeta) => {
    if (__DEV__) {
      console.log(`[INFO] ${formatMessage(message, meta)}`, context ?? "");
    }
    // TODO: Add analytics service in production (e.g., Mixpanel, Amplitude)
  },

  error: (message: string, error?: unknown, meta?: LogMeta) => {
    if (__DEV__) {
      console.error(`[ERROR] ${formatMessage(message, meta)}`, error ?? "");
    }
    // TODO: Add error tracking in production (e.g., Sentry)
    // e.g. Sentry.captureException(error, { extra: { message, ...meta } })
  },

  warn: (message: string, context?: LogContext, meta?: LogMeta) => {
    if (__DEV__) {
      console.warn(`[WARN] ${formatMessage(message, meta)}`, context ?? "");
    }
  },

  debug: (message: string, context?: LogContext, meta?: LogMeta) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${formatMessage(message, meta)}`, context ?? "");
    }
  },
};
