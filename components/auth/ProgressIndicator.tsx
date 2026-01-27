import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { StyleSheet, Text, View } from "react-native";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  labels,
}: ProgressIndicatorProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.barContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep - 1;

          return (
            <View
              key={index}
              style={[
                styles.barSegment,
                {
                  backgroundColor:
                    isCompleted || isCurrent
                      ? colors.primary
                      : colors.border.light,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Step Label */}
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        Step {currentStep} of {totalSteps}
        {labels && labels[currentStep - 1] && ` • ${labels[currentStep - 1]}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  barContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: "center",
  },
});
