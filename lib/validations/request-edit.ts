// lib/validations/request-edit.ts
import { z } from "zod";

// ============================================================================
// REQUEST DETAILS SCHEMA (before acceptance)
// Editable fields: item_description, category, parcel_photos
// ============================================================================
export const requestEditDetailsSchema = z.object({
  item_description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description is too long"),
  category: z.string().min(1, "Please select a category"),
  parcel_photos: z
    .array(z.string().url())
    .length(2, "Exactly 2 photos are required"),
});

export type RequestEditDetailsFormData = z.infer<
  typeof requestEditDetailsSchema
>;

// ============================================================================
// RECEIVER DETAILS SCHEMA (before delivery)
// Editable fields: delivery_contact_name, delivery_contact_phone
// ============================================================================
export const requestEditReceiverSchema = z.object({
  delivery_contact_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  delivery_contact_phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
});

export type RequestEditReceiverFormData = z.infer<
  typeof requestEditReceiverSchema
>;
