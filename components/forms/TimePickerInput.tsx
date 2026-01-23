import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface TimePickerInputProps {
  label: string;
  value: Date;
  onChange: (time: Date) => void;
  error?: string;
}

export default function TimePickerInput({
  label,
  value,
  onChange,
  error,
}: TimePickerInputProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (selectedTime) {
      onChange(selectedTime);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.input, error && styles.inputError]}
        onPress={() => setShow(true)}
      >
        <Text style={styles.inputText}>{formatTime(value)}</Text>
        <Ionicons name="time-outline" size={20} color={Colors.text.secondary} />
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {show && (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          themeVariant="light"
        />
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
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  error: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
