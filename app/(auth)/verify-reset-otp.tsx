import OtpInput from "@/components/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { otpVerificationSchema } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
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
      rateLimitConfigs.login,
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
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="mail-outline" size={64} color="#007AFF" />
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
                <ActivityIndicator color="#fff" />
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
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontWeight: "600",
    color: "#007AFF",
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  link: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
