import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/auth/FormInput";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { haptics } from "@/lib/utils/haptics";
import { useNetworkStatus } from "@/lib/utils/network";
import { sanitize } from "@/lib/utils/sanitize";
import { LoginFormData, loginSchema } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const signIn = useAuthStore((state) => state.signIn);
  const checkAccountLocked = useAuthStore((state) => state.checkAccountLocked);
  const recordFailedLogin = useAuthStore((state) => state.recordFailedLogin);
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
    if (isOffline) {
      haptics.error();
      Alert.alert(
        "No Internet",
        "Please check your internet connection and try again.",
      );
      return;
    }

    setLoading(true);
    const sanitizedEmail = sanitize.email(data.email);

    try {
      await signIn(sanitizedEmail, data.password.trim());
      haptics.success();
      // Navigation handled by root layout
    } catch (error: any) {
      haptics.error();

      // Check for unverified email error
      if (
        error.message === "EMAIL_NOT_VERIFIED" ||
        error.name === "EmailNotVerifiedError"
      ) {
        const { flowContext } = useAuthStore.getState();

        if (flowContext?.email) {
          Alert.alert(
            "Email Not Verified",
            "Please verify your email to continue.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Verify Now",
                onPress: () => router.push("/(auth)/register/step-3-verify"),
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

      // Record failed login attempt
      await recordFailedLogin(sanitizedEmail);

      // Check if account should be locked
      const isLocked = await checkAccountLocked(sanitizedEmail);

      if (isLocked) {
        Alert.alert(
          "Account Locked",
          "Too many failed login attempts. Please try again in 15 minutes or reset your password.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Reset Password",
              onPress: () => router.push("/(auth)/reset-password"),
            },
          ],
        );
      } else {
        const errorMessage = parseSupabaseError(error);
        Alert.alert("Login Failed", errorMessage);
      }

      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Login to your account
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
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              touched={touchedFields.password}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
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
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              }
            />
          )}
        />

        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            router.push("/(auth)/reset-password");
          }}
          disabled={loading}
          style={styles.forgotPassword}
        >
          <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

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
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>
          Don't have an account?{" "}
        </Text>
        <Link href="/(auth)/register/step-1-account" asChild>
          <TouchableOpacity
            disabled={loading}
            onPress={() => haptics.selection()}
          >
            <Text style={[styles.link, { color: colors.primary }]}>
              Sign Up
            </Text>
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
    fontSize: Typography.sizes.md,
  },
  form: {
    gap: Spacing.md,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -Spacing.xs,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  button: {
    paddingVertical: Spacing.md + 4,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
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
});
