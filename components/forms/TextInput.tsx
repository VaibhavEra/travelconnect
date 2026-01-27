import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { useState } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
  helperText?: string;
}

export default function TextInput({
  label,
  error,
  helperText,
  style,
  ...props
}: TextInputProps) {
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.background.primary,
            borderColor: colors.border.default,
            color: colors.text.primary,
          },
          isFocused && {
            borderColor: colors.primary,
            backgroundColor: colors.background.primary,
          },
          error && {
            borderColor: colors.error,
          },
          style,
        ]}
        placeholderTextColor={colors.text.tertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />

      {helperText && !error && (
        <Text style={[styles.helperText, { color: colors.text.tertiary }]}>
          {helperText}
        </Text>
      )}

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
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    borderWidth: 1.5,
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
