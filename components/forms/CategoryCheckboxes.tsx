import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { haptics } from "@/lib/utils/haptics";
import { PACKAGE_CATEGORIES, PackageCategory } from "@/lib/validations/trip";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface CategoryCheckboxesProps {
  label: string;
  value: PackageCategory[];
  onChange: (categories: PackageCategory[]) => void;
  error?: string;
}

export default function CategoryCheckboxes({
  label,
  value,
  onChange,
  error,
}: CategoryCheckboxesProps) {
  const colors = useThemeColors();

  const toggleCategory = (category: PackageCategory) => {
    haptics.selection();
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
    } else {
      onChange([...value, category]);
    }
  };

  return (
    <View style={styles.container}>
      {/* FIXED: Bigger label */}
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      {/* FIXED: Better spacing, removed whitespace */}
      <View style={styles.categoriesContainer}>
        {PACKAGE_CATEGORIES.map((category) => {
          const isSelected = value.includes(category);
          const config =
            CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];

          return (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: isSelected
                    ? colors.primary + "10"
                    : colors.background.secondary,
                  borderColor: isSelected
                    ? colors.primary
                    : colors.border.default,
                },
              ]}
              onPress={() => toggleCategory(category)}
            >
              <View style={styles.categoryContent}>
                <Ionicons
                  name={config?.icon || "cube"}
                  size={20}
                  color={isSelected ? colors.primary : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected
                        ? colors.primary
                        : colors.text.secondary,
                      fontWeight: isSelected
                        ? Typography.weights.semibold
                        : Typography.weights.medium,
                    },
                  ]}
                >
                  {config?.label || category}
                </Text>
              </View>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.md, // FIXED: Bigger label
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  categoriesContainer: {
    gap: Spacing.sm, // FIXED: Better spacing
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg, // FIXED: Better radius
    paddingVertical: Spacing.md, // FIXED: Better padding
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md, // FIXED: Better spacing
  },
  categoryText: {
    fontSize: Typography.sizes.md, // FIXED: Better size
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
