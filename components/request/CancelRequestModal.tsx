import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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

  const handleCancel = async () => {
    try {
      setLoading(true);
      await onCancel(reason.trim() || undefined);
      setReason("");
      onClose();
    } catch (error: any) {
      setLoading(false);
      // Error handling in parent component
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.modal, { backgroundColor: colors.background.primary }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.border.default },
            ]}
          >
            <Ionicons
              name={canCancel ? "warning" : "lock-closed"}
              size={48}
              color={canCancel ? colors.warning : colors.error}
            />
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {canCancel ? "Cancel Request" : "Cannot Cancel"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {canCancel
                ? "Are you sure you want to cancel this request?"
                : "This request cannot be cancelled"}
            </Text>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!canCancel ? (
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
              <>
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
              </>
            )}
          </ScrollView>

          <View
            style={[styles.actions, { borderTopColor: colors.border.default }]}
          >
            <Pressable
              style={[
                styles.button,
                styles.backButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: colors.border.default,
                },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text
                style={[
                  styles.backButtonText,
                  { color: colors.text.secondary },
                ]}
              >
                {canCancel ? "Go Back" : "Close"}
              </Text>
            </Pressable>

            {canCancel && (
              <Pressable
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: colors.error },
                ]}
                onPress={handleCancel}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    Cancel Request
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    maxHeight: "80%",
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
  },
  content: {
    padding: Spacing.lg,
    maxHeight: 300,
  },
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
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
