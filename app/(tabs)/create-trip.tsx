import CategoryCheckboxes from "@/components/forms/CategoryCheckboxes";
import CityDropdown from "@/components/forms/CityDropdown";
import DatePickerInput from "@/components/forms/DatePickerInput";
import FileUploadButton from "@/components/forms/FileUploadButton";
import SlotsStepper from "@/components/forms/SlotsStepper";
import TextInput from "@/components/forms/TextInput";
import TimePickerInput from "@/components/forms/TimePickerInput";
import TransportModeSelector from "@/components/forms/TransportModeSelector";
import ModeSwitcher from "@/components/shared/ModeSwitcher";
import { haptics } from "@/lib/utils/haptics";
import {
  PackageCategory,
  TransportMode,
  TripFormData,
  tripSchema,
} from "@/lib/validations/trip";
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getDefaultDepartureDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString().split("T")[0];
};

const getDefaultArrivalDate = () => {
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(0, 0, 0, 0);
  return dayAfterTomorrow.toISOString().split("T")[0];
};

const getErrorMessage = (error: any): { title: string; message: string } => {
  const errorMessage = error.message || "";

  if (errorMessage.includes("past") || errorMessage.includes("before")) {
    return {
      title: "Invalid Date",
      message:
        "Departure date cannot be in the past. Please select a future date.",
    };
  }

  if (errorMessage.includes("after departure")) {
    return {
      title: "Invalid Time",
      message: "Arrival time must be after departure time.",
    };
  }

  if (errorMessage.includes("same route")) {
    return {
      title: "Duplicate Route",
      message: "Source and destination cannot be the same city.",
    };
  }

  if (
    errorMessage.includes("category") ||
    errorMessage.includes("categories")
  ) {
    return {
      title: "Categories Required",
      message: "Please select at least one package category to allow.",
    };
  }

  if (errorMessage.includes("PNR")) {
    return {
      title: "Invalid PNR",
      message: "Please check your PNR number and try again.",
    };
  }

  if (errorMessage.includes("ticket")) {
    return {
      title: "Ticket Required",
      message: "Please upload your ticket file for verification.",
    };
  }

  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return {
      title: "Connection Error",
      message: "Please check your internet connection and try again.",
    };
  }

  return {
    title: "Error",
    message: errorMessage || "Failed to create trip. Please try again.",
  };
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
    defaultValues: {
      source: "",
      destination: "",
      transport_mode: "train",
      departure_date: getDefaultDepartureDate(),
      departure_time: "10:00",
      arrival_date: getDefaultArrivalDate(),
      arrival_time: "18:00",
      total_slots: 3,
      allowed_categories: [],
      pnr_number: "",
      ticket_file_url: "",
      notes: "",
    },
  });

  // ADD THIS: Guard against null user during sign out
  if (!user) {
    return null;
  }

  const departureDate = watch("departure_date");

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const parseDate = (dateString: string, timeString?: string): Date => {
    if (timeString) {
      return new Date(`${dateString}T${timeString}`);
    }
    return new Date(dateString);
  };

  const onSubmit = async (data: TripFormData) => {
    try {
      haptics.light();

      await createTrip(data, user.id);

      reset({
        source: "",
        destination: "",
        transport_mode: "train",
        departure_date: getDefaultDepartureDate(),
        departure_time: "10:00",
        arrival_date: getDefaultArrivalDate(),
        arrival_time: "18:00",
        total_slots: 3,
        allowed_categories: [],
        pnr_number: "",
        ticket_file_url: "",
        notes: "",
      });

      haptics.success();
      router.push("/(tabs)/my-trips");

      setTimeout(() => {
        Alert.alert(
          "Trip Created! 🎉",
          "Your trip has been created successfully. You can now receive parcel requests from senders.",
          [{ text: "OK", style: "default" }],
        );
      }, 300);
    } catch (error: any) {
      console.error("Trip creation error:", error);
      haptics.error();
      const { title, message } = getErrorMessage(error);
      Alert.alert(title, message, [{ text: "OK", style: "default" }]);
    }
  };

  const isFormDisabled = !isValid || loading;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <View>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Create Trip
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Share your journey, help others
          </Text>
        </View>
        <ModeSwitcher />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View
            style={[
              styles.infoBanner,
              { backgroundColor: colors.primary + "10" },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>
              All trip details will be verified. Only travelers with valid
              tickets can create trips.
            </Text>
          </View>

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
              render={({ field: { onChange, value } }) => (
                <CityDropdown
                  label="Source City"
                  value={value}
                  onChange={onChange}
                  placeholder="Select source city"
                  error={errors.source?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="destination"
              render={({ field: { onChange, value } }) => (
                <CityDropdown
                  label="Destination City"
                  value={value}
                  onChange={onChange}
                  placeholder="Select destination city"
                  error={errors.destination?.message}
                />
              )}
            />

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
              style={[styles.scheduleLabel, { color: colors.text.secondary }]}
            >
              Departure
            </Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Controller
                  control={control}
                  name="departure_date"
                  render={({ field: { onChange, value } }) => (
                    <DatePickerInput
                      label="Date"
                      value={parseDate(value)}
                      onChange={(date) => onChange(formatDate(date))}
                      error={errors.departure_date?.message}
                      minimumDate={new Date()}
                    />
                  )}
                />
              </View>
              <View style={styles.halfWidth}>
                <Controller
                  control={control}
                  name="departure_time"
                  render={({ field: { onChange, value } }) => (
                    <TimePickerInput
                      label="Time"
                      value={parseDate("2000-01-01", value)}
                      onChange={(date) => onChange(formatTime(date))}
                      error={errors.departure_time?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Text
              style={[styles.scheduleLabel, { color: colors.text.secondary }]}
            >
              Arrival
            </Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Controller
                  control={control}
                  name="arrival_date"
                  render={({ field: { onChange, value } }) => (
                    <DatePickerInput
                      label="Date"
                      value={parseDate(value)}
                      onChange={(date) => onChange(formatDate(date))}
                      error={errors.arrival_date?.message}
                      minimumDate={parseDate(departureDate)}
                    />
                  )}
                />
              </View>
              <View style={styles.halfWidth}>
                <Controller
                  control={control}
                  name="arrival_time"
                  render={({ field: { onChange, value } }) => (
                    <TimePickerInput
                      label="Time"
                      value={parseDate("2000-01-01", value)}
                      onChange={(date) => onChange(formatTime(date))}
                      error={errors.arrival_time?.message}
                    />
                  )}
                />
              </View>
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
              name="total_slots"
              render={({ field: { onChange, value } }) => (
                <SlotsStepper
                  label="Available Slots"
                  value={value}
                  onChange={onChange}
                  min={1}
                  max={5}
                  error={errors.total_slots?.message}
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
                  userId={user.id}
                  error={errors.ticket_file_url?.message}
                />
              )}
            />
          </View>

          {/* Additional Notes */}
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
                  { backgroundColor: colors.text.tertiary + "15" },
                ]}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color={colors.text.secondary}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Additional Notes
                <Text
                  style={[styles.optional, { color: colors.text.tertiary }]}
                >
                  {" "}
                  (Optional)
                </Text>
              </Text>
            </View>

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Notes"
                  placeholder="Any special instructions or requirements..."
                  value={value || ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.notes?.message}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                />
              )}
            />
          </View>

          {/* Validation Errors Summary */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  optional: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.normal,
  },
  scheduleLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
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
