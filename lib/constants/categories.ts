import { Ionicons } from "@expo/vector-icons";

// Match database constraint: documents, clothing, medicines, books, small_items
export type Category =
  | "documents"
  | "clothing"
  | "medicines"
  | "books"
  | "small_items";

export const CATEGORY_CONFIG: Record<
  Category,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  documents: {
    label: "Documents",
    icon: "document-text-outline",
  },
  clothing: {
    label: "Clothing",
    icon: "shirt-outline",
  },
  medicines: {
    label: "Medicines",
    icon: "medical-outline",
  },
  books: {
    label: "Books",
    icon: "book-outline",
  },
  small_items: {
    label: "Small Items",
    icon: "cube-outline",
  },
};

// Helper functions
export const getCategoryIcon = (
  category: string,
): keyof typeof Ionicons.glyphMap => {
  return CATEGORY_CONFIG[category as Category]?.icon || "cube-outline";
};

export const getCategoryLabel = (category: string): string => {
  return CATEGORY_CONFIG[category as Category]?.label || category;
};

export const SIZE_CONFIG = {
  small: {
    label: "Small",
    icon: "bag-handle-outline" as keyof typeof Ionicons.glyphMap,
    description: "Fits in a bag",
  },
  medium: {
    label: "Medium",
    icon: "briefcase-outline" as keyof typeof Ionicons.glyphMap,
    description: "Briefcase size",
  },
  large: {
    label: "Large",
    icon: "cube-outline" as keyof typeof Ionicons.glyphMap,
    description: "Suitcase size",
  },
};

export const getSizeIcon = (size: string): keyof typeof Ionicons.glyphMap => {
  return SIZE_CONFIG[size as keyof typeof SIZE_CONFIG]?.icon || "cube-outline";
};

export const getSizeLabel = (size: string): string => {
  return SIZE_CONFIG[size as keyof typeof SIZE_CONFIG]?.label || size;
};
