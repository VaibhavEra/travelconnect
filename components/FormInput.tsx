// components/FormInput.tsx
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
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
    const [isFocused, setIsFocused] = useState(false);
    const showError = touched && error;

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={ref}
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              showError && styles.inputError,
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor={Colors.text.placeholder}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
        {showError && <Text style={styles.errorText}>{error}</Text>}
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
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    backgroundColor: Colors.background.primary,
    color: Colors.text.primary,
  },
  inputFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 2,
  },
  inputError: {
    borderColor: Colors.border.error,
  },
  rightIcon: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
