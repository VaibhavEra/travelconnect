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

interface AcceptRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: (notes?: string) => Promise<void>;
  senderName: string;
}

export default function AcceptRequestModal({
  visible,
  onClose,
  onAccept,
  senderName,
}: AcceptRequestModalProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    try {
      setLoading(true);
      await onAccept(notes.trim() || undefined);
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Accept request failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNotes("");
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
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={Colors.success}
            />
            <Text style={styles.title}>Accept Request</Text>
            <Text style={styles.subtitle}>
              Accept parcel delivery from {senderName}?
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Pickup Instructions (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Add any notes for the sender..."
              placeholderTextColor={Colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={styles.hint}>
              e.g., "I'll contact you 2 hours before pickup"
            </Text>
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
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept Request</Text>
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
  hint: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
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
  acceptButton: {
    backgroundColor: Colors.success,
  },
  acceptButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
