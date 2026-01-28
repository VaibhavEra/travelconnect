import { BaseModal, ModalButton } from "@/components/shared";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface RejectRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  senderName: string;
}

export default function RejectRequestModal({
  visible,
  onClose,
  onReject,
  senderName,
}: RejectRequestModalProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      onClose();
    } catch (error) {
      console.error("Reject request failed:", error);
      setError("Failed to reject request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
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
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Reason for Rejection{" "}
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
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            e.g., "Item too large", "Category not allowed", etc.
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
