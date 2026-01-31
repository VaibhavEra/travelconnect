import { formatDateNoDay } from "@/lib/utils/dateTime";
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

interface DatePickerInputProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
  placeholder = "Pick date",
}: DatePickerInputProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const formatDateDisplay = (date: Date | null) => {
    if (!date || isNaN(date.getTime())) {
      return placeholder;
    }
    const isoString = date.toISOString().split("T")[0];
    return formatDateNoDay(isoString);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowPicker(false);

      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
        haptics.selection();
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleIOSDone = () => {
    if (tempDate) {
      onChange(tempDate);
      haptics.selection();
    }
    setShowPicker(false);
    setTempDate(null);
  };

  const handleIOSClear = () => {
    onChange(null);
    setTempDate(null);
    setShowPicker(false);
    haptics.light();
  };

  const handleIOSCancel = () => {
    setShowPicker(false);
    setTempDate(null);
    haptics.light();
  };

  const handleOpenPicker = () => {
    haptics.light();
    if (Platform.OS === "ios") {
      setTempDate(value || minimumDate || new Date());
    }
    setShowPicker(true);
  };

  const today = new Date();
  const displayDate =
    Platform.OS === "ios" && tempDate
      ? tempDate
      : value || minimumDate || today;

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
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text
            style={[
              styles.selectorText,
              {
                color: hasValue ? colors.text.primary : colors.text.placeholder,
              },
            ]}
            numberOfLines={1}
          >
            {formatDateDisplay(value)}
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
                  {label || "Select Date"}
                </Text>
                <Pressable onPress={handleIOSDone} hitSlop={10}>
                  <Text style={[styles.doneText, { color: colors.primary }]}>
                    Done
                  </Text>
                </Pressable>
              </View>

              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={displayDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  textColor={colors.text.primary}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={displayDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1.2,
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
