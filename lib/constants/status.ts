import { Ionicons } from "@expo/vector-icons";

// Request Statuses
export const REQUEST_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "picked_up",
  "delivered",
  "cancelled",
  "expired",
  "failed",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_CONFIG: Record<
  RequestStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    colorKey: "warning" | "success" | "error" | "primary";
  }
> = {
  pending: {
    label: "Pending",
    icon: "time",
    colorKey: "warning",
  },
  accepted: {
    label: "Accepted",
    icon: "checkmark-circle",
    colorKey: "success",
  },
  rejected: {
    label: "Rejected",
    icon: "close-circle",
    colorKey: "error",
  },
  picked_up: {
    label: "Picked Up",
    icon: "hand-left",
    colorKey: "primary",
  },
  delivered: {
    label: "Delivered",
    icon: "checkmark-done-circle",
    colorKey: "success",
  },
  cancelled: {
    label: "Cancelled",
    icon: "ban",
    colorKey: "error",
  },
  expired: {
    label: "Expired",
    icon: "alert-circle",
    colorKey: "error",
  },
  failed: {
    label: "Failed",
    icon: "close-circle",
    colorKey: "error",
  },
};

// Trip Statuses
export const TRIP_STATUSES = [
  "upcoming",
  "locked",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_CONFIG: Record<
  TripStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    colorKey: "success" | "warning" | "error" | "primary";
  }
> = {
  upcoming: {
    label: "Upcoming",
    icon: "calendar",
    colorKey: "success",
  },
  locked: {
    label: "Locked",
    icon: "lock-closed",
    colorKey: "warning",
  },
  in_progress: {
    label: "In Progress",
    icon: "time",
    colorKey: "primary",
  },
  completed: {
    label: "Completed",
    icon: "checkmark-done-circle",
    colorKey: "success",
  },
  cancelled: {
    label: "Cancelled",
    icon: "close-circle",
    colorKey: "error",
  },
  expired: {
    label: "Expired",
    icon: "alert-circle",
    colorKey: "error",
  },
};
