import ImagePicker from "@/components/forms/ImagePicker";
import TextInput from "@/components/forms/TextInput";
import { haptics } from "@/lib/utils/haptics";
import {
  PARCEL_SIZES,
  RequestFormData,
  requestSchema,
  SIZE_DESCRIPTIONS,
} from "@/lib/validations/request";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
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

// Size icons mapping
const SIZE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  small: "bag-handle-outline",
  medium: "briefcase-outline",
  large: "cube-outline",
};

export default function RequestFormScreen() {
  const colors = useThemeColors();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentTrip, loading: tripLoading, getTripById } = useTripStore();
  const { createRequest, loading: requestLoading } = useRequestStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    mode: "onChange",
    defaultValues: {
      item_description: "",
      category: "",
      size: "medium",
      parcel_photos: [],
      delivery_contact_name: "",
      delivery_contact_phone: "",
      sender_notes: "",
    },
  });

  useEffect(() => {
    if (tripId) {
      getTripById(tripId);
    }
  }, [tripId]);

  const onSubmit = async (data: RequestFormData) => {
    try {
      haptics.light();

      await createRequest(
        {
          trip_id: tripId,
          ...data,
        },
        user!.id,
      );

      haptics.success();

      // Navigate to My Requests and remove this screen from stack
      router.dismissAll(); // Clear explore stack
      router.replace("/(tabs)/my-requests"); // Navigate to My Requests tab

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          "Request Sent!",
          "Your parcel request has been sent to the traveller. You can track its status here.",
          [{ text: "OK" }],
        );
      }, 500);
    } catch (error: any) {
      console.error("Request creation error:", error);
      haptics.error();
      Alert.alert("Error", error.message || "Failed to send request");
    }
  };

  const handleBack = () => {
    haptics.light();
    router.back();
  };

  if (tripLoading || !currentTrip) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const isFormDisabled = !isValid || requestLoading;
  const photoCount = watch("parcel_photos")?.length || 0;
  const categorySelected = !!watch("category");
  const sizeSelected = !!watch("size");

  // Progress calculation
  const requiredFields = 6;
  let completedFields = 0;
  if (watch("item_description")) completedFields++;
  if (categorySelected) completedFields++;
  if (sizeSelected) completedFields++;
  if (photoCount === 2) completedFields++;
  if (watch("delivery_contact_name")) completedFields++;
  if (watch("delivery_contact_phone")) completedFields++;

  const progress = (completedFields / requiredFields) * 100;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          style={[
            styles.backButton,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Request Delivery
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.text.secondary }]}
          >
            {currentTrip.source} → {currentTrip.destination}
          </Text>
        </View>
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
          {/* Progress Bar */}
          <View
            style={[
              styles.progressCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.progressHeader}>
              <Text
                style={[styles.progressLabel, { color: colors.text.secondary }]}
              >
                Form Progress
              </Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>
                {Math.round(progress)}%
              </Text>
            </View>
            <View
              style={[
                styles.progressBarBg,
                { backgroundColor: colors.border.light },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Trip Info Card */}
          <View
            style={[
              styles.tripCard,
              {
                backgroundColor: colors.primary + "10",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <View style={styles.tripRow}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={[styles.tripText, { color: colors.primary }]}>
                {formatDate(currentTrip.departure_date)}
              </Text>
            </View>
            <Text style={[styles.tripNote, { color: colors.primary }]}>
              Pickup details coordinated after acceptance
            </Text>
          </View>

          {/* Info Alert */}
          <View
            style={[
              styles.alertBox,
              {
                backgroundColor: colors.primary + "10",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.alertText, { color: colors.primary }]}>
              Receiver's phone is required for OTP verification during delivery
            </Text>
          </View>

          {/* Section 1: Parcel Details */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="cube" size={20} color={colors.primary} />
              </View>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Parcel Details
              </Text>
            </View>

            <Controller
              control={control}
              name="item_description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Item Description *"
                  placeholder="e.g. 2 hardcover books, medical documents..."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.item_description?.message}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                />
              )}
            />

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Category *
              </Text>
              <View style={styles.categoriesGrid}>
                {currentTrip.allowed_categories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: colors.background.primary,
                        borderColor: colors.border.default,
                      },
                      watch("category") === cat && {
                        backgroundColor: colors.primary + "10",
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setValue("category", cat, { shouldValidate: true });
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: colors.text.secondary },
                        watch("category") === cat && {
                          color: colors.primary,
                          fontWeight: Typography.weights.semibold,
                        },
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {errors.category && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.category.message}
                </Text>
              )}
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Parcel Size *
              </Text>
              <View style={styles.sizesContainer}>
                {PARCEL_SIZES.map((size) => (
                  <Pressable
                    key={size}
                    style={[
                      styles.sizeButton,
                      {
                        backgroundColor: colors.background.primary,
                        borderColor: colors.border.default,
                      },
                      watch("size") === size && {
                        backgroundColor: colors.primary + "10",
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setValue("size", size, { shouldValidate: true });
                    }}
                  >
                    <View style={styles.sizeButtonContent}>
                      <Ionicons
                        name={SIZE_ICONS[size]}
                        size={24}
                        color={
                          watch("size") === size
                            ? colors.primary
                            : colors.text.secondary
                        }
                      />
                      <View style={styles.sizeButtonText}>
                        <Text
                          style={[
                            styles.sizeButtonTitle,
                            { color: colors.text.primary },
                            watch("size") === size && {
                              color: colors.primary,
                            },
                          ]}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </Text>
                        <Text
                          style={[
                            styles.sizeButtonDesc,
                            { color: colors.text.secondary },
                            watch("size") === size && {
                              color: colors.primary,
                            },
                          ]}
                        >
                          {SIZE_DESCRIPTIONS[size]}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <Controller
              control={control}
              name="parcel_photos"
              render={({ field: { onChange, value } }) => (
                <ImagePicker
                  images={value}
                  onChange={onChange}
                  exactCount={2}
                  error={errors.parcel_photos?.message}
                />
              )}
            />
          </View>

          {/* Section 2: Receiver Details */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.success + "15" },
                ]}
              >
                <Ionicons name="person" size={20} color={colors.success} />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Receiver Details
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  Person receiving at destination
                </Text>
              </View>
            </View>

            <Controller
              control={control}
              name="delivery_contact_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Receiver's Name *"
                  placeholder="Full name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.delivery_contact_name?.message}
                  autoCapitalize="words"
                />
              )}
            />

            <Controller
              control={control}
              name="delivery_contact_phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Receiver's Phone Number *"
                  placeholder="10-digit phone number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.delivery_contact_phone?.message}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              )}
            />

            <View
              style={[
                styles.noteBox,
                { backgroundColor: colors.success + "10" },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={colors.success}
              />
              <Text style={[styles.noteText, { color: colors.success }]}>
                This number will receive an OTP for delivery verification
              </Text>
            </View>
          </View>

          {/* Section 3: Additional Notes */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.text.tertiary + "15" },
                ]}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color={colors.text.secondary}
                />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Additional Notes
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  Optional
                </Text>
              </View>
            </View>

            <Controller
              control={control}
              name="sender_notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Notes"
                  placeholder="Special handling instructions or time constraints..."
                  value={value || ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.sender_notes?.message}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
              )}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky Submit Button */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.primary,
              borderTopColor: colors.border.light,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary },
              isFormDisabled && styles.submitButtonDisabled,
              pressed && !isFormDisabled && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isFormDisabled}
          >
            {requestLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.text.inverse} />
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: colors.text.inverse },
                  ]}
                >
                  Send Request
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerSubtitle: {
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
    gap: Spacing.lg,
  },
  progressCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  tripCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  tripText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  tripNote: {
    fontSize: Typography.sizes.xs,
  },
  alertBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  alertText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  section: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  categoryButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  sizesContainer: {
    gap: Spacing.sm,
  },
  sizeButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  sizeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sizeButtonText: {
    flex: 1,
  },
  sizeButtonTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  sizeButtonDesc: {
    fontSize: Typography.sizes.xs,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  noteText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
