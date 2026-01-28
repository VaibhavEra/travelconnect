import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Overlays, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface TimePickerInputProps {
  label: string;
  value: Date | null;
  onChange: (time: Date) => void;
  error?: string;
  placeholder?: string;
}

export default function TimePickerInput({
  label,
  value,
  onChange,
  error,
  placeholder = "Select time",
}: TimePickerInputProps) {
  const colors = useThemeColors();
  const [show, setShow] = useState(false);

  // Use current time for picker display when value is null
  const pickerValue = value || new Date();

  const handleChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (selectedTime) {
      haptics.selection();
      onChange(selectedTime);
    }
  };

  const handleConfirm = () => {
    haptics.light();
    setShow(false);
  };

  // Format time for display
  const formatTime = (date: Date | null) => {
    if (!date) {
      return placeholder;
    }

    // Validate date before formatting
    if (isNaN(date.getTime())) {
      return placeholder;
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const hasValue = value !== null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <Pressable
        style={[
          styles.input,
          {
            backgroundColor: colors.background.secondary,
            borderColor: error ? colors.error : colors.border.default,
          },
        ]}
        onPress={() => {
          haptics.light();
          setShow(true);
        }}
      >
        <Text
          style={[
            styles.inputText,
            {
              color: hasValue ? colors.text.primary : colors.text.tertiary,
            },
          ]}
        >
          {formatTime(value)}
        </Text>
        <Ionicons name="time" size={20} color={colors.text.secondary} />
      </Pressable>

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      {Platform.OS === "ios" ? (
        <Modal
          visible={show}
          transparent
          animationType="fade"
          onRequestClose={() => setShow(false)}
        >
          <View
            style={[styles.modalOverlay, { backgroundColor: Overlays.light }]}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text
                  style={[styles.modalTitle, { color: colors.text.primary }]}
                >
                  {label}
                </Text>
              </View>

              <DateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"
                onChange={handleChange}
                textColor={colors.text.primary}
              />

              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleConfirm}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    { color: colors.text.inverse },
                  ]}
                >
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={pickerValue}
            mode="time"
            display="default"
            onChange={handleChange}
          />
        )
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
  },
  inputText: {
    fontSize: Typography.sizes.md,
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  confirmButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  confirmButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
