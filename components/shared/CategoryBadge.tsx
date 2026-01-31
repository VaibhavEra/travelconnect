import { getCategoryIcon, getCategoryLabel } from "@/lib/constants/categories";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CategoryBadgeProps {
  category: string;
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  showLabel = true,
  size = "medium",
}) => {
  const colors = useThemeColors();

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24,
  };

  const textSizes = {
    small: 11,
    medium: 13,
    large: 15,
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name={getCategoryIcon(category)}
        size={iconSizes[size]}
        color={colors.primary}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            { fontSize: textSizes[size], color: colors.text.primary },
          ]}
        >
          {getCategoryLabel(category)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontWeight: "500",
  },
});
