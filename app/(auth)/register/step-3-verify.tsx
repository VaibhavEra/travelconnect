import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput from "@/components/auth/OtpInput";
import ProgressIndicator from "@/components/auth/ProgressIndicator";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { AuthFlowState, useAuthStore } from "@/stores/authStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterStep3Screen() {
  const colors = useThemeColors();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const { flowState, flowContext, verifyEmailOtp, resendEmailOtp } =
    useAuthStore();

  const email = flowContext?.email || "";

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect if no pending verification - CHECK ONLY ON MOUNT
  const hasCheckedInitialState = useRef(false);

  useEffect(() => {
    if (hasCheckedInitialState.current) return;

    hasCheckedInitialState.current = true;

    if (flowState !== AuthFlowState.SIGNUP_OTP_SENT || !email) {
      Alert.alert("Error", "No pending verification. Please register again.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/register/step-1-account"),
        },
      ]);
    }
  }, [flowState, email]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      haptics.error();
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    // Rate limit
    const rateCheck = rateLimiter.check(
      `verify-otp:${email}`,
      rateLimitConfigs.otpResend,
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
      await verifyEmailOtp(email, otp);
      haptics.success();

      Alert.alert(
        "Success! 🎉",
        "Your email has been verified. Welcome to TravelConnect!",
        [
          {
            text: "Get Started",
            onPress: () => router.replace("/(tabs)/explore"), // Will redirect properly via _layout.tsx
          },
        ],
      );
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Verification Failed", errorMessage);
      setOtp(""); // Clear OTP on error
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Rate limit
    const rateCheck = rateLimiter.check(
      `resend-otp:${email}`,
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

    setLoading(true);
    try {
      await resendEmailOtp(email);
      haptics.success();
      setResendCooldown(60);
      setOtp("");
      Alert.alert("Success", "Verification code sent to your email");
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Progress Indicator */}
      <ProgressIndicator
        currentStep={3}
        totalSteps={3}
        labels={["Account", "Profile", "Verify"]}
      />

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="mail-outline" size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Verify Your Email
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          We've sent a 6-digit code to
        </Text>
        <Text style={[styles.email, { color: colors.primary }]}>{email}</Text>
      </View>

      {/* OTP Input */}
      <View style={styles.otpContainer}>
        <OtpInput length={6} value={otp} onChange={setOtp} disabled={loading} />
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={[
          styles.verifyButton,
          { backgroundColor: colors.primary },
          (loading || otp.length !== 6) && styles.buttonDisabled,
        ]}
        onPress={handleVerify}
        disabled={loading || otp.length !== 6}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <>
            <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
              Verify Email
            </Text>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.text.inverse}
            />
          </>
        )}
      </TouchableOpacity>

      {/* Resend Section */}
      <View style={styles.resendSection}>
        <Text style={[styles.resendText, { color: colors.text.secondary }]}>
          Didn't receive the code?
        </Text>
        {resendCooldown > 0 ? (
          <Text style={[styles.timerText, { color: colors.text.tertiary }]}>
            Resend in {resendCooldown}s
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={loading}>
            <Text style={[styles.resendLink, { color: colors.primary }]}>
              {loading ? "Sending..." : "Resend Code"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Box */}
      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.background.secondary },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.text.secondary}
        />
        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Check your spam folder if you don't see the email
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    textAlign: "center",
  },
  otpContainer: {
    marginBottom: Spacing.xl,
  },
  verifyButton: {
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
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
  },
  resendLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  timerText: {
    fontSize: Typography.sizes.sm,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
});
