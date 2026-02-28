// components/request/EditRequestDetailsModal.tsx
import ImagePicker from "@/components/forms/ImagePicker";
import TextInput from "@/components/forms/TextInput";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { showErrorAlert } from "@/lib/utils/alerts";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import {
  RequestEditDetailsFormData,
  requestEditDetailsSchema,
} from "@/lib/validations/request-edit";
import { ParcelRequest, useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface EditRequestDetailsModalProps {
  visible: boolean;
  request: ParcelRequest;
  allowedCategories: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRequestDetailsModal({
  visible,
  request,
  allowedCategories,
  onClose,
  onSuccess,
}: EditRequestDetailsModalProps) {
  const colors = useThemeColors();
  const { updateRequestDetails, loading } = useRequestStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<RequestEditDetailsFormData>({
    resolver: zodResolver(requestEditDetailsSchema),
    mode: "onChange",
    defaultValues: {
      item_description: request.item_description,
      category: request.category,
      parcel_photos: request.parcel_photos || [],
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      reset({
        item_description: request.item_description,
        category: request.category,
        parcel_photos: request.parcel_photos || [],
      });
    }
  }, [visible, request, reset]);

  const onSubmit = async (data: RequestEditDetailsFormData) => {
    try {
      haptics.light();

      await updateRequestDetails(
        request.id,
        data.item_description,
        data.category,
        data.parcel_photos,
      );

      haptics.success();
      showSuccessToast("Request details updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      logger.error("Update request details failed", error, {
        module: "EditRequestDetailsModal",
      });
      haptics.error();
      showErrorAlert(error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  const isFormDisabled = !isValid || !isDirty || isSubmitting || loading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: colors.border.light }]}
        >
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            hitSlop={10}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Edit Request Details
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              You can only edit request details while the request is pending
            </Text>
          </View>

          {/* Section: Parcel Details */}
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

            {/* Description */}
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

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Category *
              </Text>
              <View style={styles.categoriesGrid}>
                {allowedCategories.map((cat) => {
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

          {/* Section: Parcel Photos */}
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

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>

        {/* Footer */}
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
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isFormDisabled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isFormDisabled}
          >
            {isSubmitting ? (
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
                  Save Changes
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
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
  submitButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
