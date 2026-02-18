// components/modals/RejectRequestModal.tsx
import { BaseModal, ModalButton } from "@/components/shared";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface RejectRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  senderName: string;
}

const REJECTION_REASONS = [
  "Size exceeds capacity",
  "Category doesn't match description",
  "Photos unclear",
  "Other",
];

export default function RejectRequestModal({
  visible,
  onClose,
  onReject,
  senderName,
}: RejectRequestModalProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState("");
  const [selectedQuickReason, setSelectedQuickReason] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickReasonSelect = (quickReason: string) => {
    if (quickReason === "Other") {
      setSelectedQuickReason(quickReason);
      setReason("");
    } else {
      setSelectedQuickReason(quickReason);
      setReason(quickReason);
    }
    setError("");
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onReject(reason.trim());
      setReason("");
      setSelectedQuickReason(null);
      onClose();
    } catch (err) {
      console.error("Reject request failed:", err);
      setError("Failed to reject request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      setSelectedQuickReason(null);
      setError("");
      onClose();
    }
  };

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title="Reject Request"
      subtitle={`Reject parcel delivery from ${senderName}?`}
      icon={<Ionicons name="close-circle" size={48} color={colors.error} />}
      loading={loading}
      scrollable
      actions={
        <>
          <ModalButton
            variant="outline"
            onPress={handleClose}
            disabled={loading}
          >
            Cancel
          </ModalButton>
          <ModalButton variant="error" onPress={handleReject} loading={loading}>
            Reject Request
          </ModalButton>
        </>
      }
    >
      <View>
        {/* Quick Rejection Reasons */}
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Quick Reasons
        </Text>
        <View style={styles.quickReasonsContainer}>
          {REJECTION_REASONS.map((quickReason) => (
            <Pressable
              key={quickReason}
              style={[
                styles.quickReasonChip,
                {
                  backgroundColor:
                    selectedQuickReason === quickReason
                      ? colors.error + "20"
                      : colors.background.secondary,
                  borderColor:
                    selectedQuickReason === quickReason
                      ? colors.error
                      : colors.border.default,
                },
              ]}
              onPress={() => handleQuickReasonSelect(quickReason)}
            >
              <Text
                style={[
                  styles.quickReasonText,
                  {
                    color:
                      selectedQuickReason === quickReason
                        ? colors.error
                        : colors.text.secondary,
                    fontWeight:
                      selectedQuickReason === quickReason
                        ? Typography.weights.bold
                        : Typography.weights.medium,
                  },
                ]}
              >
                {quickReason}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Custom Reason Input */}
        {(selectedQuickReason === "Other" || selectedQuickReason === null) && (
          <>
            <Text
              style={[
                styles.label,
                { color: colors.text.primary, marginTop: Spacing.md },
              ]}
            >
              {selectedQuickReason === "Other"
                ? "Custom Reason"
                : "Or Provide Custom Reason"}{" "}
              <Text style={[styles.required, { color: colors.error }]}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: error ? colors.error : colors.border.default,
                  color: colors.text.primary,
                },
              ]}
              placeholder="Explain why you're rejecting this request..."
              placeholderTextColor={colors.text.tertiary}
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                setError("");
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </>
        )}

        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            The sender will be notified and can request from other travelers
          </Text>
        )}
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  required: {},
  quickReasonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickReasonChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  quickReasonText: {
    fontSize: Typography.sizes.sm,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    minHeight: 100,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
