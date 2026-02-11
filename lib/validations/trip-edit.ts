// lib/validations/trip-edit.ts
import { z } from "zod";
import {
  PACKAGE_CATEGORIES,
  PARCEL_SIZE_CAPACITY,
  parseDateTime,
} from "./trip";

// ============================================================================
// GENERAL DETAILS SCHEMA (before acceptance, before pickup)
// Editable fields: parcel_size_capacity, allowed_categories, pnr_number, ticket_file_url
// ============================================================================
export const tripEditDetailsSchema = z.object({
  parcel_size_capacity: z.enum(PARCEL_SIZE_CAPACITY, {
    message: "Please select parcel size capacity",
  }),
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
});

export type TripEditDetailsFormData = z.infer<typeof tripEditDetailsSchema>;

// ============================================================================
// DATES SCHEMA (after acceptance, before pickup)
// Editable fields: departure_date, departure_time, arrival_date, arrival_time
// ============================================================================
export const tripEditDatesSchema = z
  .object({
    departure_date: z.string().min(1, "Departure date is required"),
    departure_time: z.string().min(1, "Departure time is required"),
    arrival_date: z.string().min(1, "Arrival date is required"),
    arrival_time: z.string().min(1, "Arrival time is required"),
  })
  // Validation 1: Departure must be at least 1 hour in the future (matches backend)
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
  // Validation 2: Arrival must be after departure
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
  // Validation 3: Same date requires different times
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

export type TripEditDatesFormData = z.infer<typeof tripEditDatesSchema>;
