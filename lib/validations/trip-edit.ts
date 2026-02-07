// lib/validations/trip-edit.ts
import { z } from "zod";
import {
  PACKAGE_CATEGORIES,
  PARCEL_SIZE_CAPACITY,
  TRANSPORT_MODES,
} from "./trip";

// Validation for editing trip details (non-date fields)
export const tripDetailsSchema = z
  .object({
    source: z
      .string()
      .min(2, "Source must be at least 2 characters")
      .max(100, "Source is too long"),
    destination: z
      .string()
      .min(2, "Destination must be at least 2 characters")
      .max(100, "Destination is too long"),
    transport_mode: z.enum(TRANSPORT_MODES, {
      message: "Please select a valid transport mode",
    }),
    parcel_size_capacity: z.enum(PARCEL_SIZE_CAPACITY, {
      message: "Please select parcel size capacity",
    }),
    allowed_categories: z
      .array(z.enum(PACKAGE_CATEGORIES))
      .min(1, "Select at least one category"),
    notes: z
      .string()
      .max(500, "Notes are too long")
      .optional()
      .or(z.literal("")),
  })
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
  );

export type TripDetailsFormData = z.infer<typeof tripDetailsSchema>;

// Validation for editing trip dates only
export const tripDatesSchema = z
  .object({
    departure_date: z.string().min(1, "Departure date is required"),
    departure_time: z.string().min(1, "Departure time is required"),
    arrival_date: z.string().nullable(),
    arrival_time: z.string().nullable(),
  })
  .refine(
    (data) => {
      if (!data.departure_date || !data.departure_time) {
        return true;
      }

      const [year, month, day] = data.departure_date.split("-").map(Number);
      const [hours, minutes] = data.departure_time.split(":").map(Number);
      const departureDateTime = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();

      return departureDateTime.getTime() > now.getTime();
    },
    {
      message: "Departure cannot be in the past",
      path: ["departure_date"],
    },
  )
  .refine(
    (data) => {
      if (!data.arrival_date || !data.arrival_time) {
        return true;
      }

      const departureDateTime = new Date(
        `${data.departure_date}T${data.departure_time}:00`,
      );
      const arrivalDateTime = new Date(
        `${data.arrival_date}T${data.arrival_time}:00`,
      );

      return arrivalDateTime.getTime() > departureDateTime.getTime();
    },
    {
      message: "Arrival must be after departure",
      path: ["arrival_date"],
    },
  );

export type TripDatesFormData = z.infer<typeof tripDatesSchema>;
