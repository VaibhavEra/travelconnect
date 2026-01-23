import { TRANSPORT_MODES, TransportMode } from "@/lib/validations/trip";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TransportModeSelectorProps {
  label: string;
  value: TransportMode | null;
  onChange: (mode: TransportMode) => void;
  error?: string;
}

const TRANSPORT_ICONS: Record<TransportMode, keyof typeof Ionicons.glyphMap> = {
  train: "train-outline",
  bus: "bus-outline",
  flight: "airplane-outline",
  car: "car-outline",
};

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  train: "Train",
  bus: "Bus",
  flight: "Flight",
  car: "Car",
};

export default function TransportModeSelector({
  label,
  value,
  onChange,
  error,
}: TransportModeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.modesContainer}>
        {TRANSPORT_MODES.map((mode) => {
          const isSelected = value === mode;
          return (
            <Pressable
              key={mode}
              style={[
                styles.modeButton,
                isSelected && styles.modeButtonSelected,
              ]}
              onPress={() => onChange(mode)}
            >
              <Ionicons
                name={TRANSPORT_ICONS[mode]}
                size={24}
                color={isSelected ? Colors.primary : Colors.text.secondary}
              />
              <Text
                style={[styles.modeText, isSelected && styles.modeTextSelected]}
              >
                {TRANSPORT_LABELS[mode]}
              </Text>
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
  modesContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  modeButtonSelected: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  modeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  modeTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  error: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
