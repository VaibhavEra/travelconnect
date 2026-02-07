import {
  ParcelSizeCapacity,
  SIZE_CAPACITY_DESCRIPTIONS,
} from "@/lib/validations/trip";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ParcelSizeSelectorProps {
  label?: string;
  value: ParcelSizeCapacity;
  onChange: (value: ParcelSizeCapacity) => void;
  error?: string;
}

const SIZE_OPTIONS: Array<{
  value: ParcelSizeCapacity;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "small", icon: "document-text" },
  { value: "medium", icon: "cube" },
  { value: "large", icon: "briefcase" },
];

export default function ParcelSizeSelector({
  label,
  value,
  onChange,
  error,
}: ParcelSizeSelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.text.primary }]}>
          {label}
        </Text>
      )}

      <View style={styles.optionsContainer}>
        {SIZE_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: isSelected
                    ? colors.primary
                    : colors.border.default,
                },
                isSelected && styles.optionSelected,
              ]}
              onPress={() => onChange(option.value)}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected
                      ? colors.primary + "15"
                      : colors.background.secondary,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.text.secondary}
                />
              </View>

              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected
                      ? colors.text.primary
                      : colors.text.secondary,
                  },
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
              </Text>

              <Text
                style={[
                  styles.optionDescription,
                  {
                    color: isSelected
                      ? colors.text.secondary
                      : colors.text.tertiary,
                  },
                ]}
              >
                {SIZE_CAPACITY_DESCRIPTIONS[option.value]}
              </Text>

              {isSelected && (
                <View
                  style={[
                    styles.checkmarkContainer,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={colors.text.inverse}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
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
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  optionsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
  },
  optionSelected: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  optionLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  optionLabelSelected: {
    fontWeight: Typography.weights.bold,
  },
  optionDescription: {
    fontSize: Typography.sizes.xs,
    textAlign: "center",
  },
  checkmarkContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
  },
});
