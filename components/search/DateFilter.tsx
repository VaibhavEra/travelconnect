import { haptics } from "@/lib/utils/haptics";
import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
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

export default function DateFilter() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useSearchStore();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Any date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowPicker(false);

      if (event.type === "set" && selectedDate) {
        const dateString = selectedDate.toISOString().split("T")[0];
        setFilters({ departureDate: dateString });
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
      const dateString = tempDate.toISOString().split("T")[0];
      setFilters({ departureDate: dateString });
      haptics.selection();
    }
    setShowPicker(false);
    setTempDate(null);
  };

  const handleIOSClear = () => {
    setFilters({ departureDate: null });
    setTempDate(null);
    setShowPicker(false);
    haptics.light();
  };

  const handleIOSCancel = () => {
    setShowPicker(false);
    setTempDate(null);
    haptics.light();
  };

  const handleClearDate = () => {
    setFilters({ departureDate: null });
    haptics.light();
  };

  const handleOpenPicker = () => {
    haptics.light();
    if (Platform.OS === "ios") {
      setTempDate(
        filters.departureDate ? new Date(filters.departureDate) : new Date(),
      );
    }
    setShowPicker(true);
  };

  const today = new Date();
  const displayDate =
    Platform.OS === "ios" && tempDate
      ? tempDate
      : filters.departureDate
        ? new Date(filters.departureDate)
        : today;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        Departure Date
      </Text>

      <Pressable
        style={[
          styles.selector,
          {
            backgroundColor: colors.background.secondary,
            borderColor: colors.border.default,
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
                color: filters.departureDate
                  ? colors.text.primary
                  : colors.text.placeholder,
              },
            ]}
          >
            {formatDate(filters.departureDate)}
          </Text>
        </View>
        {filters.departureDate ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleClearDate();
            }}
            hitSlop={10}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </Pressable>

      {showPicker && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={handleIOSCancel}
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.backdrop} onPress={handleIOSCancel} />

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
                  Select Date
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
                  minimumDate={today}
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
          minimumDate={today}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderWidth: 1,
    minHeight: 50,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  selectorText: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  iconPlaceholder: {
    width: 20, // Same as close icon to prevent layout shift
  },
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    width: 60, // Fixed width for symmetry
  },
  doneText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    width: 60, // Fixed width for symmetry
    textAlign: "right",
  },
  pickerContainer: {
    paddingVertical: Spacing.md,
  },
});
