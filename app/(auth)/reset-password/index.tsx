import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/auth/FormInput";
import { haptics } from "@/lib/utils/haptics";
import { useNetworkStatus } from "@/lib/utils/network";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { sanitize } from "@/lib/utils/sanitize";
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const { isOffline } = useNetworkStatus();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (isOffline) {
      haptics.error();
      Alert.alert(
        "No Internet",
        "Please check your internet connection and try again.",
      );
      return;
    }

    const rateCheck = rateLimiter.check(
      `reset-password:${data.email}`,
      rateLimitConfigs.passwordReset,
    );
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Requests",
        `Please wait ${rateCheck.retryAfter} before requesting another reset code.`,
      );
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitize.email(data.email);
      await resetPassword(sanitizedEmail);
      haptics.success();
      setEmailSent(true);
    } catch (error: any) {
      haptics.error();
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const email = getValues("email");

    const rateCheck = rateLimiter.check(
      `reset-password:${email}`,
      rateLimitConfigs.passwordReset,
    );
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Requests",
        `Please wait ${rateCheck.retryAfter} before requesting another reset code.`,
      );
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitize.email(email);
      await resetPassword(sanitizedEmail);
      haptics.success();
      Alert.alert(
        "Code Resent",
        "A new verification code has been sent to your email.",
      );
    } catch (error: any) {
      haptics.success();
      Alert.alert(
        "Code Resent",
        "A new verification code has been sent to your email.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthLayout>
        <View style={styles.successContainer}>
          <Ionicons name="mail-outline" size={64} color={colors.primary} />
          <Text style={[styles.successTitle, { color: colors.text.primary }]}>
            Check Your Email
          </Text>
          <Text
            style={[styles.successMessage, { color: colors.text.secondary }]}
          >
            We've sent a verification code to:
          </Text>
          <Text style={[styles.email, { color: colors.primary }]}>
            {getValues("email")}
          </Text>
          <Text
            style={[styles.successSubtext, { color: colors.text.secondary }]}
          >
            Enter the 6-digit code to reset your password.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.push({
                pathname: "/(auth)/reset-password/verify",
                params: { email: getValues("email") },
              });
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
              Enter Code
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.text.inverse}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleResend}
            disabled={loading}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.primary }]}
            >
              {loading ? "Sending..." : "Resend code"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setEmailSent(false);
              haptics.light();
            }}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.primary }]}
            >
              Use a different email
            </Text>
          </TouchableOpacity>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Forgot Password?
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Enter your email and we'll send you a verification code to reset your
          password
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Email"
              placeholder="you@example.com"
              value={value}
              onChangeText={(text) => onChange(sanitize.email(text))}
              onBlur={onBlur}
              error={errors.email?.message}
              touched={touchedFields.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            (loading || isOffline) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading || isOffline}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
              Send Reset Code
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>
          Remember your password?{" "}
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity
            disabled={loading}
            onPress={() => haptics.selection()}
          >
            <Text style={[styles.link, { color: colors.primary }]}>Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  form: {
    gap: Spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: Typography.sizes.sm,
  },
  link: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  successContainer: {
    alignItems: "center",
    paddingTop: Spacing.xxl,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  successMessage: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  successSubtext: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
