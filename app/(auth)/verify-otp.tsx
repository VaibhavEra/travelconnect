// app/(auth)/verify-otp.tsx
import OtpInput from "@/components/auth/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { AuthFlowState, useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const { flowState, flowContext, verifyEmailOtp, resendEmailOtp } =
    useAuthStore();

  // FIXED: Destructure email with type safety
  const email = flowContext?.email || "";

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect if no pending verification
  useEffect(() => {
    if (flowState !== AuthFlowState.SIGNUP_OTP_SENT || !email) {
      router.replace("/(auth)/login");
    }
  }, [flowState, email]);

  if (flowState !== AuthFlowState.SIGNUP_OTP_SENT || !email) {
    return null;
  }

  const handleVerify = async () => {
    if (otp.length !== 6) {
      haptics.error();
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    // Rate limit check
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

      Alert.alert("Success!", "Your email has been verified successfully.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Verification Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Rate limit check
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
      setOtp(""); // Clear OTP input
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
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="mail-outline" size={64} color={Colors.primary} />
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <OtpInput
            length={6}
            value={otp}
            onChange={setOtp}
            disabled={loading}
          />
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (loading || otp.length !== 6) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendSection}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          {resendCooldown > 0 ? (
            <Text style={styles.timerText}>
              Resend available in {resendCooldown}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendLink}>
                {loading ? "Sending..." : "Resend Code"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.text.secondary}
          />
          <Text style={styles.infoText}>
            Check your spam folder if you don't see the email
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    backgroundColor: Colors.background.primary,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    textAlign: "center",
  },
  otpContainer: {
    marginBottom: Spacing.xl,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  resendSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  resendLink: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  timerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },
});
