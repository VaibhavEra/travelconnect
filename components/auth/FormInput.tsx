// components/auth/FormInput.tsx

import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  touched?: boolean;
  rightIcon?: React.ReactNode;
}

const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, touched, rightIcon, ...props }, ref) => {
    const colors = useThemeColors();
    const [isFocused, setIsFocused] = useState(false);
    const showError = touched && error;

    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.text.primary }]}>
          {label}
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                borderColor: colors.border.default,
                backgroundColor: colors.background.primary,
                color: colors.text.primary,
              },
              isFocused && {
                borderColor: colors.border.focus,
                borderWidth: 2,
              },
              showError && {
                borderColor: colors.border.error,
              },
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor={colors.text.placeholder}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
        {showError && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);

FormInput.displayName = "FormInput";

export default FormInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg, // Changed from md to lg for more modern look
    padding: Spacing.md,
    paddingRight: Spacing.xl + Spacing.lg, // Extra space for right icon
    fontSize: Typography.sizes.md,
    minHeight: 52, // Consistent touch target
  },
  rightIcon: {
    position: "absolute",
    right: Spacing.md,
    top: "50%",
    transform: [{ translateY: -12 }], // Center vertically
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
