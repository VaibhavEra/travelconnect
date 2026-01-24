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
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
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

export default function RequestFormScreen() {
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

      Alert.alert(
        "Request Sent!",
        "Your parcel request has been sent to the traveller. If accepted, you can coordinate pickup details with them.",
        [
          {
            text: "View My Requests",
            onPress: () => {
              router.replace("/(tabs)/my-requests");
            },
          },
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Request creation error:", error);
      haptics.error();
      Alert.alert("Error", error.message || "Failed to send request");
    }
  };

  if (tripLoading || !currentTrip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isFormDisabled = !isValid || requestLoading;

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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Request Parcel Delivery</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tripInfo}>
          <View style={styles.tripRoute}>
            <Text style={styles.tripCity}>{currentTrip.source}</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={Colors.text.secondary}
            />
            <Text style={styles.tripCity}>{currentTrip.destination}</Text>
          </View>
          <Text style={styles.tripDate}>
            {new Date(currentTrip.departure_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.infoText}>
            Receiver's phone number is required for delivery OTP verification.
            Pickup details will be coordinated after traveller accepts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parcel Details</Text>

          <Controller
            control={control}
            name="item_description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Item Description"
                placeholder="e.g. 2 hardcover books, medical documents, winter clothing..."
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoriesGrid}>
              {currentTrip.allowed_categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryButton,
                    watch("category") === cat && styles.categoryButtonSelected,
                  ]}
                  onPress={() =>
                    setValue("category", cat, { shouldValidate: true })
                  }
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      watch("category") === cat &&
                        styles.categoryButtonTextSelected,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.category && (
              <Text style={styles.errorText}>{errors.category.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Parcel Size *</Text>
            <View style={styles.sizesContainer}>
              {PARCEL_SIZES.map((size) => (
                <Pressable
                  key={size}
                  style={[
                    styles.sizeButton,
                    watch("size") === size && styles.sizeButtonSelected,
                  ]}
                  onPress={() =>
                    setValue("size", size, { shouldValidate: true })
                  }
                >
                  <Text
                    style={[
                      styles.sizeButtonTitle,
                      watch("size") === size && styles.sizeButtonTitleSelected,
                    ]}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Text>
                  <Text
                    style={[
                      styles.sizeButtonDesc,
                      watch("size") === size && styles.sizeButtonDescSelected,
                    ]}
                  >
                    {SIZE_DESCRIPTIONS[size]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Controller
            control={control}
            name="parcel_photos"
            render={({ field: { onChange, value } }) => (
              <ImagePicker
                images={value}
                onChange={onChange}
                maxImages={5}
                error={errors.parcel_photos?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receiver Details</Text>
          <Text style={styles.sectionSubtitle}>
            Person who will receive the parcel at destination
          </Text>

          <Controller
            control={control}
            name="delivery_contact_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Receiver's Name"
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
                label="Receiver's Phone Number"
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

          <View style={styles.noteBox}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={Colors.success}
            />
            <Text style={styles.noteText}>
              This number will receive an OTP for delivery verification
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>

          <Controller
            control={control}
            name="sender_notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Notes"
                placeholder="Any special handling instructions or time constraints..."
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

        <Pressable
          style={[
            styles.submitButton,
            isFormDisabled && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isFormDisabled}
        >
          {requestLoading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={Colors.text.inverse} />
              <Text style={styles.submitButtonText}>Send Request</Text>
            </>
          )}
        </Pressable>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  tripInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary + "10",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  tripRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  tripCity: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  tripDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
  },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.primary + "10",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
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
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
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
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  categoryButtonTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  sizesContainer: {
    gap: Spacing.sm,
  },
  sizeButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  sizeButtonSelected: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  sizeButtonTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sizeButtonTitleSelected: {
    color: Colors.primary,
  },
  sizeButtonDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },
  sizeButtonDescSelected: {
    color: Colors.primary,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.success + "10",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.success,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
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
