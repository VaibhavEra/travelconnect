import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput from "@/components/auth/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { AuthFlowState, useAuthStore } from "@/stores/authStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function VerifyResetOtpScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const { verifyResetOtp, resetPassword } = useAuthStore();

  useEffect(() => {
    if (!email || !email.includes("@")) {
      Alert.alert(
        "Invalid Request",
        "Please start from forgot password screen.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/reset-password"),
          },
        ],
      );
    }
  }, [email]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async () => {
    if (otp.length !== 6) {
      haptics.error();
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    const rateCheck = rateLimiter.check(
      `reset-otp-flow:${email}`,
      rateLimitConfigs.passwordReset,
    );
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Attempts",
        `Please wait ${rateCheck.retryAfter} before trying again.`,
      );
      return;
    }

    setLoading(true);
    try {
      await verifyResetOtp(email, otp);

      const { flowState: newFlowState } = useAuthStore.getState();
      if (newFlowState !== AuthFlowState.RESET_SESSION_ACTIVE) {
        throw new Error("Reset session not established");
      }

      haptics.success();
      router.replace("/(auth)/reset-password/new-password");
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Verification Failed", errorMessage);
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const rateCheck = rateLimiter.check(
      `reset-otp-flow:${email}`,
      rateLimitConfigs.otpResend,
    );
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Requests",
        `Please wait ${rateCheck.retryAfter} before requesting another code.`,
      );
      return;
    }

    setResending(true);
    try {
      await resetPassword(email);
      haptics.success();
      setResendCooldown(60);
      setOtp("");
      Alert.alert(
        "Code Resent",
        "A new verification code has been sent to your email.",
      );
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Error", errorMessage);
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    haptics.light();
    router.back();
  };

  return (
    <AuthLayout showBackButton>
      {/* Back Button */}
      <TouchableOpacity
        style={[
          styles.backButton,
          { backgroundColor: colors.background.secondary },
        ]}
        onPress={handleBack}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Ionicons name="mail-outline" size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Verify Code
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Enter the 6-digit code sent to{"\n"}
          <Text style={[styles.email, { color: colors.primary }]}>{email}</Text>
        </Text>
      </View>

      <View style={styles.otpContainer}>
        <OtpInput length={6} value={otp} onChange={setOtp} disabled={loading} />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          (loading || otp.length !== 6) && styles.buttonDisabled,
        ]}
        onPress={onSubmit}
        disabled={loading || otp.length !== 6}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <>
            <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
              Verify Code
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.text.inverse}
            />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.resendSection}>
        <Text style={[styles.resendText, { color: colors.text.secondary }]}>
          Didn't receive the code?{" "}
        </Text>
        {resendCooldown > 0 ? (
          <Text style={[styles.timerText, { color: colors.text.tertiary }]}>
            Resend in {resendCooldown}s
          </Text>
        ) : (
          <TouchableOpacity
            disabled={resending || loading}
            onPress={handleResend}
          >
            <Text
              style={[
                styles.resendLink,
                { color: colors.primary },
                (resending || loading) && styles.linkDisabled,
              ]}
            >
              {resending ? "Sending..." : "Resend"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
  },
  email: {
    fontWeight: Typography.weights.semibold,
  },
  otpContainer: {
    marginBottom: Spacing.xl,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  resendSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
  },
  resendLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  timerText: {
    fontSize: Typography.sizes.sm,
  },
});
