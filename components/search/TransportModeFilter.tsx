import { useSearchStore } from "@/stores/searchStore";
import { Trip } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const TRANSPORT_MODES: Array<{
  value: Trip["transport_mode"] | "all";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "all", label: "All", icon: "apps" },
  { value: "train", label: "Train", icon: "train" },
  { value: "bus", label: "Bus", icon: "bus" },
  { value: "flight", label: "Flight", icon: "airplane" },
  { value: "car", label: "Car", icon: "car" },
];

export default function TransportModeFilter() {
  const { filters, setFilters } = useSearchStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Transport Mode</Text>

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
              style={[styles.modeButton, isActive && styles.modeButtonActive]}
              onPress={() => setFilters({ transportMode: mode.value })}
            >
              <Ionicons
                name={mode.icon}
                size={20}
                color={isActive ? Colors.primary : Colors.text.secondary}
              />
              <Text
                style={[styles.modeText, isActive && styles.modeTextActive]}
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
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.xs,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  modeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  modeTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
});
