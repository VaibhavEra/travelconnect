// components/trip/EditTripDetailsModal.tsx
import CategoryCheckboxes from "@/components/forms/CategoryCheckboxes";
import CityDropdown from "@/components/forms/CityDropdown";
import ParcelSizeSelector from "@/components/forms/ParcelSizeSelector";
import TransportModeSelector from "@/components/forms/TransportModeSelector";
import BaseModal from "@/components/shared/BaseModal";
import { haptics } from "@/lib/utils/haptics";
import {
  TripDetailsFormData,
  tripDetailsSchema,
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
  const { updateTrip } = useTripStore();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
    setValue,
  } = useForm<TripDetailsFormData>({
    resolver: zodResolver(tripDetailsSchema),
    mode: "onChange",
    defaultValues: {
      source: trip.source,
      destination: trip.destination,
      transport_mode: trip.transport_mode,
      parcel_size_capacity: trip.parcel_size_capacity,
      allowed_categories: trip.allowed_categories as any,
      // REMOVED: notes (Issue #7)
    },
  });

  const onSubmit = async (data: TripDetailsFormData) => {
    try {
      setLoading(true);
      haptics.light();

      // Map form field names to database field names
      await updateTrip(trip.id, {
        source: data.source.trim(),
        destination: data.destination.trim(),
        transport_mode: data.transport_mode,
        parcel_size_capacity: data.parcel_size_capacity,
        allowed_categories: data.allowed_categories,
        // REMOVED: notes (Issue #7)
      });

      haptics.success();
      Alert.alert("Success", "Trip details updated successfully");
      onClose();
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to update trip details");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const currentSource = watch("source");
    const currentDest = watch("destination");
    if (currentSource && currentDest) {
      haptics.light();
      setValue("source", currentDest, { shouldValidate: true });
      setValue("destination", currentSource, { shouldValidate: true });
    }
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title="Edit Trip Details"
      subtitle="Update route, transport, and parcel info"
      loading={loading}
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
        {/* Route Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Route
          </Text>

          <Controller
            control={control}
            name="source"
            render={({ field: { value, onChange } }) => (
              <CityDropdown
                label="From"
                value={value}
                onChange={onChange}
                error={errors.source?.message}
                placeholder="Select origin city"
              />
            )}
          />

          {/* Swap Button */}
          <View style={styles.swapContainer}>
            <Pressable
              style={[
                styles.swapButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: colors.border.default,
                },
              ]}
              onPress={handleSwap}
            >
              <Ionicons name="swap-vertical" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <Controller
            control={control}
            name="destination"
            render={({ field: { value, onChange } }) => (
              <CityDropdown
                label="To"
                value={value}
                onChange={onChange}
                error={errors.destination?.message}
                placeholder="Select destination city"
              />
            )}
          />
        </View>

        {/* Transport Mode */}
        <Controller
          control={control}
          name="transport_mode"
          render={({ field: { value, onChange } }) => (
            <TransportModeSelector
              label="Transport Mode"
              value={value}
              onChange={onChange}
              error={errors.transport_mode?.message}
            />
          )}
        />

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
          disabled={loading}
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
            (!isValid || !isDirty || loading) && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || !isDirty || loading}
        >
          {loading ? (
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
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  swapContainer: {
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
