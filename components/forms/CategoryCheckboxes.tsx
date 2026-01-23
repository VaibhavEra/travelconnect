import { PACKAGE_CATEGORIES, PackageCategory } from "@/lib/validations/trip";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface CategoryCheckboxesProps {
  label: string;
  value: PackageCategory[];
  onChange: (categories: PackageCategory[]) => void;
  error?: string;
}

const CATEGORY_LABELS: Record<PackageCategory, string> = {
  documents: "Documents & Papers",
  clothing: "Clothing & Apparel",
  medicines: "Medicines",
  books: "Books",
  small_items: "Small Personal Items",
};

const CATEGORY_ICONS: Record<PackageCategory, keyof typeof Ionicons.glyphMap> =
  {
    documents: "document-text-outline",
    clothing: "shirt-outline",
    medicines: "medical-outline",
    books: "book-outline",
    small_items: "cube-outline",
  };

export default function CategoryCheckboxes({
  label,
  value,
  onChange,
  error,
}: CategoryCheckboxesProps) {
  const toggleCategory = (category: PackageCategory) => {
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
    } else {
      onChange([...value, category]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.categoriesContainer}>
        {PACKAGE_CATEGORIES.map((category) => {
          const isSelected = value.includes(category);
          return (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                isSelected && styles.categoryButtonSelected,
              ]}
              onPress={() => toggleCategory(category)}
            >
              <View style={styles.categoryContent}>
                <Ionicons
                  name={CATEGORY_ICONS[category]}
                  size={20}
                  color={isSelected ? Colors.primary : Colors.text.secondary}
                />
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {CATEGORY_LABELS[category]}
                </Text>
              </View>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={Colors.primary}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  categoriesContainer: {
    gap: Spacing.xs,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },
  categoryTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  error: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
