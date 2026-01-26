// app/(auth)/verify-reset-otp.tsx
import OtpInput from "@/components/auth/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { otpVerificationSchema } from "@/lib/validations/auth";
import { AuthFlowState, useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

type OtpFormData = z.infer<typeof otpVerificationSchema>;

export default function VerifyResetOtpScreen() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const { verifyResetOtp, resetPassword, flowState } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpVerificationSchema),
    mode: "onChange",
    defaultValues: {
      emailOtp: "",
    },
  });

  // FIXED: Validate email param exists
  useEffect(() => {
    if (!email || !email.includes("@")) {
      Alert.alert(
        "Invalid Request",
        "Please start from forgot password screen.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/forgot-password"),
          },
        ],
      );
    }
  }, [email]);

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

  const onSubmit = async (data: OtpFormData) => {
    // Rate limit check
    const rateCheck = rateLimiter.check(
      `reset-otp-flow:${email}`, // FIXED: Unified key
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
      await verifyResetOtp(email, data.emailOtp);

      // FIXED: Verify session was established
      const { flowState: newFlowState } = useAuthStore.getState();
      if (newFlowState !== AuthFlowState.RESET_SESSION_ACTIVE) {
        throw new Error("Reset session not established");
      }

      haptics.success();
      // Navigate to new password screen
      router.replace("/(auth)/reset-new-password");
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
      `reset-otp-flow:${email}`, // FIXED: Same key as verify
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.back();
              haptics.light();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="mail-outline" size={64} color={Colors.primary} />
            <Text style={styles.title}>Verify Code</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={styles.email}>{email}</Text>
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Verification Code</Text>
            <Controller
              control={control}
              name="emailOtp"
              render={({ field: { onChange, value } }) => (
                <OtpInput
                  length={6}
                  value={value}
                  onChange={onChange}
                  disabled={loading}
                  error={!!errors.emailOtp}
                />
              )}
            />

            {errors.emailOtp && (
              <Text style={styles.errorText}>{errors.emailOtp.message}</Text>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Resend */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {resendCooldown > 0 ? (
              <Text style={styles.timerText}>Resend in {resendCooldown}s</Text>
            ) : (
              <TouchableOpacity
                disabled={resending || loading}
                onPress={handleResend}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (resending || loading) && styles.linkDisabled,
                  ]}
                >
                  {resending ? "Sending..." : "Resend"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
    zIndex: 1,
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
  },
  email: {
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  form: {
    gap: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: -Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  resendLink: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  timerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
  },
});
