import { BaseModal, ModalButton } from "@/components/shared";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

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
  const colors = useThemeColors();
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
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title="Accept Request"
      subtitle={`Accept parcel delivery from ${senderName}?`}
      icon={
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
      }
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
          <ModalButton
            variant="success"
            onPress={handleAccept}
            loading={loading}
          >
            Accept Request
          </ModalButton>
        </>
      }
    >
      <View>
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Pickup Instructions (Optional)
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
          placeholder="Add any notes for the sender..."
          placeholderTextColor={colors.text.tertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!loading}
        />
        <Text style={[styles.hint, { color: colors.text.tertiary }]}>
          e.g., "I'll contact you 2 hours before pickup"
        </Text>
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
});
