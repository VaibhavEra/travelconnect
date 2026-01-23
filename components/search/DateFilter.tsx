import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
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

export default function DateFilter() {
  const { filters, setFilters } = useSearchStore();
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Any date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0];
      setFilters({ departureDate: dateString });
    }
  };

  const handleClearDate = () => {
    setFilters({ departureDate: null });
    setShowPicker(false);
  };

  const today = new Date();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Departure Date</Text>

      <Pressable style={styles.selector} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        <Text
          style={[
            styles.selectorText,
            !filters.departureDate && styles.placeholder,
          ]}
        >
          {formatDate(filters.departureDate)}
        </Text>
        {filters.departureDate && (
          <Pressable onPress={handleClearDate} style={styles.clearButton}>
            <Ionicons
              name="close-circle"
              size={20}
              color={Colors.text.tertiary}
            />
          </Pressable>
        )}
      </Pressable>

      {showPicker && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={handleClearDate}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Select Date</Text>
                <Pressable onPress={() => setShowPicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={
                  filters.departureDate
                    ? new Date(filters.departureDate)
                    : today
                }
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={today}
              />
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={
            filters.departureDate ? new Date(filters.departureDate) : today
          }
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
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  selectorText: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  placeholder: {
    color: Colors.text.placeholder,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  clearText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
  },
  doneText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
});
