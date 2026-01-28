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

    // Arrival is optional (can be null or empty string)
    arrival_date: z.string().nullable(),
    arrival_time: z.string().nullable(),

    // Capacity
    total_slots: z
      .number()
      .int()
      .min(1, "At least 1 slot required")
      .max(5, "Maximum 5 slots allowed"),

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
    notes: z
      .string()
      .max(500, "Notes are too long")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      // Only validate arrival if both date and time are provided
      if (!data.arrival_date || !data.arrival_time) {
        return true; // Skip validation if arrival not set
      }

      // Validate arrival is after departure
      const departureDateTime = new Date(
        `${data.departure_date}T${data.departure_time}`,
      );
      const arrivalDateTime = new Date(
        `${data.arrival_date}T${data.arrival_time}`,
      );
      return arrivalDateTime > departureDateTime;
    },
    {
      message: "Arrival must be after departure",
      path: ["arrival_date"],
    },
  )
  .refine(
    (data) => {
      // Validate departure is not in the past (5-minute grace period)
      const departureDateTime = new Date(
        `${data.departure_date}T${data.departure_time}`,
      );
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      return departureDateTime > fiveMinutesAgo;
    },
    {
      message: "Departure cannot be in the past",
      path: ["departure_date"],
    },
  )
  .refine(
    (data) => {
      // Ensure source and destination are different
      return (
        data.source.toLowerCase().trim() !==
        data.destination.toLowerCase().trim()
      );
    },
    {
      message: "Source and destination must be different",
      path: ["destination"],
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
    arrival_date: data.arrival_date || null,
    arrival_time: data.arrival_time || null,
    total_slots: data.total_slots,
    available_slots: data.total_slots,
    allowed_categories: data.allowed_categories,
    pnr_number: data.pnr_number.trim(),
    ticket_file_url: data.ticket_file_url,
    notes: data.notes || null,
    status: "open" as const,
  };
};
