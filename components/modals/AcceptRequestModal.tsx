// components/modals/AcceptRequestModal.tsx
import { BaseModal, ModalButton } from "@/components/shared";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface AcceptRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => Promise<void>; // UPDATED: No notes parameter
  senderName: string;
  // NEW: Add request data for verification display
  category: string;
  tripCapacity: string;
}

export default function AcceptRequestModal({
  visible,
  onClose,
  onAccept,
  senderName,
  category,
  tripCapacity,
}: AcceptRequestModalProps) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);

  // UPDATED: Removed notes state

  const handleAccept = async () => {
    try {
      setLoading(true);
      await onAccept(); // UPDATED: No notes parameter
      onClose();
    } catch (error) {
      console.error("Accept request failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Get category label
  const categoryConfig =
    CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
  const categoryLabel = categoryConfig?.label || category;

  // Get capacity label
  const capacityLabel = getSizeCapacityLabel(tripCapacity);

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
      {/* NEW: Verification Information */}
      <View style={styles.verificationSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Verification Details
        </Text>
        <Text style={[styles.sectionHint, { color: colors.text.tertiary }]}>
          Ensure the parcel matches these details before accepting
        </Text>

        <View
          style={[
            styles.verificationBox,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          {/* Trip Capacity */}
          <View style={styles.verificationRow}>
            <View style={styles.verificationLabelContainer}>
              <Ionicons name="cube" size={16} color={colors.text.tertiary} />
              <Text
                style={[
                  styles.verificationLabel,
                  { color: colors.text.tertiary },
                ]}
              >
                Your Trip Capacity
              </Text>
            </View>
            <View
              style={[
                styles.verificationValueChip,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Text
                style={[styles.verificationValue, { color: colors.primary }]}
              >
                {capacityLabel}
              </Text>
            </View>
          </View>

          {/* Request Category */}
          <View style={styles.verificationRow}>
            <View style={styles.verificationLabelContainer}>
              <Ionicons
                name={categoryConfig?.icon || "cube"}
                size={16}
                color={colors.text.tertiary}
              />
              <Text
                style={[
                  styles.verificationLabel,
                  { color: colors.text.tertiary },
                ]}
              >
                Request Category
              </Text>
            </View>
            <View
              style={[
                styles.verificationValueChip,
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Text
                style={[styles.verificationValue, { color: colors.success }]}
              >
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View
          style={[
            styles.infoNote,
            {
              backgroundColor: colors.primary + "10",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <Ionicons
            name="information-circle"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.infoNoteText, { color: colors.primary }]}>
            After acceptance, a pickup OTP will be generated and sent to the
            sender. Your trip will be locked.
          </Text>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  verificationSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm,
  },
  verificationBox: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  verificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verificationLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  verificationLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  verificationValueChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  verificationValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  infoNoteText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.sizes.xs * 1.5,
  },
});
