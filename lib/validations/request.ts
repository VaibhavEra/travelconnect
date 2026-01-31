import { z } from "zod";

// REMOVED: PARCEL_SIZES - Size now comes from trip, not sender

// REMOVED: ParcelSize type

// REMOVED: SIZE_DESCRIPTIONS - No longer needed

// Request form schema with delivery contact required
export const requestSchema = z.object({
  item_description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description is too long"),

  category: z.string().min(1, "Please select a category"),

  // REMOVED: size field - traveller defines capacity, sender doesn't select size

  // ============================================================================
  // UPDATED: Require exactly 2 photos (matches database constraint)
  // ============================================================================
  parcel_photos: z
    .array(z.string().url())
    .length(2, "Exactly 2 photos are required"),

  // Delivery contact required for OTP and traveller contact
  delivery_contact_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  delivery_contact_phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),

  // REMOVED: sender_notes field
});

export type RequestFormData = z.infer<typeof requestSchema>;
