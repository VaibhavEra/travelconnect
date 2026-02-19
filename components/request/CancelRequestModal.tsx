// components/request/CancelRequestModal.tsx
import { BaseModal, ModalButton } from "@/components/shared";
import { logger } from "@/lib/utils/logger";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface CancelRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onCancel: (reason?: string) => Promise<void>;
  requestStatus: string;
}

export default function CancelRequestModal({
  visible,
  onClose,
  onCancel,
  requestStatus,
}: CancelRequestModalProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Backend allows cancellation for pending and accepted requests only
  const canCancel = requestStatus === "pending" || requestStatus === "accepted";

  // FIX: Reset reason when modal opens — prevents stale text from previous open
  useEffect(() => {
    if (visible) {
      setReason("");
    }
  }, [visible]);

  const handleCancel = async () => {
    try {
      setLoading(true);
      await onCancel(reason.trim() || undefined);
      setReason("");
      onClose();
    } catch (error) {
      // Error display handled in parent component
      logger.error("Cancel request failed", error, {
        module: "CancelRequestModal",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      onClose();
    }
  };

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title={canCancel ? "Cancel Request" : "Cannot Cancel"}
      subtitle={
        canCancel
          ? "Are you sure you want to cancel this request?"
          : "This request cannot be cancelled"
      }
      icon={
        <Ionicons
          name={canCancel ? "warning" : "lock-closed"}
          size={48}
          color={canCancel ? colors.warning : colors.error}
        />
      }
      loading={loading}
      scrollable
      actions={
        <>
          <ModalButton
            variant="outline"
            onPress={handleClose}
            disabled={loading}
          >
            {canCancel ? "Go Back" : "Close"}
          </ModalButton>
          {canCancel && (
            <ModalButton
              variant="error"
              onPress={handleCancel}
              loading={loading}
            >
              Cancel Request
            </ModalButton>
          )}
        </>
      }
    >
      {!canCancel ? (
        // Cannot cancel state — just a warning, no input
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: colors.error + "10",
              borderColor: colors.error + "30",
            },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.warningText, { color: colors.error }]}>
            Requests can only be cancelled before pickup. This request has
            already been picked up and cannot be cancelled directly.
          </Text>
        </View>
      ) : (
        // Can cancel state — optional reason input
        <View>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            Reason (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background.secondary,
                borderColor: colors.border.default,
                color: colors.text.primary,
              },
            ]}
            placeholder="Why are you cancelling? (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!loading}
            maxLength={200}
          />
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            Providing a reason helps improve our service
          </Text>
        </View>
      )}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    minHeight: 80,
    marginBottom: Spacing.sm,
  },
  hint: {
    fontSize: Typography.sizes.xs,
  },
});
