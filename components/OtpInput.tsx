import { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
}

export default function OtpInput({
  length,
  value,
  onChange,
  disabled,
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

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
    gap: 12,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
  },
  inputFocused: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  inputFilled: {
    borderColor: "#34C759",
  },
});
