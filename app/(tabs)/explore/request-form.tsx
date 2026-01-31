import ImagePicker from "@/components/forms/ImagePicker";
import TextInput from "@/components/forms/TextInput";
import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
import { formatDate } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import {
  PARCEL_SIZES,
  RequestFormData,
  requestSchema,
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

      router.dismissAll();
      router.replace("/(tabs)/my-requests");

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

  const isFormDisabled = !isValid || requestLoading;

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
          {/* Info Alert - Pickup Coordination */}
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
              Pickup details will be coordinated after the traveller accepts
              your request
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

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            {/* Size Selection with Icons */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Parcel Size *
              </Text>
              <View style={styles.sizesContainer}>
                {PARCEL_SIZES.map((size) => {
                  const sizeConfig =
                    SIZE_CONFIG[size as keyof typeof SIZE_CONFIG];
                  const isSelected = watch("size") === size;
                  return (
                    <Pressable
                      key={size}
                      style={[
                        styles.sizeButton,
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
                        setValue("size", size, { shouldValidate: true });
                      }}
                    >
                      <View style={styles.sizeButtonContent}>
                        <Ionicons
                          name={sizeConfig?.icon || "cube-outline"}
                          size={24}
                          color={
                            isSelected ? colors.primary : colors.text.secondary
                          }
                        />
                        <View style={styles.sizeButtonText}>
                          <Text
                            style={[
                              styles.sizeButtonTitle,
                              { color: colors.text.primary },
                              isSelected && {
                                color: colors.primary,
                              },
                            ]}
                          >
                            {sizeConfig?.label || size}
                          </Text>
                          <Text
                            style={[
                              styles.sizeButtonDesc,
                              { color: colors.text.secondary },
                              isSelected && {
                                color: colors.primary,
                              },
                            ]}
                          >
                            {sizeConfig?.description || ""}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
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

          {/* Submit Button - AT BOTTOM OF SCROLLABLE CONTENT (NOT STICKY) */}
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isFormDisabled && styles.submitButtonDisabled,
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
  // NEW: Submit button at bottom of scroll content (NOT sticky footer)
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
