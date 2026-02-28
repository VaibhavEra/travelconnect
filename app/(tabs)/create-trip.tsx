// app/(tabs)/create-trip.tsx
import {
  CategoryCheckboxes,
  CitySwapPair,
  DatePickerInput,
  FileUploadButton,
  ParcelSizeSelector,
  TextInput,
  TimePickerInput,
  TransportModeSelector,
} from "@/components/forms";
import { ScreenContainer, ScreenHeader } from "@/components/shared";
import {
  combineDateAndTime,
  dateToISO,
  dateToTimeString,
  haptics,
  logger,
  showErrorAlert,
  showSuccessToast,
  uploadFile,
} from "@/lib/utils";
import {
  PackageCategory,
  ParcelSizeCapacity,
  TransportMode,
  TripFormData,
  tripSchema,
} from "@/lib/validations";
import { useAuthStore } from "@/stores/authStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MODULE = "CreateTripScreen";

// ── Extracted default values to avoid duplication between useForm and reset() ──
const DEFAULT_VALUES: TripFormData = {
  source: "",
  destination: "",
  transport_mode: "train",
  departure_date: "",
  departure_time: "",
  arrival_date: "",
  arrival_time: "",
  parcel_size_capacity: "medium",
  allowed_categories: [],
  pnr_number: "",
  ticket_file_url: "",
};

