// lib/utils/alerts.ts
import { Alert } from "react-native";
import { AppErrorCode, isAppError, parseSupabaseError } from "./errorHandling";

/**
 * Titles mapped per error code category.
 */
const ERROR_TITLES: Record<AppErrorCode, string> = {
  EMAIL_NOT_VERIFIED: "Email Not Verified",
  INVALID_CREDENTIALS: "Login Failed",
  EMAIL_NOT_CONFIRMED: "Email Not Verified",
  EMAIL_RATE_LIMIT: "Too Many Attempts",
  USER_ALREADY_REGISTERED: "Account Exists",
  OTP_EXPIRED: "Code Expired",
  OTP_INVALID: "Invalid Code",
  OTP_ALREADY_USED: "Code Already Used",
  OTP_BLOCKED: "Too Many Attempts",
  DUPLICATE_USERNAME: "Username Taken",
  DUPLICATE_PHONE: "Phone Already Registered",
  DUPLICATE_EMAIL: "Email Already Registered",
  DUPLICATE_VALUE: "Already In Use",
  FOREIGN_KEY_VIOLATION: "Invalid Reference",
  NOT_NULL_VIOLATION: "Missing Required Field",
  INSUFFICIENT_PRIVILEGE: "Permission Denied",
  INPUT_TOO_LONG: "Input Too Long",
  NOT_FOUND: "Not Found",
  NETWORK_ERROR: "No Connection",
  TIMEOUT: "Request Timed Out",
  UNKNOWN: "Something Went Wrong",
};

/**
 * Shows a blocking Alert for errors that need user acknowledgment.
 *
 * Usage:
 *   showErrorAlert(error)               // auto-parses any error
 *   showErrorAlert(error, "Trip")       // prefixes context to title e.g. "Trip — Login Failed"
 */
export const showErrorAlert = (error: unknown, context?: string) => {
  const appError = isAppError(error) ? error : parseSupabaseError(error);
  const baseTitle = ERROR_TITLES[appError.code] ?? "Something Went Wrong";
  const title = context ? `${context} — ${baseTitle}` : baseTitle;

  Alert.alert(title, appError.userMessage);
};

/**
 * Shows a blocking confirmation Alert for destructive actions.
 *
 * Usage:
 *   showConfirmAlert(
 *     "Cancel Request",
 *     "Are you sure? This cannot be undone.",
 *     () => handleCancel()
 *   )
 */
export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = "Confirm",
  destructive = true,
) => {
  Alert.alert(title, message, [
    { text: "Go Back", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
};

/**
 * Shows a blocking Alert for navigation guards and session errors
 * where the user must acknowledge before being redirected.
 *
 * Usage:
 *   showSessionAlert("Session expired", "Please log in again.", () => router.replace("/(auth)/login"))
 */
export const showSessionAlert = (
  title: string,
  message: string,
  onDismiss: () => void,
  buttonLabel = "OK",
) => {
  Alert.alert(title, message, [{ text: buttonLabel, onPress: onDismiss }]);
};
