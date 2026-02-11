import { z } from "zod";

// Transport mode enum
export const TRANSPORT_MODES = ["train", "bus", "flight", "car"] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];

// Package categories enum
export const PACKAGE_CATEGORIES = [
  "documents",
  "clothing",
  "medicines",
  "books",
  "small_items",
] as const;

export type PackageCategory = (typeof PACKAGE_CATEGORIES)[number];

// Parcel size capacity enum
export const PARCEL_SIZE_CAPACITY = ["small", "medium", "large"] as const;

export type ParcelSizeCapacity = (typeof PARCEL_SIZE_CAPACITY)[number];

// Size descriptions for UI (what traveller can carry)
export const SIZE_CAPACITY_DESCRIPTIONS: Record<ParcelSizeCapacity, string> = {
  small: "Less than 1 kg",
  medium: "1-3 kg",
  large: "Up to 5 kg",
};

// Helper function for consistent date parsing
const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr || !timeStr) return null;

  // Parse date components
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;

  // Parse time components
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return null;

  // Create date using local timezone (consistent with backend)
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // Validate the date is valid
  if (isNaN(date.getTime())) return null;

  return date;
};

// Trip creation schema
export const tripSchema = z
  .object({
    // Route
    source: z
      .string()
      .min(2, "Source must be at least 2 characters")
      .max(100, "Source is too long"),
    destination: z
      .string()
      .min(2, "Destination must be at least 2 characters")
      .max(100, "Destination is too long"),

    // Transport
    transport_mode: z.enum(TRANSPORT_MODES, {
      message: "Please select a valid transport mode",
    }),

    // Schedule - departure is required
    departure_date: z.string().min(1, "Departure date is required"),
    departure_time: z.string().min(1, "Departure time is required"),

    // Arrival is required
    arrival_date: z.string().min(1, "Arrival date is required"),
    arrival_time: z.string().min(1, "Arrival time is required"),

    // Parcel size capacity
    parcel_size_capacity: z.enum(PARCEL_SIZE_CAPACITY, {
      message: "Please select parcel size capacity",
    }),

    // Categories
    allowed_categories: z
      .array(z.enum(PACKAGE_CATEGORIES))
      .min(1, "Select at least one category"),

    pnr_number: z
      .string()
      .min(1, "PNR number is required")
      .regex(/^[A-Z0-9]+$/i, "PNR should be alphanumeric")
      .min(3, "PNR must be at least 3 characters")
      .max(20, "PNR must be less than 20 characters"),

    ticket_file_url: z.string().min(1, "Ticket file is required").pipe(z.url()),
  })
  // Validation 1: Source and destination must be different
  .refine(
    (data) => {
      return (
        data.source.toLowerCase().trim() !==
        data.destination.toLowerCase().trim()
      );
    },
    {
      message: "Source and destination must be different",
      path: ["destination"],
    },
  )
  // Validation 2: Departure must be at least 1 hour in the future (matches backend)
  .refine(
    (data) => {
      const departureDateTime = parseDateTime(
        data.departure_date,
        data.departure_time,
      );

      if (!departureDateTime) return false;

      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      return departureDateTime >= oneHourFromNow;
    },
    {
      message: "Departure must be at least 1 hour in the future",
      path: ["departure_time"],
    },
  )
  // Validation 3: Arrival must be after departure
  .refine(
    (data) => {
      const departureDateTime = parseDateTime(
        data.departure_date,
        data.departure_time,
      );
      const arrivalDateTime = parseDateTime(
        data.arrival_date,
        data.arrival_time,
      );

      if (!departureDateTime || !arrivalDateTime) return false;

      return arrivalDateTime.getTime() > departureDateTime.getTime();
    },
    {
      message: "Arrival must be after departure",
      path: ["arrival_time"],
    },
  )
  // Validation 4: Same date requires different times
  .refine(
    (data) => {
      // Only apply if dates are the same
      if (data.departure_date !== data.arrival_date) return true;

      // If same date, times must be different
      return data.departure_time !== data.arrival_time;
    },
    {
      message:
        "Arrival time must be different from departure time on the same day",
      path: ["arrival_time"],
    },
  );

export type TripFormData = z.infer<typeof tripSchema>;

// Helper to convert form data to database format
export const formatTripForDatabase = (
  data: TripFormData,
  travellerId: string,
) => {
  return {
    traveller_id: travellerId,
    source: data.source.trim(),
    destination: data.destination.trim(),
    transport_mode: data.transport_mode,
    departure_date: data.departure_date,
    departure_time: data.departure_time,
    arrival_date: data.arrival_date,
    arrival_time: data.arrival_time,
    parcel_size_capacity: data.parcel_size_capacity,
    allowed_categories: data.allowed_categories,
    pnr_number: data.pnr_number.trim(),
    ticket_file_url: data.ticket_file_url,
    status: "upcoming" as const,
  };
};
