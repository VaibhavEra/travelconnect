import {
  BorderRadius,
  Spacing,
  Typography,
  useThemeColors,
} from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface FilterChipProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  active: boolean;
  onPress: () => void;
}

export default function FilterChip({
  label,
  icon,
  count,
  active,
  onPress,
}: FilterChipProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      style={[
        styles.filterChip,
        {
          backgroundColor: active
            ? colors.primary
            : colors.background.secondary,
          borderColor: active ? colors.primary : colors.border.default,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.text.inverse : colors.text.secondary}
      />
      <Text
        style={[
          styles.filterChipText,
          {
            color: active ? colors.text.inverse : colors.text.secondary,
            fontWeight: active
              ? Typography.weights.semibold
              : Typography.weights.medium,
          },
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View
          style={[
            styles.filterCount,
            {
              backgroundColor: active
                ? colors.text.inverse + "20"
                : colors.primary + "15",
            },
          ]}
        >
          <Text
            style={[
              styles.filterCountText,
              {
                color: active ? colors.text.inverse : colors.primary,
              },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
  },
  filterCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 22,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
});
