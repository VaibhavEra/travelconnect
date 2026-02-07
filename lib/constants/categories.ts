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
