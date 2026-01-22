// app/(auth)/verify-reset-otp.tsx
import OtpInput from "@/components/auth/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { otpVerificationSchema } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
  const { verifyResetOtp, resetPassword } = useAuthStore();

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

  const onSubmit = async (data: OtpFormData) => {
    // Rate limit check
    const rateCheck = rateLimiter.check(
      `verify-reset-otp:${email}`,
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
      haptics.success();
      // Navigate to new password screen
      router.replace("./reset-new-password");
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
      `resend-reset-otp:${email}`,
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
          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn't receive the code? </Text>
            <TouchableOpacity
              disabled={resending || loading}
              onPress={handleResend}
            >
              <Text
                style={[
                  styles.link,
                  (resending || loading) && styles.linkDisabled,
                ]}
              >
                {resending ? "Sending..." : "Resend"}
              </Text>
            </TouchableOpacity>
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
    justifyContent: "center",
    padding: Spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: Spacing.lg,
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl - 8,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  link: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
