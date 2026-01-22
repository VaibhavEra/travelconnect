// app/(auth)/verify-otp.tsx
import OtpInput from "@/components/auth/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { useAuthStore } from "@/stores/authStore";
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

const isDev = __DEV__;

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { pendingVerification, verifyEmailOtp, resendEmailOtp } =
    useAuthStore();

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Redirect if no pending verification
  useEffect(() => {
    if (!pendingVerification) {
      if (isDev) {
        console.log(
          "[VerifyOTP] No pending verification, redirecting to login",
        );
      }
      router.replace("/(auth)/login");
    } else {
      if (isDev) {
        console.log(
          "[VerifyOTP] Pending verification found:",
          pendingVerification,
        );
      }
    }
  }, [pendingVerification]);

  if (!pendingVerification) {
    return null;
  }

  const handleVerify = async () => {
    if (otp.length !== 6) {
      haptics.error();
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      if (isDev) {
        console.log(
          "[VerifyOTP] Verifying OTP for:",
          pendingVerification.email,
        );
      }

      await verifyEmailOtp(pendingVerification.email, otp);
      haptics.success();

      if (isDev) {
        console.log("[VerifyOTP] Email verified successfully");
      }

      Alert.alert("Success!", "Your email has been verified successfully.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      haptics.error();

      if (isDev) {
        console.log("[VerifyOTP] Verification failed:", error);
      }

      const errorMessage = parseSupabaseError(error);
      Alert.alert("Verification Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      if (isDev) {
        console.log("[VerifyOTP] Resending OTP to:", pendingVerification.email);
      }

      await resendEmailOtp(pendingVerification.email);
      haptics.success();
      setResendTimer(60);
      setCanResend(false);
      setOtp(""); // Clear OTP input
      Alert.alert("Success", "Verification code sent to your email");

      if (isDev) {
        console.log("[VerifyOTP] OTP resent successfully");
      }
    } catch (error: any) {
      haptics.error();

      if (isDev) {
        console.log("[VerifyOTP] Resend failed:", error);
      }

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
          <Text style={styles.email}>{pendingVerification.email}</Text>
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
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend available in {resendTimer}s
            </Text>
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
    paddingTop: 60,
    backgroundColor: Colors.background.primary,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl - 8,
  },
  title: {
    fontSize: Typography.sizes.xxl - 4,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  email: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  otpContainer: {
    marginBottom: Spacing.lg,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
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
    marginBottom: Spacing.lg,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
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
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
