import { Ionicons } from "@expo/vector-icons";

// Request Filters
export const REQUEST_FILTERS = [
  { key: "all", label: "All", icon: "apps" as keyof typeof Ionicons.glyphMap },
  {
    key: "pending",
    label: "Pending",
    icon: "time" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "accepted",
    label: "Accepted",
    icon: "checkmark-circle" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: "close-circle" as keyof typeof Ionicons.glyphMap,
  },
] as const;

export type RequestFilterKey = (typeof REQUEST_FILTERS)[number]["key"];

// Trip Filters
export const TRIP_FILTERS = [
  { key: "all", label: "All", icon: "apps" as keyof typeof Ionicons.glyphMap },
  {
    key: "upcoming",
    label: "Upcoming",
    icon: "time" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "completed",
    label: "Completed",
    icon: "checkmark-done" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: "close-circle" as keyof typeof Ionicons.glyphMap,
  },
] as const;

export type TripFilterKey = (typeof TRIP_FILTERS)[number]["key"];

// Date Filters (for explore/search screens)
export const DATE_FILTERS = [
  { key: "all", label: "All Dates" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This Week" },
] as const;

export type DateFilterKey = (typeof DATE_FILTERS)[number]["key"];

// Delivery View Filters (for requests screen)
export const DELIVERY_FILTERS = [
  { key: "all", label: "All", icon: "apps" as keyof typeof Ionicons.glyphMap },
  {
    key: "in_transit",
    label: "In Transit",
    icon: "car" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "checkmark-done-circle" as keyof typeof Ionicons.glyphMap,
  },
] as const;

export type DeliveryFilterKey = (typeof DELIVERY_FILTERS)[number]["key"];
