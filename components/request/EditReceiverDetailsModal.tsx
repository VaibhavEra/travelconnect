import TextInput from "@/components/forms/TextInput";
import { haptics } from "@/lib/utils/haptics";
import {
  RequestEditReceiverFormData,
  requestEditReceiverSchema,
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
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface EditReceiverDetailsModalProps {
  visible: boolean;
  request: ParcelRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditReceiverDetailsModal({
  visible,
  request,
  onClose,
  onSuccess,
}: EditReceiverDetailsModalProps) {
  const colors = useThemeColors();
  const { updateReceiverDetails, loading } = useRequestStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
    reset,
  } = useForm<RequestEditReceiverFormData>({
    resolver: zodResolver(requestEditReceiverSchema),
    mode: "onChange",
    defaultValues: {
      delivery_contact_name: request.delivery_contact_name,
      delivery_contact_phone: request.delivery_contact_phone,
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      reset({
        delivery_contact_name: request.delivery_contact_name,
        delivery_contact_phone: request.delivery_contact_phone,
      });
    }
  }, [visible, request, reset]);

  const onSubmit = async (data: RequestEditReceiverFormData) => {
    try {
      haptics.light();

      await updateReceiverDetails(
        request.id,
        data.delivery_contact_name,
        data.delivery_contact_phone,
      );

      haptics.success();
      Alert.alert("Success", "Receiver details updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Update error:", error);
      haptics.error();
      Alert.alert(
        "Error",
        error.message || "Failed to update receiver details",
      );
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
            Edit Receiver Details
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
                backgroundColor: colors.success + "10",
                borderColor: colors.success + "30",
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.alertText, { color: colors.success }]}>
              You can edit receiver details until the parcel is delivered
            </Text>
          </View>

          {/* Receiver Details Section */}
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
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Receiver Information
              </Text>
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

            {/* Phone Number with OTP Info */}
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
                  This number will receive OTPs for secure delivery verification
                </Text>
              </View>
            </View>
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
              { backgroundColor: colors.success },
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
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  divider: {
    height: 1,
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
