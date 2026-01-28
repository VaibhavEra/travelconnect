import { TRANSPORT_CONFIG, TransportMode } from "@/lib/constants";
import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TransportModeSelectorProps {
  label: string;
  value: TransportMode | null;
  onChange: (mode: TransportMode) => void;
  error?: string;
}

export default function TransportModeSelector({
  label,
  value,
  onChange,
  error,
}: TransportModeSelectorProps) {
  const colors = useThemeColors();

  const handleSelect = (mode: TransportMode) => {
    haptics.selection();
    onChange(mode);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <View style={styles.modesContainer}>
        {Object.entries(TRANSPORT_CONFIG).map(([mode, config]) => {
          const isSelected = value === mode;
          return (
            <Pressable
              key={mode}
              style={[
                styles.modeButton,
                {
                  backgroundColor: isSelected
                    ? withOpacity(colors.primary, "light")
                    : colors.background.secondary,
                  borderColor: isSelected
                    ? colors.primary
                    : colors.border.default,
                },
              ]}
              onPress={() => handleSelect(mode as TransportMode)}
            >
              <Ionicons
                name={config.icon}
                size={24}
                color={isSelected ? colors.primary : colors.text.secondary}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: colors.text.secondary },
                  isSelected && {
                    color: colors.primary,
                    fontWeight: Typography.weights.semibold,
                  },
                ]}
              >
                {config.label}
              </Text>
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
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
  },
  modesContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1.5,
  },
  modeText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
