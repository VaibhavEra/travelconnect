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

  // NEW: Clear handler
  const handleClear = () => {
    haptics.light();
    onChange(null as any);
  };

  // NEW: Done handler
  const handleDone = () => {
    haptics.light();
    setShow(false);
  };

  const formatTime = (date: Date | null) => {
    if (!date) {
      return placeholder;
    }

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
      {/* FIXED: Bigger label */}
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
        {/* FIXED: Better text size */}
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
        {/* FIXED: Icon not displaced */}
        <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
      </Pressable>

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      {Platform.OS === "ios" ? (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: Overlays.light }]}
            onPress={() => setShow(false)}
          >
            <Pressable
              style={[
                styles.modalContent,
                { backgroundColor: colors.background.primary },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border.light },
                ]}
              >
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

              {/* NEW: Action buttons with Clear and Done */}
              <View style={styles.modalActions}>
                {hasValue && (
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.clearButton,
                      {
                        backgroundColor: colors.background.secondary,
                        borderColor: colors.border.default,
                      },
                    ]}
                    onPress={handleClear}
                  >
                    <Text
                      style={[
                        styles.clearButtonText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Clear
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.actionButton,
                    styles.doneButton,
                    { backgroundColor: colors.primary },
                    !hasValue && styles.fullWidthButton,
                  ]}
                  onPress={handleDone}
                >
                  <Text
                    style={[
                      styles.doneButtonText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
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
    fontSize: Typography.sizes.md, // FIXED: Bigger label
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg, // FIXED: Better radius
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2, // FIXED: Better padding
    borderWidth: 1.5,
  },
  inputText: {
    fontSize: Typography.sizes.md, // FIXED: Proper size
    flex: 1,
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
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  clearButton: {
    borderWidth: 1.5,
  },
  clearButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  doneButton: {},
  doneButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  fullWidthButton: {
    flex: 1,
  },
});
