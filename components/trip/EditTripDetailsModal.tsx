// components/trip/EditTripDetailsModal.tsx
import CategoryCheckboxes from "@/components/forms/CategoryCheckboxes";
import ParcelSizeSelector from "@/components/forms/ParcelSizeSelector";
import TextInput from "@/components/forms/TextInput";
import BaseModal from "@/components/shared/BaseModal";
import { showErrorAlert } from "@/lib/utils/alerts";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import {
  TripEditDetailsFormData,
  tripEditDetailsSchema,
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

interface EditTripDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
}

export default function EditTripDetailsModal({
  visible,
  onClose,
  trip,
}: EditTripDetailsModalProps) {
  const colors = useThemeColors();
  const { updateTripGeneralFields, canEditTrip } = useTripStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<TripEditDetailsFormData>({
    resolver: zodResolver(tripEditDetailsSchema),
    mode: "onChange",
    defaultValues: {
      parcel_size_capacity: trip.parcel_size_capacity,
      allowed_categories: trip.allowed_categories as any,
      pnr_number: trip.pnr_number,
      ticket_file_url: trip.ticket_file_url,
    },
  });

  const onSubmit = async (data: TripEditDetailsFormData) => {
    try {
      setChecking(true);

      // Check permission first
      const canEdit = await canEditTrip(trip.id);
      if (!canEdit) {
        haptics.error();
        Alert.alert(
          "Cannot Edit Details",
          "Trip details cannot be edited after parcels have been picked up or in completed/cancelled state.",
        );
        return;
      }

      setChecking(false);
      setLoading(true);
      haptics.light();

      // Use updateTripGeneralFields (enforces whitelist)
      await updateTripGeneralFields(trip.id, {
        parcel_size_capacity: data.parcel_size_capacity,
        allowed_categories: data.allowed_categories,
        pnr_number: data.pnr_number,
        ticket_file_url: data.ticket_file_url,
      });

      haptics.success();
      showSuccessToast("Trip details updated successfully");
      onClose();
    } catch (error) {
      logger.error("Update trip details failed", error, {
        module: "EditTripDetailsModal",
      });
      haptics.error();
      showErrorAlert(error);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title="Edit Trip Details"
      subtitle="Update parcel size, categories, and ticket info"
      loading={loading || checking}
      scrollable
      icon={
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <Ionicons name="create-outline" size={28} color={colors.primary} />
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
            Details cannot be changed after parcels have been picked up. Route
            and transport mode are never editable.
          </Text>
        </View>

        {/* Parcel Size Capacity */}
        <Controller
          control={control}
          name="parcel_size_capacity"
          render={({ field: { value, onChange } }) => (
            <ParcelSizeSelector
              label="Parcel Size Capacity"
              value={value}
              onChange={onChange}
              error={errors.parcel_size_capacity?.message}
            />
          )}
        />

        {/* Allowed Categories */}
        <Controller
          control={control}
          name="allowed_categories"
          render={({ field: { value, onChange } }) => (
            <CategoryCheckboxes
              label="Allowed Categories"
              value={value}
              onChange={onChange}
              error={errors.allowed_categories?.message}
            />
          )}
        />

        {/* PNR Number */}
        <Controller
          control={control}
          name="pnr_number"
          render={({ field: { value, onChange } }) => (
            <TextInput
              label="PNR Number"
              value={value}
              onChangeText={onChange}
              error={errors.pnr_number?.message}
              placeholder="Enter PNR number"
              autoCapitalize="characters"
            />
          )}
        />

        {/* Ticket File URL */}
        <Controller
          control={control}
          name="ticket_file_url"
          render={({ field: { value, onChange } }) => (
            <TextInput
              label="Ticket File URL"
              value={value}
              onChangeText={onChange}
              error={errors.ticket_file_url?.message}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
            />
          )}
        />
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
    gap: Spacing.md,
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
