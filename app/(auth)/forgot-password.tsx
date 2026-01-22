// app/(auth)/forgot-password.tsx
import FormInput from "@/components/auth/FormInput";
import OfflineNotice from "@/components/shared/OfflineNotice";
import { haptics } from "@/lib/utils/haptics";
import { useNetworkStatus } from "@/lib/utils/network";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { sanitize } from "@/lib/utils/sanitize";
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
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

export default function ForgotPasswordScreen() {
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
    // Check network
    if (isOffline) {
      haptics.error();
      Alert.alert(
        "No Internet",
        "Please check your internet connection and try again.",
      );
      return;
    }

    // Rate limiting check (prevent spam)
    const rateCheck = rateLimiter.check(
      `reset-password:${data.email}`,
      rateLimitConfigs.passwordReset,
    );
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Requests",
        `Please wait ${rateCheck.retryAfter} seconds before requesting another reset code.`,
      );
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitize.email(data.email);
      await resetPassword(sanitizedEmail);
      haptics.success();

      // Always show success (don't reveal if email exists - security)
      setEmailSent(true);
    } catch (error: any) {
      haptics.error();

      // Don't reveal if email doesn't exist (prevents email enumeration)
      // Always show success to user
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const email = getValues("email");

    // Rate limit resend attempts
    const rateCheck = rateLimiter.check(
      `reset-password:${email}`,
      rateLimitConfigs.passwordReset,
    );
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Requests",
        `Please wait ${rateCheck.retryAfter} seconds before requesting another reset code.`,
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
      // Still show success (don't reveal email existence)
      haptics.success();
      Alert.alert(
        "Code Sent",
        "If an account exists, you'll receive a verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <OfflineNotice />
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <Ionicons name="mail-outline" size={64} color={Colors.primary} />
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successMessage}>
              We've sent a verification code to:
            </Text>
            <Text style={styles.email}>{getValues("email")}</Text>
            <Text style={styles.successSubtext}>
              Enter the 6-digit code to reset your password.
            </Text>

            {/* UPDATED: Navigate to verify-reset-otp */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                router.push({
                  pathname: "./verify-reset-otp",
                  params: { email: getValues("email") },
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Enter Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={loading}
            >
              <Text style={styles.resendText}>
                {loading ? "Sending..." : "Resend code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                setEmailSent(false);
                haptics.light();
              }}
            >
              <Text style={styles.resendText}>Use a different email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <OfflineNotice />
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
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a verification code to reset
              your password
            </Text>
          </View>

          {/* Form */}
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
                (loading || isOffline) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading || isOffline}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                disabled={loading}
                onPress={() => haptics.selection()}
              >
                <Text style={styles.link}>Login</Text>
              </TouchableOpacity>
            </Link>
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
    marginBottom: Spacing.xxl - 8,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
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
  successContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xxl - 8,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl - 4,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm + 4,
  },
  successMessage: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  successSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  resendButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  resendText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
