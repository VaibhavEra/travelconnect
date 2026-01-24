import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons name="close-circle" size={48} color={Colors.error} />
            <Text style={styles.title}>Reject Request</Text>
            <Text style={styles.subtitle}>
              Reject parcel delivery from {senderName}?
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>
              Reason for Rejection <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="Explain why you're rejecting this request..."
              placeholderTextColor={Colors.text.tertiary}
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
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hint}>
                e.g., "Item too large", "Category not allowed", etc.
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.rejectButton]}
              onPress={handleReject}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={styles.rejectButtonText}>Reject Request</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    minHeight: 100,
  },
  inputError: {
    borderColor: Colors.error,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  rejectButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
