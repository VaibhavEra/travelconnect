import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface VerifyPickupOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  senderName: string;
  otpExpiry?: string; // NEW: ISO timestamp of when OTP expires
}

export default function VerifyPickupOtpModal({
  visible,
  onClose,
  onVerify,
  senderName,
  otpExpiry, // NEW
}: VerifyPickupOtpModalProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!otpExpiry) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(otpExpiry).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        setIsExpired(true);
        setIsExpiringSoon(false);
        return;
      }

      // Calculate hours and minutes
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Show warning if less than 1 hour remaining
      setIsExpiringSoon(diff < 60 * 60 * 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [otpExpiry]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    if (isExpired) {
      setError("This OTP has expired. Please contact the sender.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const isValid = await onVerify(otp);

      if (isValid) {
        setOtp("");
        onClose();
      } else {
        setError("Invalid or expired OTP. Please try again.");
      }
    } catch (error: any) {
      console.error("Verify pickup OTP failed:", error);

      // Better error messages
      if (error.message?.includes("expired")) {
        setError("This OTP has expired. Please contact the sender.");
      } else if (error.message?.includes("Invalid")) {
        setError("Invalid OTP. Please check and try again.");
      } else {
        setError(error.message || "Failed to verify OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOtp("");
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
            <Ionicons name="key" size={48} color={Colors.primary} />
            <Text style={styles.title}>Verify Pickup OTP</Text>
            <Text style={styles.subtitle}>
              Ask {senderName} for the 6-digit OTP to confirm pickup
            </Text>
          </View>

          <View style={styles.content}>
            {/* OTP Expiry Info */}
            {otpExpiry && timeRemaining && (
              <View
                style={[
                  styles.expiryBox,
                  isExpired && styles.expiryBoxExpired,
                  isExpiringSoon && !isExpired && styles.expiryBoxWarning,
                ]}
              >
                <Ionicons
                  name={
                    isExpired
                      ? "close-circle"
                      : isExpiringSoon
                        ? "time"
                        : "checkmark-circle"
                  }
                  size={16}
                  color={
                    isExpired
                      ? Colors.error
                      : isExpiringSoon
                        ? Colors.warning
                        : Colors.success
                  }
                />
                <Text
                  style={[
                    styles.expiryText,
                    isExpired && styles.expiryTextExpired,
                    isExpiringSoon && !isExpired && styles.expiryTextWarning,
                  ]}
                >
                  {isExpired ? "OTP Expired" : `Valid for ${timeRemaining}`}
                </Text>
              </View>
            )}

            <Text style={styles.label}>
              Enter OTP <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="000000"
              placeholderTextColor={Colors.text.tertiary}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9]/g, ""));
                setError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading && !isExpired}
              autoFocus
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hint}>
                The sender received this OTP when you accepted the request
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
              style={[
                styles.button,
                styles.verifyButton,
                isExpired && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={loading || otp.length !== 6 || isExpired}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {isExpired ? "OTP Expired" : "Verify & Pickup"}
                </Text>
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
  expiryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.success + "10",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  expiryBoxWarning: {
    backgroundColor: Colors.warning + "10",
  },
  expiryBoxExpired: {
    backgroundColor: Colors.error + "10",
  },
  expiryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.success,
  },
  expiryTextWarning: {
    color: Colors.warning,
  },
  expiryTextExpired: {
    color: Colors.error,
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
    fontSize: Typography.sizes.xxl,
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: Typography.weights.bold,
  },
  inputError: {
    borderColor: Colors.error,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: "center",
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
  verifyButton: {
    backgroundColor: Colors.primary,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
  },
  verifyButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
