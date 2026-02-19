// app/(tabs)/explore/request-form.tsx
import ImagePicker from "@/components/forms/ImagePicker";
import TextInput from "@/components/forms/TextInput";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { showErrorAlert } from "@/lib/utils/alerts";
import { formatDate } from "@/lib/utils/dateTime";
import { uploadFile } from "@/lib/utils/fileUpload";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import { RequestFormData, requestSchema } from "@/lib/validations/request";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

const MODULE = "RequestFormScreen";

export default function RequestFormScreen() {
  const colors = useThemeColors();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentTrip, loading: tripLoading, getTripById } = useTripStore();
  const { createRequest, loading: requestLoading } = useRequestStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      parcel_photos: [],
      delivery_contact_name: "",
      delivery_contact_phone: "",
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
      setIsSubmitting(true);

      // Upload parcel photos if selected (local URIs → Supabase URLs)
      let photoUrls = data.parcel_photos;

      // Check if we have local URIs that need uploading
      const hasLocalFiles = photoUrls.some((uri) => uri.startsWith("file://"));

      if (hasLocalFiles) {
        try {
          // Upload all photos in parallel
          photoUrls = await Promise.all(
            photoUrls.map((uri) => {
              if (uri.startsWith("file://")) {
                return uploadFile(uri, "parcel-photos");
              }
              return uri; // Already a public URL
            }),
          );
        } catch (uploadError: unknown) {
          haptics.error();
          logger.error("Parcel photo upload failed", uploadError, {
            module: MODULE,
          });
          showErrorAlert(uploadError);
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare request data with uploaded URLs
      const requestData = {
        ...data,
        parcel_photos: photoUrls,
      };

      await createRequest(
        {
          trip_id: tripId,
          ...requestData,
        },
        user!.id,
      );

      haptics.success();

      router.dismissAll();
      router.replace("/(tabs)/my-requests");

      setTimeout(() => {
        showSuccessToast(
          "Request sent! You can track its status in My Requests.",
        );
      }, 500);
    } catch (error: unknown) {
      logger.error("Request creation failed", error, { module: MODULE });
      haptics.error();
      showErrorAlert(error);
    } finally {
      setIsSubmitting(false);
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

  const isFormDisabled = !isValid || requestLoading || isSubmitting;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header with Trip Route and Dates */}
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
          <View style={styles.headerRoute}>
            <Text style={[styles.headerCity, { color: colors.text.secondary }]}>
              {currentTrip.source}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.text.tertiary}
            />
            <Text style={[styles.headerCity, { color: colors.text.secondary }]}>
              {currentTrip.destination}
            </Text>
          </View>
          <View style={styles.headerDateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.text.tertiary}
            />
            <Text style={[styles.headerDate, { color: colors.text.tertiary }]}>
              Departs: {formatDate(currentTrip.departure_date)}
            </Text>
            <Text
              style={[styles.headerSeparator, { color: colors.text.tertiary }]}
            >
              •
            </Text>
            <Text style={[styles.headerDate, { color: colors.text.tertiary }]}>
              Arrives: {formatDate(currentTrip.arrival_date)}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Alert - Trip Capacity */}
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
              This trip accepts{" "}
              {getSizeCapacityLabel(currentTrip.parcel_size_capacity)} parcels
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
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={colors.primary}
                />
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

            {/* Category Selection with Icons */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Category *
              </Text>
              <View style={styles.categoriesGrid}>
                {currentTrip.allowed_categories.map((cat) => {
                  const categoryConfig =
                    CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                  const isSelected = watch("category") === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor: colors.background.primary,
                          borderColor: colors.border.default,
                        },
                        isSelected && {
                          backgroundColor: colors.primary + "10",
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => {
                        haptics.light();
                        setValue("category", cat, { shouldValidate: true });
                      }}
                    >
                      <Ionicons
                        name={categoryConfig?.icon || "cube-outline"}
                        size={20}
                        color={
                          isSelected ? colors.primary : colors.text.secondary
                        }
                      />
                      <Text
                        style={[
                          styles.categoryButtonText,
                          { color: colors.text.secondary },
                          isSelected && {
                            color: colors.primary,
                            fontWeight: Typography.weights.semibold,
                          },
                        ]}
                      >
                        {categoryConfig?.label || cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.category && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.category.message}
                </Text>
              )}
            </View>
          </View>

          {/* Section 2: Parcel Photos */}
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
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Parcel Photos
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  Required: Exactly 2 photos
                </Text>
              </View>
            </View>

            <Controller
              control={control}
              name="parcel_photos"
              render={({ field: { onChange, value } }) => (
                <ImagePicker
                  images={value}
                  onChange={onChange}
                  exactCount={2}
                  error={errors.parcel_photos?.message}
                  disableCropping={true}
                />
              )}
            />
          </View>

          {/* Section 3: Receiver Details */}
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
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.success}
                />
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

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            {/* Phone Number Subsection with Clear Heading */}
            <View style={styles.phoneSection}>
              <View style={styles.phoneSectionHeader}>
                <Ionicons name="call" size={18} color={colors.success} />
                <Text
                  style={[
                    styles.phoneSectionTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Phone Number for OTP Verification
                </Text>
              </View>

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
                  name="shield-checkmark-outline"
                  size={16}
                  color={colors.success}
                />
                <Text style={[styles.noteText, { color: colors.success }]}>
                  This number will receive an OTP for secure delivery
                  verification
                </Text>
              </View>
            </View>
          </View>

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
            {requestLoading || isSubmitting ? (
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

          {/* Bottom Spacing */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerCity: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  headerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerDate: {
    fontSize: Typography.sizes.xs,
  },
  headerSeparator: {
    fontSize: Typography.sizes.xs,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  categoryButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  phoneSection: {
    gap: Spacing.sm,
  },
  phoneSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  phoneSectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
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
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
