// components/auth/OtpInput.tsx

import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OtpInput({
  length,
  value,
  onChange,
  disabled,
  error,
}: OtpInputProps) {
  const colors = useThemeColors();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newOtp = value.split("");

    // Handle paste (multiple digits)
    if (text.length > 1) {
      const pastedDigits = text.slice(0, length - index).split("");
      pastedDigits.forEach((digit, i) => {
        if (index + i < length) {
          newOtp[index + i] = digit;
        }
      });
      onChange(newOtp.join(""));

      // Focus last filled box or last box
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit entry
    newOtp[index] = text;
    onChange(newOtp.join(""));

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // FIXED: Better backspace handling
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      const newOtp = value.split("");

      if (newOtp[index]) {
        // Current box has value: clear it
        newOtp[index] = "";
        onChange(newOtp.join(""));
        // Stay on current box
      } else if (index > 0) {
        // Current box empty: move back and clear previous
        newOtp[index - 1] = "";
        onChange(newOtp.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => {
        const hasValue = !!value[index];
        const isFocused = focusedIndex === index;

        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.input,
              {
                borderColor: colors.border.default,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              },
              isFocused && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
              hasValue &&
                !error && {
                  borderColor: colors.success,
                },
              error && {
                borderColor: colors.error,
                borderWidth: 2,
              },
            ]}
            value={value[index] || ""}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!disabled}
            textContentType="oneTimeCode" // iOS autofill support
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    aspectRatio: 1, // Make it square
    minHeight: 56,
    maxHeight: 64,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    textAlign: "center",
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
});
