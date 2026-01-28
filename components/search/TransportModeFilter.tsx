import {
  TRANSPORT_CONFIG_WITH_ALL,
  TransportModeWithAll,
} from "@/lib/constants";
import { haptics } from "@/lib/utils/haptics";
import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function TransportModeFilter() {
  const colors = useThemeColors();
  const { filters, setFilters } = useSearchStore();

  const handleModeSelect = (mode: TransportModeWithAll) => {
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
        {Object.entries(TRANSPORT_CONFIG_WITH_ALL).map(([mode, config]) => {
          const isActive = filters.transportMode === mode;

          return (
            <Pressable
              key={mode}
              style={({ pressed }) => [
                styles.modeButton,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.background.secondary,
                  borderColor: isActive
                    ? colors.primary
                    : colors.border.default,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => handleModeSelect(mode as TransportModeWithAll)}
              android_ripple={{
                color: withOpacity(colors.primary, "medium"),
                borderless: false,
              }}
            >
              <Ionicons
                name={config.icon}
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
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
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
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minHeight: 40,
    overflow: "hidden",
  },
  modeText: {
    fontSize: Typography.sizes.sm,
  },
});
