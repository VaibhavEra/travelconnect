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
  failedAttempts?: number | null;
  blockedUntil?: string | null;
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
  failedAttempts,
  blockedUntil,
}: VerifyOtpModalProps) {
  const colors = useThemeColors();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Brute force block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockSecondsRemaining, setBlockSecondsRemaining] = useState(0);

  const config = OTP_CONFIG[type];
  const iconColor =
    config.iconColor === "primary" ? colors.primary : colors.success;

  const MAX_ATTEMPTS = 3;
  const attempts = failedAttempts ?? 0;
  const remainingAttempts = MAX_ATTEMPTS - attempts;

  // FIX: Reset local state when modal opens so stale otp/error
  // from a previous session never leaks into a fresh open.
  useEffect(() => {
    if (visible) {
      setOtp("");
      setError("");
    }
  }, [visible]);

  // Calculate time remaining for OTP expiry
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
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [otpExpiry, type]);

  // Block countdown timer — updates every second while blocked
  useEffect(() => {
    if (!blockedUntil) {
      setIsBlocked(false);
      setBlockSecondsRemaining(0);
      return;
    }

    const updateBlockTimer = () => {
      const now = new Date().getTime();
      const unblockAt = new Date(blockedUntil).getTime();
      const diff = unblockAt - now;

      if (diff <= 0) {
        setIsBlocked(false);
        setBlockSecondsRemaining(0);
        return;
      }

      setIsBlocked(true);
      setBlockSecondsRemaining(Math.ceil(diff / 1000));
    };

    updateBlockTimer();
    const interval = setInterval(updateBlockTimer, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    if (isBlocked) {
      const mins = Math.floor(blockSecondsRemaining / 60);
      const secs = blockSecondsRemaining % 60;
      setError(
        `Too many failed attempts. Try again in ${mins}:${secs.toString().padStart(2, "0")}`,
      );
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
        // FIX: Do NOT call onClose() here.
        // Parent's handleVerifyPickupOtp / handleVerifyDeliveryOtp calls
        // setPickupOtpModalVisible(false) and shows an Alert on success.
        // Calling onClose() here would race with the parent's setState.
      } else {
        setError("Invalid or expired OTP. Please try again.");
      }
    } catch (err: any) {
      const code = err.message;

      if (code === "blocked") {
        const mins = Math.floor(blockSecondsRemaining / 60);
        const secs = blockSecondsRemaining % 60;
        setError(
          blockSecondsRemaining > 0
            ? `Too many failed attempts. Try again in ${mins}:${secs.toString().padStart(2, "0")}`
            : "Too many failed attempts. Please wait before trying again.",
        );
      } else if (code === "expired") {
        setError(
          type === "pickup"
            ? "This OTP has expired. Please contact the sender."
            : "This OTP has expired. Please contact support.",
        );
      } else if (code === "invalid_otp") {
        setError("Invalid OTP. Please check and try again.");
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

  const formatBlockTime = () => {
    const mins = Math.floor(blockSecondsRemaining / 60);
    const secs = blockSecondsRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title={config.title}
      subtitle={config.getSubtitle(userName)}
      icon={<Ionicons name={config.icon} size={48} color={iconColor} />}
      loading={loading}
      scrollable
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
            disabled={otp.length !== 6 || isExpired || isBlocked}
          >
            {isExpired
              ? "OTP Expired"
              : isBlocked
                ? "Blocked"
                : config.buttonText}
          </ModalButton>
        </>
      }
    >
      <View>
        {/* Block warning */}
        {isBlocked && (
          <View
            style={[
              styles.statusBox,
              { backgroundColor: withOpacity(colors.error, "subtle") },
            ]}
          >
            <Ionicons name="ban" size={16} color={colors.error} />
            <View style={styles.statusBoxContent}>
              <Text style={[styles.statusBoxTitle, { color: colors.error }]}>
                Too many failed attempts
              </Text>
              <Text style={[styles.statusBoxSub, { color: colors.error }]}>
                Try again in {formatBlockTime()}
              </Text>
            </View>
          </View>
        )}

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
              borderColor: error
                ? colors.error
                : isBlocked
                  ? colors.error + "50"
                  : colors.border.default,
              color: isBlocked ? colors.text.tertiary : colors.text.primary,
              opacity: isBlocked ? 0.5 : 1,
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
          editable={!loading && !isExpired && !isBlocked}
          autoFocus
        />

        {/* Error / hint / attempts */}
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : isBlocked ? null : attempts > 0 && remainingAttempts > 0 ? (
          <Text style={[styles.attemptsText, { color: colors.warning }]}>
            {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""}{" "}
            remaining
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
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  statusBoxContent: {
    flex: 1,
  },
  statusBoxTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  statusBoxSub: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
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
  attemptsText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    textAlign: "center",
    fontWeight: Typography.weights.medium,
  },
});
