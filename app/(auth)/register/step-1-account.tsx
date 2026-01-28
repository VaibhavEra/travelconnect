import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/auth/FormInput";
import ProgressIndicator from "@/components/auth/ProgressIndicator";
import { availabilityCheck } from "@/lib/utils/availabilityCheck";
import { haptics } from "@/lib/utils/haptics";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { sanitize } from "@/lib/utils/sanitize";
import {
  RegisterStep1FormData,
  registerStep1Schema,
} from "@/lib/validations/auth";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterStep1Screen() {
  const colors = useThemeColors();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email availability check
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isValid },
  } = useForm<RegisterStep1FormData>({
    resolver: zodResolver(registerStep1Schema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const email = watch("email");
  const password = watch("password");
  const passwordStrength = getPasswordStrength(password);

  // Email availability check
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      if (email && email.includes("@")) {
        setCheckingEmail(true);
        try {
          const { available } = await availabilityCheck.email(email);
          if (!cancelled) {
            setEmailAvailable(available);

            if (!available) {
              setError("email", {
                type: "manual",
                message: "Email is already registered",
              });
            } else {
              if (errors.email?.type === "manual") {
                clearErrors("email");
              }
            }
          }
        } catch (error) {
          // Silent fail
        } finally {
          if (!cancelled) {
            setCheckingEmail(false);
          }
        }
      } else {
        setEmailAvailable(null);
        if (errors.email?.type === "manual") {
          clearErrors("email");
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      cancelled = true;
    };
  }, [email]);

  const canSubmit = isValid && !checkingEmail && emailAvailable !== false;

  const onSubmit = (data: RegisterStep1FormData) => {
    if (emailAvailable === false) {
      haptics.error();
      return;
    }

    haptics.success();
    router.push({
      pathname: "/(auth)/register/step-2-profile",
      params: {
        email: data.email,
        password: data.password,
      },
    });
  };

  return (
    <AuthLayout>
      <ProgressIndicator
        currentStep={1}
        totalSteps={3}
        labels={["Account", "Profile", "Verify"]}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Let's get started with your email and password
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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              rightIcon={
                checkingEmail ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.text.secondary}
                  />
                ) : emailAvailable === true && email.includes("@") ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                ) : emailAvailable === false ? (
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                ) : null
              }
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <FormInput
                ref={passwordRef}
                label="Password"
                placeholder="Create a strong password"
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
              label="Confirm Password"
              placeholder="Re-enter your password"
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
            !canSubmit && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
            Continue
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={colors.text.inverse}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>
          Already have an account?{" "}
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity onPress={() => haptics.selection()}>
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
