import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface DatePickerInputProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: DatePickerInputProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.input, error && styles.inputError]}
        onPress={() => setShow(true)}
      >
        <Text style={styles.inputText}>{formatDate(value)}</Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={Colors.text.secondary}
        />
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
