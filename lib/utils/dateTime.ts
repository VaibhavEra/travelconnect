/**
 * Date and Time utility functions
 * Centralized formatting and manipulation of dates/times
 */

/**
 * Formats a date string to a user-friendly format
 * Shows "Today", "Tomorrow", or abbreviated date
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time portion for accurate comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a date string with full details including year
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string with year
 */
export const formatDateLong = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Formats a date string to short format (Mon, Jan 15)
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Short formatted date
 */
export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a time string from 24h to 12h format with AM/PM
 * @param timeString - Time string in HH:MM format (24-hour)
 * @returns Formatted time string in 12-hour format with AM/PM
 */
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Formats a time string to 24-hour format
 * @param timeString - Time string in HH:MM format
 * @returns Formatted time string in 24-hour format
 */
export const formatTime24 = (timeString: string): string => {
  return timeString;
};

/**
 * Combines date and time strings into a Date object
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @param timeString - Time string in HH:MM format
 * @returns Date object
 */
export const combineDateAndTime = (
  dateString: string,
  timeString: string,
): Date => {
  return new Date(`${dateString}T${timeString}`);
};

/**
 * Checks if a date is in the past
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @param timeString - Optional time string in HH:MM format
 * @returns true if date/time is in the past
 */
export const isPast = (dateString: string, timeString?: string): boolean => {
  const now = new Date();
  const dateTime = timeString
    ? combineDateAndTime(dateString, timeString)
    : new Date(dateString);
  return dateTime < now;
};

/**
 * Checks if a date is in the future
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @param timeString - Optional time string in HH:MM format
 * @returns true if date/time is in the future
 */
export const isFuture = (dateString: string, timeString?: string): boolean => {
  return !isPast(dateString, timeString);
};

/**
 * Formats countdown/time remaining until expiry
 * @param expiryISOString - ISO datetime string
 * @returns Object with formatted text, expired flag, and expiring soon flag
 */
export const formatCountdown = (expiryISOString: string) => {
  const now = new Date().getTime();
  const expiry = new Date(expiryISOString).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { text: "Expired", expired: true, expiringSoon: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const expiringSoon = diff < 60 * 60 * 1000; // Less than 1 hour

  let text = "";
  if (days > 0) {
    text = `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m remaining`;
  } else {
    text = `${minutes}m remaining`;
  }

  return { text, expired: false, expiringSoon };
};

/**
 * Gets the difference between two dates in days
 * @param dateString1 - First ISO date string
 * @param dateString2 - Second ISO date string
 * @returns Number of days between dates
 */
export const getDaysDifference = (
  dateString1: string,
  dateString2: string,
): number => {
  const date1 = new Date(dateString1);
  const date2 = new Date(dateString2);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Formats a relative time (e.g., "2 hours ago", "in 3 days")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDateShort(dateString);
};

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 * @returns ISO date string
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Gets tomorrow's date in ISO format (YYYY-MM-DD)
 * @returns ISO date string
 */
export const getTomorrowISO = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

/**
 * Formats a Date object to ISO date string (YYYY-MM-DD)
 * Useful for form inputs and API calls
 * @param date - Date object
 * @returns ISO date string
 */
export const dateToISO = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Formats a Date object to time string (HH:MM)
 * Useful for form inputs and API calls
 * @param date - Date object
 * @returns Time string in HH:MM format
 */
export const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};
