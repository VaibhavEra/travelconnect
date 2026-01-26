// app/(auth)/reset-new-password.tsx
import FormInput from "@/components/auth/FormInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { NewPasswordFormData, newPasswordSchema } from "@/lib/validations/auth";
import { AuthFlowState, useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
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

export default function ResetNewPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // FIXED: Check if user has a valid recovery session
  useEffect(() => {
    if (!session) {
      Alert.alert("Invalid Session", "Please verify your reset code first.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/forgot-password"),
        },
      ]);
      return;
    }

    // FIXED: Check if reset session has expired
    if (flowState !== AuthFlowState.RESET_SESSION_ACTIVE) {
      Alert.alert("Invalid Session", "Please verify your reset code first.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/forgot-password"),
        },
      ]);
      return;
    }

    // FIXED: Check expiry timestamp
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
            onPress: () => router.replace("/(auth)/forgot-password"),
          },
        ],
      );
    }
  }, [session, flowState, flowContext]);

  // FIXED: Use extracted password strength utility
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: NewPasswordFormData) => {
    setLoading(true);
    try {
      await updatePassword(data.password.trim());
      haptics.success();
      Alert.alert(
        "Password Updated!",
        "Your password has been successfully reset. You're now logged in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/"),
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
          <View style={styles.header}>
            <Ionicons
              name="lock-closed-outline"
              size={64}
              color={Colors.primary}
            />
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below
              {flowContext?.email && (
                <Text style={styles.email}>
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
                    autoComplete="password-new"
                    textContentType="newPassword"
                    returnKeyType="next"
                    editable={!loading}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => {
                          setShowPassword(!showPassword);
                          haptics.light();
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={24}
                          color={Colors.text.secondary}
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
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  touched={touchedFields.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
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
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={24}
                        color={Colors.text.secondary}
                      />
                    </TouchableOpacity>
                  }
                />
              )}
            />

            <TouchableOpacity
              style={[
                styles.button,
                (!isValid || loading) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors.text.secondary}
            />
            <Text style={styles.infoText}>
              Password must be at least 8 characters with uppercase, lowercase,
              number, and special character
            </Text>
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
  strengthText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    fontWeight: Typography.weights.medium,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
});
