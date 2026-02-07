// components/trip/EditTripDatesModal.tsx
import DatePickerInput from "@/components/forms/DatePickerInput";
import TimePickerInput from "@/components/forms/TimePickerInput";
import BaseModal from "@/components/shared/BaseModal";
import { dateToISO, dateToTimeString } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import {
  TripDatesFormData,
  tripDatesSchema,
} from "@/lib/validations/trip-edit";
import { Trip, useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface EditTripDatesModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
}

export default function EditTripDatesModal({
  visible,
  onClose,
  trip,
}: EditTripDatesModalProps) {
  const colors = useThemeColors();
  const { updateTrip, canEditTripDates } = useTripStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<TripDatesFormData>({
    resolver: zodResolver(tripDatesSchema),
    mode: "onChange",
    defaultValues: {
      departure_date: trip.departure_date,
      departure_time: trip.departure_time,
      arrival_date: trip.arrival_date || null,
      arrival_time: trip.arrival_time || null,
    },
  });

  const onSubmit = async (data: TripDatesFormData) => {
    try {
      setChecking(true);

      // Check permission first
      const canEdit = await canEditTripDates(trip.id);
      if (!canEdit) {
        haptics.error();
        Alert.alert(
          "Cannot Edit Dates",
          "Dates cannot be edited after parcels have been picked up.",
        );
        return;
      }

      setChecking(false);
      setLoading(true);
      haptics.light();

      // Map form field names to database field names
      // Convert null to undefined for database
      await updateTrip(trip.id, {
        departure_date: data.departure_date,
        departure_time: data.departure_time,
        arrival_date: data.arrival_date || undefined,
        arrival_time: data.arrival_time || undefined,
      });

      haptics.success();
      Alert.alert("Success", "Trip dates updated successfully");
      onClose();
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to update trip dates");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  // Helper to convert ISO date string to Date object for picker
  const parseDate = (dateStr: string | null) => {
    return dateStr ? new Date(dateStr) : null;
  };

  // Helper to convert time string (HH:MM) to Date object for picker
  const parseTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title="Edit Trip Dates"
      subtitle="Update departure and arrival times"
      loading={loading || checking}
      scrollable
      icon={
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${colors.warning}15` },
          ]}
        >
          <Ionicons name="calendar" size={28} color={colors.warning} />
        </View>
      }
    >
      <View style={styles.form}>
        {/* Warning */}
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: `${colors.warning}10`,
              borderColor: `${colors.warning}30`,
            },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Dates cannot be changed after parcels have been picked up
          </Text>
        </View>

        {/* Departure Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Departure
          </Text>
          <View style={styles.dateTimeRow}>
            <Controller
              control={control}
              name="departure_date"
              render={({ field: { value, onChange } }) => (
                <DatePickerInput
                  label="Date"
                  value={parseDate(value)}
                  onChange={(date) => onChange(date ? dateToISO(date) : null)}
                  error={errors.departure_date?.message}
                  minimumDate={new Date()}
                />
              )}
            />

            <Controller
              control={control}
              name="departure_time"
              render={({ field: { value, onChange } }) => (
                <TimePickerInput
                  label="Time"
                  value={parseTime(value)}
                  onChange={(time) =>
                    onChange(time ? dateToTimeString(time) : null)
                  }
                  error={errors.departure_time?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Arrival Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Arrival (Optional)
          </Text>
          <View style={styles.dateTimeRow}>
            <Controller
              control={control}
              name="arrival_date"
              render={({ field: { value, onChange } }) => (
                <DatePickerInput
                  label="Date"
                  value={parseDate(value)}
                  onChange={(date) => onChange(date ? dateToISO(date) : null)}
                  error={errors.arrival_date?.message}
                  minimumDate={new Date()}
                />
              )}
            />

            <Controller
              control={control}
              name="arrival_time"
              render={({ field: { value, onChange } }) => (
                <TimePickerInput
                  label="Time"
                  value={parseTime(value)}
                  onChange={(time) =>
                    onChange(time ? dateToTimeString(time) : null)
                  }
                  error={errors.arrival_time?.message}
                />
              )}
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          style={[
            styles.button,
            styles.cancelButton,
            { backgroundColor: colors.background.secondary },
          ]}
          onPress={onClose}
          disabled={loading || checking}
        >
          <Text
            style={[styles.cancelButtonText, { color: colors.text.secondary }]}
          >
            Cancel
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.saveButton,
            { backgroundColor: colors.primary },
            (!isValid || !isDirty || loading || checking) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || !isDirty || loading || checking}
        >
          {loading || checking ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.text.inverse}
              />
              <Text
                style={[styles.saveButtonText, { color: colors.text.inverse }]}
              >
                Save Changes
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  warningBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  saveButton: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
