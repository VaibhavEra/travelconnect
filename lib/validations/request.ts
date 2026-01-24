import { z } from "zod";

export const PARCEL_SIZES = ["small", "medium", "large"] as const;

export type ParcelSize = (typeof PARCEL_SIZES)[number];

// Size descriptions for UI
export const SIZE_DESCRIPTIONS: Record<ParcelSize, string> = {
  small: "Fits in pocket/small bag (< 1kg)",
  medium: "Fits in backpack (1-3kg)",
  large: "Requires dedicated luggage space (3-5kg)",
};

// Request form schema with delivery contact required
export const requestSchema = z.object({
  item_description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description is too long"),

  category: z.string().min(1, "Please select a category"),

  size: z.enum(PARCEL_SIZES, {
    message: "Please select a size",
  }),

  parcel_photos: z
    .array(z.string().url())
    .min(1, "Please upload at least one photo")
    .max(5, "Maximum 5 photos allowed"),

  // Delivery contact required for OTP and traveller contact
  delivery_contact_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  delivery_contact_phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),

  sender_notes: z
    .string()
    .max(300, "Notes are too long")
    .optional()
    .or(z.literal("")),
});

export type RequestFormData = z.infer<typeof requestSchema>;
