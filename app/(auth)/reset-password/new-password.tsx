import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/auth/FormInput";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { haptics } from "@/lib/utils/haptics";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { NewPasswordFormData, newPasswordSchema } from "@/lib/validations/auth";
import { AuthFlowState, useAuthStore } from "@/stores/authStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function ResetNewPasswordScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const confirmPasswordRef = useRef<TextInput>(null);

  const { session, flowState, flowContext, updatePassword } = useAuthStore();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, touchedFields, isValid },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const passwordStrength = getPasswordStrength(password);

  // Check if user has a valid recovery session
  useEffect(() => {
    if (!session) {
      Alert.alert("Invalid Session", "Please verify your reset code first.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/reset-password"),
        },
      ]);
      return;
    }

    if (flowState !== AuthFlowState.RESET_SESSION_ACTIVE) {
      Alert.alert("Invalid Session", "Please verify your reset code first.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/reset-password"),
        },
      ]);
      return;
    }

    // Check expiry timestamp
    if (
      flowContext?.resetSessionExpiry &&
      Date.now() > flowContext.resetSessionExpiry
    ) {
      Alert.alert(
        "Session Expired",
        "Your reset session has expired. Please request a new code.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/reset-password"),
          },
        ],
      );
    }
  }, [session, flowState, flowContext]);

  const onSubmit = async (data: NewPasswordFormData) => {
    setLoading(true);
    try {
      await updatePassword(data.password.trim());
      haptics.success();
      Alert.alert(
        "Password Updated! 🎉",
        "Your password has been successfully reset. You're now logged in.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)/explore"), // FIXED
          },
        ],
      );
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
      <View style={styles.header}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Create New Password
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Enter your new password below
          {flowContext?.email && (
            <Text style={[styles.email, { color: colors.primary }]}>
              {"\n"}for {flowContext.email}
            </Text>
          )}
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <FormInput
                label="New Password"
                placeholder="Enter new password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                touched={touchedFields.password}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="next"
                editable={!loading}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                }
              />

              {passwordStrength.text && value && (
                <Text
                  style={[
                    styles.strengthText,
                    { color: passwordStrength.color },
                  ]}
                >
                  Password strength: {passwordStrength.text}
                </Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              ref={confirmPasswordRef}
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              touched={touchedFields.confirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={handleSubmit(onSubmit)}
              rightIcon={
                <TouchableOpacity
                  onPress={() => {
                    setShowConfirmPassword(!showConfirmPassword);
                    haptics.light();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              }
            />
          )}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            (!isValid || loading) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
                Update Password
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.text.inverse}
              />
            </>
          )}
        </TouchableOpacity>
      </View>

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
          Password must be at least 8 characters with uppercase, lowercase,
          number, and special character
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
  },
  email: {
    fontWeight: Typography.weights.semibold,
  },
  form: {
    gap: Spacing.md,
  },
  strengthText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
});
