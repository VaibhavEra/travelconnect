import { BaseModal, ModalButton } from "@/components/shared";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface VerifyOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  type: "pickup" | "delivery";
  userName: string;
  otpExpiry?: string;
}

const OTP_CONFIG = {
  pickup: {
    icon: "key" as const,
    iconColor: "primary" as const,
    title: "Verify Pickup OTP",
    getSubtitle: (name: string) =>
      `Ask ${name} for the 6-digit OTP to confirm pickup`,
    buttonText: "Verify & Pickup",
    expiryContext: "The sender received this OTP when you accepted the request",
  },
  delivery: {
    icon: "checkmark-circle" as const,
    iconColor: "success" as const,
    title: "Verify Delivery OTP",
    getSubtitle: (name: string) =>
      `Ask ${name} for the 6-digit OTP to confirm delivery`,
    buttonText: "Verify & Deliver",
    expiryContext:
      "The receiver received this OTP when you picked up the parcel",
  },
};

export default function VerifyOtpModal({
  visible,
  onClose,
  onVerify,
  type,
  userName,
  otpExpiry,
}: VerifyOtpModalProps) {
  const colors = useThemeColors();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const config = OTP_CONFIG[type];
  const iconColor =
    config.iconColor === "primary" ? colors.primary : colors.success;

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

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Expiring soon threshold based on type
      const threshold = type === "pickup" ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
      setIsExpiringSoon(diff < threshold);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [otpExpiry, type]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    if (isExpired) {
      setError(
        type === "pickup"
          ? "This OTP has expired. Please contact the sender."
          : "This OTP has expired. Please contact support.",
      );
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
      console.error(`Verify ${type} OTP failed:`, error);

      if (error.message?.includes("expired")) {
        setError(
          type === "pickup"
            ? "This OTP has expired. Please contact the sender."
            : "This OTP has expired. Please contact support.",
        );
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

  const getExpiryBoxColor = () => {
    if (isExpired) return withOpacity(colors.error, "subtle");
    if (isExpiringSoon) return withOpacity(colors.warning, "subtle");
    return withOpacity(colors.success, "subtle");
  };

  const getExpiryTextColor = () => {
    if (isExpired) return colors.error;
    if (isExpiringSoon) return colors.warning;
    return colors.success;
  };

  const getExpiryIcon = () => {
    if (isExpired) return "close-circle";
    if (isExpiringSoon) return "time";
    return "checkmark-circle";
  };

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title={config.title}
      subtitle={config.getSubtitle(userName)}
      icon={<Ionicons name={config.icon} size={48} color={iconColor} />}
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
            variant={type === "pickup" ? "primary" : "success"}
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== 6 || isExpired}
          >
            {isExpired ? "OTP Expired" : config.buttonText}
          </ModalButton>
        </>
      }
    >
      <View>
        {/* OTP Expiry Info */}
        {otpExpiry && timeRemaining && (
          <View
            style={[styles.expiryBox, { backgroundColor: getExpiryBoxColor() }]}
          >
            <Ionicons
              name={getExpiryIcon()}
              size={16}
              color={getExpiryTextColor()}
            />
            <Text style={[styles.expiryText, { color: getExpiryTextColor() }]}>
              {isExpired ? "OTP Expired" : `Valid for ${timeRemaining}`}
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.text.primary }]}>
          Enter OTP{" "}
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
          editable={!loading && !isExpired}
          autoFocus
        />
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            {config.expiryContext}
          </Text>
        )}
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  expiryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  expiryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
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
});
