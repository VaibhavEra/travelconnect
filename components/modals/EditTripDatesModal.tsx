// components/trip/EditTripDatesModal.tsx
import DatePickerInput from "@/components/forms/DatePickerInput";
import TimePickerInput from "@/components/forms/TimePickerInput";
import BaseModal from "@/components/shared/BaseModal";
import { showErrorAlert } from "@/lib/utils/alerts";
import { dateToISO, dateToTimeString } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import {
  TripEditDatesFormData,
  tripEditDatesSchema,
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
  const { updateTripDates, canEditTripDates } = useTripStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
  } = useForm<TripEditDatesFormData>({
    resolver: zodResolver(tripEditDatesSchema),
    mode: "onChange",
    defaultValues: {
      departure_date: trip.departure_date,
      departure_time: trip.departure_time,
      arrival_date: trip.arrival_date,
      arrival_time: trip.arrival_time,
    },
  });

  const departureDate = watch("departure_date");

  const onSubmit = async (data: TripEditDatesFormData) => {
    try {
      setChecking(true);

      // Check permission first
      const canEdit = await canEditTripDates(trip.id);
      if (!canEdit) {
        haptics.error();
        Alert.alert(
          "Cannot Edit Dates",
          "Dates cannot be edited after parcels have been picked up or in completed/cancelled state.",
        );
        return;
      }

      setChecking(false);
      setLoading(true);
      haptics.light();

      // Use updateTripDates (dedicated method for date-only updates)
      await updateTripDates(
        trip.id,
        data.departure_date,
        data.departure_time,
        data.arrival_date,
        data.arrival_time,
      );

      haptics.success();
      showSuccessToast(
        "Trip dates updated. Affected senders will be notified.",
      );
      onClose();
    } catch (error) {
      logger.error("Update trip dates failed", error, {
        module: "EditTripDatesModal",
      });
      haptics.error();
      showErrorAlert(error);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  // Helper to convert ISO date string to Date object for picker
  const parseDate = (dateStr: string) => {
    return dateStr ? new Date(dateStr) : new Date();
  };

  // Helper to convert time string (HH:MM) to Date object for picker
  const parseTime = (timeStr: string) => {
    if (!timeStr) return new Date();
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
            Dates can be edited after acceptance but not after pickup. Affected
            senders will be notified of changes.
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
                  onChange={(date) => onChange(date ? dateToISO(date) : "")}
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
                    onChange(time ? dateToTimeString(time) : "")
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
            Arrival
          </Text>
          <View style={styles.dateTimeRow}>
            <Controller
              control={control}
              name="arrival_date"
              render={({ field: { value, onChange } }) => (
                <DatePickerInput
                  label="Date"
                  value={parseDate(value)}
                  onChange={(date) => onChange(date ? dateToISO(date) : "")}
                  error={errors.arrival_date?.message}
                  minimumDate={parseDate(departureDate) || new Date()}
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
                    onChange(time ? dateToTimeString(time) : "")
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