export default function CreateTripScreen() {
  const colors = useThemeColors();
  const user = useAuthStore((state) => state.user);
  const { createTrip, loading } = useTripStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  // Guard against null user during sign out
  // hooks must run before this guard
  if (!user) {
    return null;
  }

  const departureDate = watch("departure_date");

  const onSubmit = async (data: TripFormData) => {
    try {
      haptics.light();

      // Upload ticket file if selected (local URI → Supabase URL)
      let ticketUrl = data.ticket_file_url;
      if (ticketUrl && ticketUrl.startsWith("file://")) {
        try {
          ticketUrl = await uploadFile(ticketUrl, "tickets");
        } catch (uploadError: unknown) {
          haptics.error();
          logger.error("Ticket file upload failed", uploadError, {
            module: MODULE,
          });
          showErrorAlert(uploadError);
          return;
        }
      }

      await createTrip({ ...data, ticket_file_url: ticketUrl }, user.id);

      reset(DEFAULT_VALUES);

      haptics.success();
      router.push("/(tabs)/my-trips");

      setTimeout(() => {
        showSuccessToast(
          "Trip created! You can now receive parcel requests from senders.",
        );
      }, 300);
    } catch (error: unknown) {
      logger.error("Trip creation failed", error, { module: MODULE });
      haptics.error();
      showErrorAlert(error);
    }
  };

  const isFormDisabled = !isValid || loading;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Create Trip"
        subtitle="Share your journey, help others"
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"} // ← fixed
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Route & Transport */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="map" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Route & Transport
              </Text>
            </View>

            <Controller
              control={control}
              name="source"
              render={({
                field: { onChange: onSourceChange, value: sourceValue },
              }) => (
                <Controller
                  control={control}
                  name="destination"
                  render={({
                    field: {
                      onChange: onDestinationChange,
                      value: destinationValue,
                    },
                  }) => (
                    <CitySwapPair
                      sourceValue={sourceValue}
                      destinationValue={destinationValue}
                      onSourceChange={onSourceChange}
                      onDestinationChange={onDestinationChange}
                      sourceError={errors.source?.message}
                      destinationError={errors.destination?.message}
                    />
                  )}
                />
              )}
            />

            <View style={styles.transportRow}>
              <Controller
                control={control}
                name="transport_mode"
                render={({ field: { onChange, value } }) => (
                  <TransportModeSelector
                    label="Transport Mode"
                    value={value as TransportMode}
                    onChange={onChange}
                    error={errors.transport_mode?.message}
                  />
                )}
              />
            </View>
          </View>

          {/* Schedule */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Schedule
              </Text>
            </View>

            <Text
              style={[styles.scheduleLabel, { color: colors.text.primary }]}
            >
              Departure
            </Text>
            <View style={styles.dateTimeRow}>
              <Controller
                control={control}
                name="departure_date"
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    value={value ? new Date(value) : null}
                    onChange={(date) => onChange(date ? dateToISO(date) : "")}
                    error={errors.departure_date?.message}
                    minimumDate={new Date()}
                    placeholder="Select date"
                  />
                )}
              />
              <Controller
                control={control}
                name="departure_time"
                render={({ field: { onChange, value } }) => (
                  <TimePickerInput
                    value={
                      value && value.trim() !== ""
                        ? combineDateAndTime("2000-01-01", value)
                        : null
                    }
                    onChange={(date) =>
                      onChange(date ? dateToTimeString(date) : "")
                    }
                    error={errors.departure_time?.message}
                    placeholder="Pick time"
                  />
                )}
              />
            </View>

            <Text
              style={[styles.scheduleLabel, { color: colors.text.primary }]}
            >
              Arrival
            </Text>
            <View style={styles.dateTimeRow}>
              <Controller
                control={control}
                name="arrival_date"
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    value={value ? new Date(value) : null}
                    onChange={(date) => onChange(date ? dateToISO(date) : null)}
                    error={errors.arrival_date?.message}
                    minimumDate={
                      departureDate ? new Date(departureDate) : new Date()
                    }
                    placeholder="Select date"
                  />
                )}
              />
              <Controller
                control={control}
                name="arrival_time"
                render={({ field: { onChange, value } }) => (
                  <TimePickerInput
                    value={
                      value && value.trim() !== ""
                        ? combineDateAndTime("2000-01-01", value)
                        : null
                    }
                    onChange={(date) =>
                      onChange(date ? dateToTimeString(date) : null)
                    }
                    error={errors.arrival_time?.message}
                    placeholder="Pick time"
                  />
                )}
              />
            </View>
          </View>

          {/* Capacity & Categories */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="cube" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Capacity & Categories
              </Text>
            </View>

            <Controller
              control={control}
              name="parcel_size_capacity"
              render={({ field: { onChange, value } }) => (
                <ParcelSizeSelector
                  label="Parcel Size Capacity"
                  value={value as ParcelSizeCapacity}
                  onChange={onChange}
                  error={errors.parcel_size_capacity?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="allowed_categories"
              render={({ field: { onChange, value } }) => (
                <CategoryCheckboxes
                  label="Allowed Package Categories"
                  value={value as PackageCategory[]}
                  onChange={onChange}
                  error={errors.allowed_categories?.message}
                />
              )}
            />
          </View>

          {/* Verification */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.success + "15" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={colors.success}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Verification
              </Text>
            </View>

            <Controller
              control={control}
              name="pnr_number"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="PNR Number"
                  placeholder="e.g. ABC123456"
                  value={value}
                  onChangeText={(text) => onChange(text.toUpperCase())}
                  onBlur={onBlur}
                  error={errors.pnr_number?.message}
                  autoCapitalize="characters"
                  maxLength={20}
                />
              )}
            />

            <Controller
              control={control}
              name="ticket_file_url"
              render={({ field: { onChange, value } }) => (
                <FileUploadButton
                  label="Ticket File"
                  value={value}
                  onChange={onChange}
                  error={errors.ticket_file_url?.message}
                />
              )}
            />
          </View>

          {hasErrors && (
            <View
              style={[
                styles.errorSummary,
                {
                  backgroundColor: colors.error + "10",
                  borderColor: colors.error + "30",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={[styles.errorSummaryText, { color: colors.error }]}>
                Please fix the errors above before creating the trip
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isFormDisabled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isFormDisabled}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.text.inverse}
                />
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: colors.text.inverse },
                  ]}
                >
                  Create Trip
                </Text>
              </>
            )}
          </Pressable>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  transportRow: {
    marginTop: Spacing.md,
  },
  scheduleLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  errorSummaryText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  submitButton: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
