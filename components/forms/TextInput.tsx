import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
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
  ...props
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <RNTextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholderTextColor={Colors.text.placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

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
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  inputFocused: {
    borderColor: Colors.border.focus,
  },
  inputError: {
    borderColor: Colors.error,
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
