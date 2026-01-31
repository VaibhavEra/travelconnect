import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Overlays, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TimePickerInputProps {
  label?: string;
  value: Date | null;
  onChange: (time: Date | null) => void;
  error?: string;
  placeholder?: string;
}

export default function TimePickerInput({
  label,
  value,
  onChange,
  error,
  placeholder = "Pick time",
}: TimePickerInputProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  const formatTime = (date: Date | null) => {
    if (!date || isNaN(date.getTime())) {
      return placeholder;
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowPicker(false);

      if (event.type === "set" && selectedTime) {
        onChange(selectedTime);
        haptics.selection();
      }
    } else {
      if (selectedTime) {
        setTempTime(selectedTime);
      }
    }
  };

  const handleIOSDone = () => {
    if (tempTime) {
      onChange(tempTime);
      haptics.selection();
    }
    setShowPicker(false);
    setTempTime(null);
  };

  const handleIOSClear = () => {
    onChange(null);
    setTempTime(null);
    setShowPicker(false);
    haptics.light();
  };

  const handleIOSCancel = () => {
    setShowPicker(false);
    setTempTime(null);
    haptics.light();
  };

  const handleOpenPicker = () => {
    haptics.light();
    if (Platform.OS === "ios") {
      setTempTime(value || new Date());
    }
    setShowPicker(true);
  };

  const displayTime =
    Platform.OS === "ios" && tempTime ? tempTime : value || new Date();

  const hasValue = value !== null;

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.selector,
          {
            backgroundColor: colors.background.secondary,
            borderColor: error ? colors.error : colors.border.default,
          },
        ]}
        onPress={handleOpenPicker}
      >
        <View style={styles.selectorContent}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text
            style={[
              styles.selectorText,
              {
                color: hasValue ? colors.text.primary : colors.text.placeholder,
              },
            ]}
            numberOfLines={1}
          >
            {formatTime(value)}
          </Text>
        </View>
      </Pressable>

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      {showPicker && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={handleIOSCancel}
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={[styles.backdrop, { backgroundColor: Overlays.light }]}
              onPress={handleIOSCancel}
            />

            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.background.primary,
                  paddingBottom: insets.bottom || Spacing.lg,
                },
              ]}
            >
              <View style={styles.handleBar}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: colors.border.default },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border.light },
                ]}
              >
                <Pressable onPress={handleIOSClear} hitSlop={10}>
                  <Text style={[styles.clearText, { color: colors.error }]}>
                    Clear
                  </Text>
                </Pressable>
                <Text
                  style={[styles.modalTitle, { color: colors.text.primary }]}
                >
                  {label || "Select Time"}
                </Text>
                <Pressable onPress={handleIOSDone} hitSlop={10}>
                  <Text style={[styles.doneText, { color: colors.primary }]}>
                    Done
                  </Text>
                </Pressable>
              </View>

              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={displayTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor={colors.text.primary}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={displayTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0.9,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderWidth: 1,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs, // Reduced gap for more text space
    flex: 1,
    minWidth: 0,
  },
  selectorText: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xs,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  clearText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    width: 60,
  },
  doneText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    width: 60,
    textAlign: "right",
  },
  pickerContainer: {
    paddingVertical: Spacing.md,
  },
});
