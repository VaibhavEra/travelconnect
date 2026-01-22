// app/(auth)/login.tsx
import FormInput from "@/components/auth/FormInput";
import OfflineNotice from "@/components/shared/OfflineNotice";
import { haptics } from "@/lib/utils/haptics";
import { useNetworkStatus } from "@/lib/utils/network";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { sanitize } from "@/lib/utils/sanitize";
import { LoginFormData, loginSchema } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const signIn = useAuthStore((state) => state.signIn);
  const checkAccountLocked = useAuthStore((state) => state.checkAccountLocked);
  const recordFailedLogin = useAuthStore((state) => state.recordFailedLogin);
  const clearFailedAttempts = useAuthStore(
    (state) => state.clearFailedAttempts,
  );
  const { isOffline } = useNetworkStatus();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    // Check network
    if (isOffline) {
      haptics.error();
      Alert.alert(
        "No Internet",
        "Please check your internet connection and try again.",
      );
      return;
    }

    // REMOVED: Client-side rate limiter
    // Database handles lockout now

    setLoading(true);
    const sanitizedEmail = sanitize.email(data.email);

    try {
      // Attempt login FIRST
      await signIn(sanitizedEmail, data.password.trim());

      // Login successful - navigate (clearFailedAttempts now in signIn)
      haptics.success();
      router.replace("/");
    } catch (error: any) {
      haptics.error();

      // Check for unverified email error
      if (
        error.message === "EMAIL_NOT_VERIFIED" ||
        error.name === "EmailNotVerifiedError"
      ) {
        const { pendingVerification } = useAuthStore.getState();

        if (pendingVerification) {
          Alert.alert(
            "Email Not Verified",
            "Please verify your email to continue.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Verify Now",
                onPress: () => router.push("/(auth)/verify-otp"),
              },
            ],
          );
        } else {
          Alert.alert(
            "Email Not Verified",
            "Please check your email for the verification code and complete registration.",
          );
        }
        setLoading(false);
        return;
      }

      // Record failed login attempt AFTER login fails
      await recordFailedLogin(sanitizedEmail);

      // NOW check if account should be locked
      const isLocked = await checkAccountLocked(sanitizedEmail);

      if (isLocked) {
        Alert.alert(
          "Account Locked",
          "Too many failed login attempts. Please try again in 15 minutes or reset your password.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Reset Password",
              onPress: () => router.push("/(auth)/forgot-password"),
            },
          ],
        );
      } else {
        // Generic error message (doesn't reveal if email exists)
        const errorMessage = parseSupabaseError(error);
        Alert.alert("Login Failed", errorMessage);
      }

      setLoading(false);
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your account</Text>
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
                  returnKeyType="next"
                  editable={!loading}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  ref={passwordRef}
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={(text) => onChange(text.trim())}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  touched={touchedFields.password}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  returnKeyType="done"
                  editable={!loading}
                  onSubmitEditing={handleSubmit(onSubmit)}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => {
                        setShowPassword(!showPassword);
                        haptics.light();
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={24}
                        color={Colors.text.secondary}
                      />
                    </TouchableOpacity>
                  }
                />
              )}
            />

            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                router.push("/(auth)/forgot-password");
              }}
              disabled={loading}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

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
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity
                disabled={loading}
                onPress={() => haptics.selection()}
              >
                <Text style={styles.link}>Sign Up</Text>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.xl,
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
  },
  form: {
    marginBottom: Spacing.lg,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
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
});
