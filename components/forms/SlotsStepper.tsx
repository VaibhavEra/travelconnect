import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SlotsStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  error?: string;
}

export default function SlotsStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  error,
}: SlotsStepperProps) {
  const colors = useThemeColors();

  const handleDecrement = () => {
    if (value > min) {
      haptics.light();
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      haptics.light();
      onChange(value + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* FIXED: Bigger label */}
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <View
        style={[
          styles.stepperContainer,
          { backgroundColor: colors.background.secondary },
        ]}
      >
        {/* FIXED: Aligned +/- buttons */}
        <Pressable
          style={[
            styles.button,
            {
              backgroundColor:
                value <= min
                  ? colors.background.tertiary
                  : colors.primary + "15",
            },
          ]}
          onPress={handleDecrement}
          disabled={value <= min}
        >
          <Ionicons
            name="remove"
            size={22}
            color={value <= min ? colors.text.tertiary : colors.primary}
          />
        </Pressable>

        <View style={styles.valueContainer}>
          {/* Visual Slots */}
          <View style={styles.slotsVisual}>
            {Array.from({ length: max }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.slot,
                  {
                    backgroundColor:
                      index < value
                        ? colors.primary + "30"
                        : colors.background.tertiary,
                    borderColor:
                      index < value ? colors.primary : colors.border.default,
                  },
                ]}
              >
                {index < value && (
                  <Ionicons name="cube" size={14} color={colors.primary} />
                )}
              </View>
            ))}
          </View>

          <Text style={[styles.value, { color: colors.text.primary }]}>
            {value}
          </Text>
          <Text style={[styles.valueLabel, { color: colors.text.secondary }]}>
            slot{value !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* FIXED: Aligned +/- buttons */}
        <Pressable
          style={[
            styles.button,
            {
              backgroundColor:
                value >= max
                  ? colors.background.tertiary
                  : colors.primary + "15",
            },
          ]}
          onPress={handleIncrement}
          disabled={value >= max}
        >
          <Ionicons
            name="add"
            size={22}
            color={value >= max ? colors.text.tertiary : colors.primary}
          />
        </Pressable>
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
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  button: {
    width: 44, // FIXED: Consistent size
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  valueContainer: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  slotsVisual: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  slot: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
  },
  valueLabel: {
    fontSize: Typography.sizes.xs,
    textTransform: "uppercase",
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
