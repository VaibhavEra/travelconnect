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
            placeholderTextColor="#999"
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputFocused: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  rightIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
  },
});
