import { Ionicons } from "@expo/vector-icons";

export type Category =
  | "documents"
  | "clothing"
  | "food"
  | "electronics"
  | "medicines"
  | "books"
  | "others";

export const CATEGORY_CONFIG: Record<
  Category,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  documents: {
    label: "Documents",
    icon: "document-text",
  },
  clothing: {
    label: "Clothing",
    icon: "shirt",
  },
  food: {
    label: "Food",
    icon: "fast-food",
  },
  electronics: {
    label: "Electronics",
    icon: "hardware-chip",
  },
  medicines: {
    label: "Medicines",
    icon: "medical",
  },
  books: {
    label: "Books",
    icon: "book",
  },
  others: {
    label: "Others",
    icon: "ellipsis-horizontal",
  },
};

export const SIZE_CONFIG = {
  small: {
    label: "Small",
    icon: "bag-handle" as keyof typeof Ionicons.glyphMap,
    description: "Fits in a bag",
  },
  medium: {
    label: "Medium",
    icon: "briefcase" as keyof typeof Ionicons.glyphMap,
    description: "Briefcase size",
  },
  large: {
    label: "Large",
    icon: "cube" as keyof typeof Ionicons.glyphMap,
    description: "Suitcase size",
  },
};
