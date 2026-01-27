import { haptics } from "@/lib/utils/haptics";
import { useSearchStore } from "@/stores/searchStore";
import { Trip } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const TRANSPORT_MODES: Array<{
  value: Trip["transport_mode"] | "all";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "all", label: "All", icon: "apps" },
  { value: "flight", label: "Flight", icon: "airplane" },
  { value: "train", label: "Train", icon: "train" },
  { value: "bus", label: "Bus", icon: "bus" },
  { value: "car", label: "Car", icon: "car" },
];

export default function TransportModeFilter() {
  const colors = useThemeColors();
  const { filters, setFilters } = useSearchStore();

  const handleModeSelect = (mode: Trip["transport_mode"] | "all") => {
    haptics.selection();
    setFilters({ transportMode: mode });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        Transport Mode
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TRANSPORT_MODES.map((mode) => {
          const isActive = filters.transportMode === mode.value;

          return (
            <Pressable
              key={mode.value}
              style={({ pressed }) => [
                styles.modeButton,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.background.secondary,
                  borderColor: isActive
                    ? colors.primary
                    : colors.border.default,
                  // Android press state
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => handleModeSelect(mode.value)}
              android_ripple={{
                color: colors.primary + "30",
                borderless: false,
              }}
            >
              <Ionicons
                name={mode.icon}
                size={20}
                color={isActive ? colors.text.inverse : colors.text.secondary}
              />
              <Text
                style={[
                  styles.modeText,
                  {
                    color: isActive
                      ? colors.text.inverse
                      : colors.text.secondary,
                    fontWeight: isActive
                      ? Typography.weights.semibold
                      : Typography.weights.medium,
                  },
                ]}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No marginBottom - parent controls spacing
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2, // 10px
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minHeight: 40,
    // Overflow hidden for ripple effect on Android
    overflow: "hidden",
  },
  modeText: {
    fontSize: Typography.sizes.sm,
  },
});
