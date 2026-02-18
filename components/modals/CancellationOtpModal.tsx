// components/modals/CancellationOtpModal.tsx
import { BaseModal, ModalButton } from "@/components/shared";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface CancellationOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  senderName: string;
  requestId: string;
}

export default function CancellationOtpModal({
  visible,
  onClose,
  onVerify,
  senderName,
  requestId,
}: CancellationOtpModalProps) {
  const colors = useThemeColors();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpGenerated, setOtpGenerated] = useState(false);

  // FIX: Reset all local state when modal opens to prevent stale data
  // from a previous session leaking into a fresh open
  useEffect(() => {
    if (visible) {
      setOtp("");
      setError("");
      setOtpGenerated(false);
    }
  }, [visible]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const isValid = await onVerify(otp);

      if (isValid) {
        setOtp("");
        setOtpGenerated(false);
        // FIX: onVerify returns boolean; parent controls modal visibility
        // on success (sets cancellationOtpModalVisible(false) + Alert).
        // Do NOT call onClose() here to avoid racing with parent setState.
      } else {
        setError("Invalid OTP. Please check with the sender and try again.");
      }
    } catch (err: any) {
      console.error("Verify cancellation OTP failed:", err);
      // FIX: use exact code matching instead of fragile substring matching
      const code = err.message;
      if (code === "invalid_otp") {
        setError("Invalid OTP. Please check and try again.");
      } else if (code === "expired") {
        setError("This OTP has expired. Please contact support.");
      } else {
        setError(err.message || "Failed to verify OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOtp("");
      setError("");
      setOtpGenerated(false);
      onClose();
    }
  };

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title="Cancel Trip After Pickup"
      subtitle="Cancellation OTP has been sent to the sender"
      icon={<Ionicons name="warning" size={48} color={colors.warning} />}
      loading={loading}
      scrollable
      actions={
        <>
          <ModalButton
            variant="outline"
            onPress={handleClose}
            disabled={loading}
          >
            Go Back
          </ModalButton>
          <ModalButton
            variant="error"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== 6}
          >
            {otp.length === 6 ? "Verify & Cancel Trip" : "Enter OTP"}
          </ModalButton>
        </>
      }
    >
      <View>
        {/* Warning Notice */}
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: withOpacity(colors.warning, "subtle"),
              borderColor: colors.warning + "30",
            },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Since the parcel has been picked up, the sender must provide the
            cancellation OTP to proceed.
          </Text>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color={colors.text.tertiary} />
            <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
              Sender:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {senderName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color={colors.text.tertiary} />
            <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
              OTP Status:
            </Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>
              Sent to sender
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text
            style={[styles.instructionsTitle, { color: colors.text.primary }]}
          >
            How this works:
          </Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View
                style={[
                  styles.instructionNumber,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.instructionNumberText,
                    { color: colors.primary },
                  ]}
                >
                  1
                </Text>
              </View>
              <Text
                style={[
                  styles.instructionText,
                  { color: colors.text.secondary },
                ]}
              >
                A 6-digit OTP has been sent to {senderName}
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View
                style={[
                  styles.instructionNumber,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.instructionNumberText,
                    { color: colors.primary },
                  ]}
                >
                  2
                </Text>
              </View>
              <Text
                style={[
                  styles.instructionText,
                  { color: colors.text.secondary },
                ]}
              >
                Contact the sender and ask for the OTP
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View
                style={[
                  styles.instructionNumber,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.instructionNumberText,
                    { color: colors.primary },
                  ]}
                >
                  3
                </Text>
              </View>
              <Text
                style={[
                  styles.instructionText,
                  { color: colors.text.secondary },
                ]}
              >
                Enter the OTP below to cancel the trip
              </Text>
            </View>
          </View>
        </View>

        {/* OTP Input */}
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Cancellation OTP{" "}
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
          placeholder="000000"
          placeholderTextColor={colors.text.tertiary}
          value={otp}
          onChangeText={(text) => {
            setOtp(text.replace(/[^0-9]/g, ""));
            setError("");
          }}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          autoFocus
        />
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            Ask {senderName} to share the 6-digit OTP they received
          </Text>
        )}

        {/* Consequence Notice */}
        <View
          style={[
            styles.consequenceBox,
            {
              backgroundColor: colors.error + "10",
              borderColor: colors.error + "30",
            },
          ]}
        >
          <Ionicons name="information-circle" size={16} color={colors.error} />
          <Text style={[styles.consequenceText, { color: colors.error }]}>
            Both your trip and the linked request will be cancelled. This action
            cannot be undone.
          </Text>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  infoBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  instructionsContainer: {
    marginBottom: Spacing.md,
  },
  instructionsTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  instructionsList: {
    gap: Spacing.sm,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionNumberText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  instructionText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  required: {},
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: Typography.sizes.xxl,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: Typography.weights.bold,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  consequenceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  consequenceText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.sizes.xs * 1.5,
  },
});
