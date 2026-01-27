import CategoryCheckboxes from "@/components/forms/CategoryCheckboxes";
import CityDropdown from "@/components/forms/CityDropdown";
import DatePickerInput from "@/components/forms/DatePickerInput";
import FileUploadButton from "@/components/forms/FileUploadButton";
import SlotsStepper from "@/components/forms/SlotsStepper";
import TextInput from "@/components/forms/TextInput";
import TimePickerInput from "@/components/forms/TimePickerInput";
import TransportModeSelector from "@/components/forms/TransportModeSelector";
import { haptics } from "@/lib/utils/haptics";
import {
  PackageCategory,
  TransportMode,
  TripFormData,
  tripSchema,
} from "@/lib/validations/trip";
import { useAuthStore } from "@/stores/authStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

// Helper function to parse and format error messages
const getErrorMessage = (error: any): { title: string; message: string } => {
  const errorMessage = error.message || "";

  // Server-side validation errors
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

  // Network errors
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return {
      title: "Connection Error",
      message: "Please check your internet connection and try again.",
    };
  }

  // Generic fallback
  return {
    title: "Error",
    message: errorMessage || "Failed to create trip. Please try again.",
  };
};

export default function CreateTripScreen() {
  const { user } = useAuthStore();
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

      await createTrip(data, user!.id);

      // Reset form to default values
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

      Alert.alert(
        "Trip Created! 🎉",
        "Your trip has been created successfully. You can now receive parcel requests from senders.",
        [
          {
            text: "View My Trips",
            onPress: () => {
              router.push("/(tabs)/my-trips");
            },
          },
          {
            text: "Create Another",
            style: "cancel",
          },
        ],
      );
    } catch (error: any) {
      console.error("Trip creation error:", error);
      haptics.error();

      // Get user-friendly error message
      const { title, message } = getErrorMessage(error);

      Alert.alert(title, message, [
        {
          text: "OK",
          style: "default",
        },
      ]);
    }
  };

  const isFormDisabled = !isValid || loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Trip</Text>
          <Text style={styles.subtitle}>Share your journey, help others</Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.infoBannerText}>
            All trip details will be verified. Only travelers with valid tickets
            can create trips.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route & Transport</Text>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Controller
                control={control}
                name="departure_date"
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    label="Departure Date"
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
                    label="Departure Time"
                    value={parseDate("2000-01-01", value)}
                    onChange={(date) => onChange(formatTime(date))}
                    error={errors.departure_time?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Controller
                control={control}
                name="arrival_date"
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    label="Arrival Date"
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
                    label="Arrival Time"
                    value={parseDate("2000-01-01", value)}
                    onChange={(date) => onChange(formatTime(date))}
                    error={errors.arrival_time?.message}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capacity & Categories</Text>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>

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
                userId={user!.id}
                error={errors.ticket_file_url?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>

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

        <TouchableOpacity
          style={[
            styles.submitButton,
            isFormDisabled && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isFormDisabled}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.text.inverse}
              />
              <Text style={styles.submitButtonText}>Create Trip</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary + "10",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  section: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
