import { Ionicons } from "@expo/vector-icons";

// Parcel size capacity icons (for trip capacity display)
export const SIZE_CAPACITY_ICONS: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  small: "document-text",
  medium: "cube",
  large: "briefcase",
};

export const getSizeCapacityIcon = (
  size: string,
): keyof typeof Ionicons.glyphMap => {
  return SIZE_CAPACITY_ICONS[size] || "cube";
};

export const getSizeCapacityLabel = (size: string): string => {
  const labels: Record<string, string> = {
    small: "Small (< 1 kg)",
    medium: "Medium (1-3 kg)",
    large: "Large (up to 5 kg)",
  };
  return labels[size] || size;
};
