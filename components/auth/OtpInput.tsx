// components/auth/OtpInput.tsx
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  error?: boolean; // NEW: Visual error state
}

export default function OtpInput({
  length,
  value,
  onChange,
  disabled,
  error, // NEW
}: OtpInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newOtp = value.split("");
    newOtp[index] = text;
    const otpString = newOtp.join("");

    onChange(otpString);

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
        // Current box has value: clear it (onChange will handle)
        newOtp[index] = "";
        onChange(newOtp.join(""));
        // Keep focus on current box
      } else if (index > 0) {
        // Current box empty: clear previous and move back
        newOtp[index - 1] = "";
        onChange(newOtp.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.input,
            focusedIndex === index && styles.inputFocused,
            value[index] && styles.inputFilled,
            error && styles.inputError, // NEW: Error state
          ]}
          value={value[index] || ""}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          editable={!disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm + 4,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    textAlign: "center",
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  inputFilled: {
    borderColor: Colors.success,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
});
